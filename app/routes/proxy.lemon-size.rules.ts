import { json } from "@react-router/node";
import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";

/**
 * App Proxy endpoint (Storefront -> Backend)
 *
 * Shopify will call your app at:
 *   /proxy/lemon-size?shop=...&signature=...&product_id=...
 *
 * And from the storefront you call:
 *   /apps/lemon-size?product_id=...
 * (Shopify injects shop + signature for you via App Proxy)
 */
export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);

    // 1) Verify signature
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
    if (!shop) {
      return data({ ok: false, error: "Missing shop" }, { status: 400 });
    }

    // 3) Inputs from storefront (Liquid passes product.id)
    const productId = url.searchParams.get("product_id") || undefined;

    // 4) Ensure Shop row exists
    const dbShop = await prisma.shop.upsert({
      where: { shop },
      update: {},
      create: { shop },
    });

    // 5) Resolve chart:
    //    a) product assignment
    //    b) default chart
    //    c) none
    let chart:
      | (Awaited<
          ReturnType<typeof prisma.sizeChart.findFirst>
        > & { rows: Array<{ label: string; values: unknown }> })
      | null = null;

    if (productId) {
      const assignment = await prisma.sizeChartAssignment.findFirst({
        where: { shopId: dbShop.id, productId },
        include: {
          chart: {
            include: {
              rows: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
        orderBy: { priority: "desc" },
      });

      chart = assignment?.chart ?? null;
    }

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

    // 6) Normalize columns from Json -> string[]
    const columns = Array.isArray(chart.columns) ? (chart.columns as string[]) : [];

    // 7) Respond
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
            values: r.values,
          })),
        },
      },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
    );
  } catch (err: any) {
    // Never leak stack traces to storefront
    return data(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}