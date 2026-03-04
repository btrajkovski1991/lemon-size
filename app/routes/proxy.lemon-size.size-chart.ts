import { json } from "@remix-run/node";
import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";

async function resolveChart(args: {
  shopId: string;
  productId?: string;
  productHandle?: string;
  collectionHandle?: string;
}) {
  const { shopId, productId, productHandle, collectionHandle } = args;

  // A) productId rule (highest specificity)
  if (productId) {
    const assignment = await prisma.sizeChartAssignment.findFirst({
      where: { shopId, enabled: true, productId },
      include: {
        chart: { include: { rows: { orderBy: { sortOrder: "asc" } } } },
      },
      orderBy: { priority: "asc" },
    });
    if (assignment?.chart) return assignment.chart;
  }

  // B) productHandle rule
  if (productHandle) {
    const assignment = await prisma.sizeChartAssignment.findFirst({
      where: { shopId, enabled: true, productHandle },
      include: {
        chart: { include: { rows: { orderBy: { sortOrder: "asc" } } } },
      },
      orderBy: { priority: "asc" },
    });
    if (assignment?.chart) return assignment.chart;
  }

  // C) collectionHandle rule
  if (collectionHandle) {
    const assignment = await prisma.sizeChartAssignment.findFirst({
      where: { shopId, enabled: true, collectionHandle },
      include: {
        chart: { include: { rows: { orderBy: { sortOrder: "asc" } } } },
      },
      orderBy: { priority: "asc" },
    });
    if (assignment?.chart) return assignment.chart;
  }

  // D) default fallback
  return prisma.sizeChart.findFirst({
    where: { shopId, isDefault: true },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);

    // 1) Verify proxy signature
    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!secret) {
      return json({ ok: false, error: "Missing SHOPIFY_API_SECRET" }, { status: 500 });
    }

    const verification = verifyShopifyAppProxy(url, secret);
    if (!verification.ok) {
      return json(
        { ok: false, error: "Unauthorized", reason: verification.reason },
        { status: 401 }
      );
    }

    // 2) Identify shop
    const shop = url.searchParams.get("shop");
    if (!shop) return json({ ok: false, error: "Missing shop" }, { status: 400 });

    // 3) Read params
    const mode = url.searchParams.get("mode") || undefined;
    const productId = url.searchParams.get("product_id") || undefined;
    const productHandle = url.searchParams.get("product_handle") || undefined;
    const collectionHandle = url.searchParams.get("collection_handle") || undefined;

    // 4) Ensure DB shop row exists
    const dbShop = await prisma.shop.upsert({
      where: { shop },
      update: {},
      create: { shop },
    });

    // 5) Resolve chart
    const chart = await resolveChart({
      shopId: dbShop.id,
      productId,
      productHandle,
      collectionHandle,
    });

    // 6) exists mode (show button only if matched)
    if (mode === "exists") {
      if (!chart) return new Response(null, { status: 404 });
      return new Response(null, { status: 204 });
    }

    // 7) If no chart configured
    if (!chart) {
      return json(
        { ok: true, chart: null, message: "No size chart configured" },
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
      );
    }

    // 8) Return JSON in the exact shape lemon-size.js expects
    const columns = Array.isArray(chart.columns) ? (chart.columns as string[]) : [];

    return json(
      {
        ok: true,
        chart: {
          id: chart.id,
          title: chart.title,
          unit: chart.unit,
          columns,
          rows: chart.rows.map((r: any) => ({
            label: r.label,
            values: r.values,
          })),
        },
      },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
    );
  } catch (err) {
    console.error("[proxy size-chart] crash:", err);
    return new Response("Internal error", { status: 500 });
  }
}