import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";
import { json } from "../untils/http";

/* ------------------------------
CACHE
------------------------------ */

const RULE_CACHE = new Map<
  string,
  {
    expires: number;
    byProduct: Map<string, any>;
    byProductHandle: Map<string, any>;
    byCollection: Map<string, any>;
    defaultChart: any | null;
  }
>();

const CACHE_TTL = 60_000; // 1 minute

/* ------------------------------
UTILS
------------------------------ */

function parseCsv(v?: string | null) {
  if (!v) return [];
  return v
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .filter((x) => x !== "all");
}

function normalize(v?: string | null) {
  if (!v) return null;
  return v.trim().toLowerCase();
}

/* ------------------------------
LOAD RULES INTO CACHE
------------------------------ */

async function loadRules(shopId: string) {
  const now = Date.now();
  const cached = RULE_CACHE.get(shopId);

  if (cached && cached.expires > now) {
    return cached;
  }

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

  const byProduct = new Map<string, any>();
  const byProductHandle = new Map<string, any>();
  const byCollection = new Map<string, any>();

  for (const a of assignments) {
    if (!a.chart) continue;

    const scope = (a.scope || "").toUpperCase();
    const value = normalize(a.scopeValue);

    if (!value) continue;

    if (scope === "PRODUCT" && !byProduct.has(value)) {
      byProduct.set(value, a.chart);
    }

    if (scope === "PRODUCT_HANDLE" && !byProductHandle.has(value)) {
      byProductHandle.set(value, a.chart);
    }

    if (scope === "COLLECTION" && !byCollection.has(value)) {
      byCollection.set(value, a.chart);
    }
  }

  const defaultChart = await prisma.sizeChart.findFirst({
    where: { shopId, isDefault: true },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });

  const cacheEntry = {
    expires: now + CACHE_TTL,
    byProduct,
    byProductHandle,
    byCollection,
    defaultChart,
  };

  RULE_CACHE.set(shopId, cacheEntry);

  return cacheEntry;
}

/* ------------------------------
RESOLVE CHART
------------------------------ */

async function resolveChart({
  shopId,
  productId,
  productHandle,
  collectionHandles,
  includeDefault = true,
}: {
  shopId: string;
  productId?: string;
  productHandle?: string;
  collectionHandles: string[];
  includeDefault?: boolean;
}) {
  const cache = await loadRules(shopId);

  const productGid = productId
    ? `gid://shopify/Product/${productId}`.toLowerCase()
    : null;

  const handle = normalize(productHandle);

  if (productGid && cache.byProduct.has(productGid)) {
    return cache.byProduct.get(productGid);
  }

  if (handle && cache.byProductHandle.has(handle)) {
    return cache.byProductHandle.get(handle);
  }

  for (const c of collectionHandles) {
    const chart = cache.byCollection.get(c);
    if (chart) return chart;
  }

  if (includeDefault) {
    return cache.defaultChart;
  }

  return null;
}

/* ------------------------------
LOADER
------------------------------ */

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

    const chart = await resolveChart({
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
      return json({ ok: true, chart: null });
    }

    const columns = Array.isArray(chart.columns) ? chart.columns : [];

    return json({
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
    });
  } catch (err) {
    console.error("[proxy size-chart] crash:", err);
    return new Response("Internal error", { status: 500 });
  }
}