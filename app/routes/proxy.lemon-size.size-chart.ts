import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";
import { json } from "../untils/http";

function parseCsv(value?: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .filter((v) => v !== "all");
}

function normalize(v?: string | null) {
  if (!v) return null;
  return v.trim().toLowerCase();
}

async function resolveChartFast({
  shopId,
  productId,
  productHandle,
  collectionHandles = [],
  includeDefault = true,
}: {
  shopId: string;
  productId?: string;
  productHandle?: string;
  collectionHandles?: string[];
  includeDefault?: boolean;
}) {
  const productGid = productId ? `gid://shopify/Product/${productId}` : null;
  const productHandleNorm = normalize(productHandle);

  // Fetch ALL rules once
  const assignments = await prisma.sizeChartAssignment.findMany({
    where: { shopId, enabled: true },
    orderBy: { priority: "asc" },
    include: {
      chart: {
        include: {
          rows: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!assignments.length) {
    if (!includeDefault) return null;

    return prisma.sizeChart.findFirst({
      where: { shopId, isDefault: true },
      include: { rows: { orderBy: { sortOrder: "asc" } } },
    });
  }

  for (const a of assignments) {
    const scope = (a.scope || "").toUpperCase();
    const value = normalize(a.scopeValue);

    if (!a.chart) continue;

    // PRODUCT
    if (scope === "PRODUCT" && productGid && value === normalize(productGid)) {
      return a.chart;
    }

    // PRODUCT HANDLE
    if (
      scope === "PRODUCT_HANDLE" &&
      productHandleNorm &&
      value === productHandleNorm
    ) {
      return a.chart;
    }

    // COLLECTION
    if (scope === "COLLECTION" && value) {
      for (const h of collectionHandles) {
        if (value === h) {
          return a.chart;
        }
      }
    }
  }

  if (!includeDefault) return null;

  return prisma.sizeChart.findFirst({
    where: { shopId, isDefault: true },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);

    const secret = process.env.SHOPIFY_API_SECRET || "";

    if (!secret) {
      return json(
        { ok: false, error: "Missing SHOPIFY_API_SECRET" },
        { status: 500 }
      );
    }

    const verification = verifyShopifyAppProxy(url, secret);

    if (!verification.ok) {
      return json(
        { ok: false, error: "Unauthorized", reason: verification.reason },
        { status: 401 }
      );
    }

    const shop = url.searchParams.get("shop");

    if (!shop) {
      return json({ ok: false, error: "Missing shop" }, { status: 400 });
    }

    const mode = url.searchParams.get("mode") || undefined;

    const productId = url.searchParams.get("product_id") || undefined;
    const productHandle = url.searchParams.get("product_handle") || undefined;

    const collectionHandles = parseCsv(
      url.searchParams.get("collection_handles")
    );

    const dbShop = await prisma.shop.upsert({
      where: { shop },
      update: {},
      create: { shop },
    });

    const chart = await resolveChartFast({
      shopId: dbShop.id,
      productId,
      productHandle,
      collectionHandles,
      includeDefault: mode !== "exists",
    });

    if (mode === "exists") {
      if (!chart) return new Response(null, { status: 404 });
      return new Response(null, { status: 204 });
    }

    if (!chart) {
      return json(
        { ok: true, chart: null },
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
      );
    }

    const columns = Array.isArray(chart.columns) ? chart.columns : [];

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
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      }
    );
  } catch (err) {
    console.error("[proxy size-chart] crash:", err);
    return new Response("Internal error", { status: 500 });
  }
}