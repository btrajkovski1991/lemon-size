import { data } from "react-router";
import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  // 1) Verify proxy signature
  const secret = process.env.SHOPIFY_API_SECRET || "";
  if (!secret) {
    return data({ ok: false, error: "Missing SHOPIFY_API_SECRET" }, { status: 500 });
  }

  const verification = verifyShopifyAppProxy(url, secret);
  if (!verification.ok) {
    return data(
      { ok: false, error: "Unauthorized", reason: verification.reason },
      { status: 401 }
    );
  }

  // 2) Identify shop
  const shop = url.searchParams.get("shop");
  if (!shop) return data({ ok: false, error: "Missing shop" }, { status: 400 });

  // 3) Read product hints (sent from theme)
  const productId = url.searchParams.get("product_id") || undefined;
  const productHandle = url.searchParams.get("product_handle") || undefined;

  // 4) Ensure DB shop row exists
  const dbShop = await prisma.shop.upsert({
    where: { shop },
    update: {},
    create: { shop },
  });

  let chart: any = null;

  // ✅ A) Match product-specific assignment (if you store productId on assignment)
  if (productId) {
    const assignment = await prisma.sizeChartAssignment.findFirst({
      where: { shopId: dbShop.id, enabled: true, productId },
      include: {
        chart: { include: { rows: { orderBy: { sortOrder: "asc" } } } },
      },
      // lower wins
      orderBy: { priority: "asc" },
    });
    chart = assignment?.chart ?? null;
  }

  // ✅ B) Optional: Match handle-specific assignment (ONLY if you have this field)
  if (!chart && productHandle) {
    const assignment = await prisma.sizeChartAssignment.findFirst({
      where: { shopId: dbShop.id, enabled: true, productHandle },
      include: {
        chart: { include: { rows: { orderBy: { sortOrder: "asc" } } } },
      },
      orderBy: { priority: "asc" },
    });
    chart = assignment?.chart ?? null;
  }

  // ✅ C) Default chart fallback
  if (!chart) {
    chart = await prisma.sizeChart.findFirst({
      where: { shopId: dbShop.id, isDefault: true },
      include: { rows: { orderBy: { sortOrder: "asc" } } },
    });
  }

  // 5) If no chart configured
  if (!chart) {
    return data(
      { ok: true, chart: null, message: "No size chart configured" },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
    );
  }

  // 6) Return JSON in the exact shape your lemon-size.js expects
  const columns = Array.isArray(chart.columns) ? (chart.columns as string[]) : [];

  return data(
    {
      ok: true,
      chart: {
        id: chart.id,
        title: chart.title,
        unit: chart.unit,
        columns,
        rows: chart.rows.map((r: any) => ({
          label: r.label,
          values: r.values, // must be an object: { [columnName]: value }
        })),
      },
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}