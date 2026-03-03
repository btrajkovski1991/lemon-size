import { data } from "react-router";
import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

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

  const shop = url.searchParams.get("shop");
  if (!shop) return data({ ok: false, error: "Missing shop" }, { status: 400 });

  const productId = url.searchParams.get("product_id") || undefined;
  const productHandle = url.searchParams.get("product_handle") || undefined;

  const dbShop = await prisma.shop.upsert({
    where: { shop },
    update: {},
    create: { shop },
  });

  let chart: any = null;

  // ✅ 1) Product-specific assignment
  if (productId) {
    const assignment = await prisma.sizeChartAssignment.findFirst({
      where: { shopId: dbShop.id, productId, enabled: true },
      include: { chart: { include: { rows: { orderBy: { sortOrder: "asc" } } } } },
      // ✅ lower wins → ASC
      orderBy: { priority: "asc" },
    });

    chart = assignment?.chart ?? null;
  }

  // (Optional) if you stored handle-based assignments
  if (!chart && productHandle) {
    const assignment = await prisma.sizeChartAssignment.findFirst({
      where: { shopId: dbShop.id, productHandle, enabled: true },
      include: { chart: { include: { rows: { orderBy: { sortOrder: "asc" } } } } },
      orderBy: { priority: "asc" },
    });

    chart = assignment?.chart ?? null;
  }

  // ✅ 2) Default chart fallback
  if (!chart) {
    chart = await prisma.sizeChart.findFirst({
      where: { shopId: dbShop.id, isDefault: true },
      include: { rows: { orderBy: { sortOrder: "asc" } } },
    });
  }

  if (!chart) {
    return data(
      { ok: true, chart: null, message: "No size chart configured" },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
    );
  }

  const columns = Array.isArray(chart.columns) ? (chart.columns as string[]) : [];

  return data(
    {
      ok: true,
      chart: {
        id: chart.id,
        title: chart.title,
        unit: chart.unit,
        columns,
        rows: chart.rows.map((r: any) => ({ label: r.label, values: r.values })),
      },
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}