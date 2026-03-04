import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";
import { json } from "../untils/http";

/** ---------------------------
 *  Helpers
 * --------------------------*/

function parseCsv(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalize(value?: string | null) {
  const v = (value ?? "").trim();
  return v.length ? v : "";
}

function normalizeLower(value?: string | null) {
  return normalize(value).toLowerCase();
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function unique(arr: string[]) {
  return Array.from(new Set(arr));
}

function nowMs() {
  return Date.now();
}

/** ---------------------------
 *  Types
 * --------------------------*/

type AssignmentLite = {
  scope: "PRODUCT" | "COLLECTION" | "TYPE" | "VENDOR" | "TAG" | "ALL" | string;
  scopeValue: string | null;
  chartId: string;
  priority: number;
};

type RulesIndex = {
  // each key maps to chartId (first hit wins due to priority sort)
  byProduct: Map<string, string>;     // gid
  byCollection: Map<string, string>;  // handle lower
  byType: Map<string, string>;        // lower
  byVendor: Map<string, string>;      // lower
  byTag: Map<string, string>;         // lower
  defaultChartId: string | null;      // optional default
};

type ChartWithRows = {
  id: string;
  title: string;
  unit: string;
  columns: any;
  rows: Array<{ label: string; values: any; sortOrder: number }>;
};

/** ---------------------------
 *  Caches (warm-lambda friendly)
 * --------------------------*/

// Rules cache per shop
const RULES_TTL_MS = 60_000; // 60s; safe. You can bump to 5 min if you want.
const rulesCache = new Map<string, { exp: number; value: RulesIndex }>();

// Chart cache per chartId
const CHART_TTL_MS = 60_000; // 60s
const chartCache = new Map<string, { exp: number; value: ChartWithRows | null }>();

// Prevent stampede: in-flight promises
const rulesInflight = new Map<string, Promise<RulesIndex>>();
const chartInflight = new Map<string, Promise<ChartWithRows | null>>();

/** ---------------------------
 *  DB fetchers
 * --------------------------*/

async function buildRulesIndex(shopId: string): Promise<RulesIndex> {
  // Only fetch what we need (NO chart include)
  const assignments: AssignmentLite[] = await prisma.sizeChartAssignment.findMany({
    where: { shopId, enabled: true },
    orderBy: { priority: "asc" }, // lower wins
    select: { scope: true, scopeValue: true, chartId: true, priority: true },
  });

  // Default chart id (optional)
  const def = await prisma.sizeChart.findFirst({
    where: { shopId, isDefault: true },
    select: { id: true },
  });

  const byProduct = new Map<string, string>();
  const byCollection = new Map<string, string>();
  const byType = new Map<string, string>();
  const byVendor = new Map<string, string>();
  const byTag = new Map<string, string>();

  for (const a of assignments) {
    const scope = String(a.scope || "").toUpperCase();
    const v = (a.scopeValue || "").trim();

    // For ALL we don't store a map key; default handles fallback.
    if (scope !== "ALL" && !v) continue;

    if (scope === "PRODUCT") {
      if (!byProduct.has(v)) byProduct.set(v, a.chartId);
      continue;
    }

    if (scope === "COLLECTION") {
      const key = v.toLowerCase();
      if (!byCollection.has(key)) byCollection.set(key, a.chartId);
      continue;
    }

    if (scope === "TYPE") {
      const key = v.toLowerCase();
      if (!byType.has(key)) byType.set(key, a.chartId);
      continue;
    }

    if (scope === "VENDOR") {
      const key = v.toLowerCase();
      if (!byVendor.has(key)) byVendor.set(key, a.chartId);
      continue;
    }

    if (scope === "TAG") {
      const key = v.toLowerCase();
      if (!byTag.has(key)) byTag.set(key, a.chartId);
      continue;
    }
  }

  return {
    byProduct,
    byCollection,
    byType,
    byVendor,
    byTag,
    defaultChartId: def?.id ?? null,
  };
}

async function getRulesIndexCached(shopId: string): Promise<RulesIndex> {
  const cached = rulesCache.get(shopId);
  if (cached && cached.exp > nowMs()) return cached.value;

  const inflight = rulesInflight.get(shopId);
  if (inflight) return inflight;

  const p = (async () => {
    try {
      const idx = await buildRulesIndex(shopId);
      rulesCache.set(shopId, { exp: nowMs() + RULES_TTL_MS, value: idx });
      return idx;
    } finally {
      rulesInflight.delete(shopId);
    }
  })();

  rulesInflight.set(shopId, p);
  return p;
}

async function fetchChartWithRows(chartId: string): Promise<ChartWithRows | null> {
  const chart = await prisma.sizeChart.findFirst({
    where: { id: chartId },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });

  return (chart as any) ?? null;
}

async function getChartCached(chartId: string): Promise<ChartWithRows | null> {
  const cached = chartCache.get(chartId);
  if (cached && cached.exp > nowMs()) return cached.value;

  const inflight = chartInflight.get(chartId);
  if (inflight) return inflight;

  const p = (async () => {
    try {
      const chart = await fetchChartWithRows(chartId);
      chartCache.set(chartId, { exp: nowMs() + CHART_TTL_MS, value: chart });
      return chart;
    } finally {
      chartInflight.delete(chartId);
    }
  })();

  chartInflight.set(chartId, p);
  return p;
}

/** ---------------------------
 *  Resolver
 * --------------------------*/

function resolveChartIdFromIndex(args: {
  idx: RulesIndex;
  productId?: string; // numeric
  collectionHandles?: string[];
  productType?: string;
  productVendor?: string;
  productTags?: string[];
  includeDefault?: boolean;
}): string | null {
  const {
    idx,
    productId,
    collectionHandles = [],
    productType = "",
    productVendor = "",
    productTags = [],
    includeDefault = true,
  } = args;

  const productGid = productId ? `gid://shopify/Product/${productId}` : "";

  // ignore Shopify "all" collection
  const collections = unique(
    collectionHandles.map((h) => h.trim()).filter((h) => h && h.toLowerCase() !== "all"),
  );

  const typeNorm = normalizeLower(productType);
  const vendorNorm = normalizeLower(productVendor);
  const tagsNorm = unique(productTags.map(normalizeTag).filter(Boolean));

  // Precedence: PRODUCT → COLLECTION → TYPE → VENDOR → TAG
  if (productGid) {
    const hit = idx.byProduct.get(productGid);
    if (hit) return hit;
  }

  for (const h of collections) {
    const hit = idx.byCollection.get(h.toLowerCase());
    if (hit) return hit;
  }

  if (typeNorm) {
    const hit = idx.byType.get(typeNorm);
    if (hit) return hit;
  }

  if (vendorNorm) {
    const hit = idx.byVendor.get(vendorNorm);
    if (hit) return hit;
  }

  for (const t of tagsNorm) {
    const hit = idx.byTag.get(t);
    if (hit) return hit;
  }

  if (!includeDefault) return null;
  return idx.defaultChartId;
}

/** ---------------------------
 *  Loader
 * --------------------------*/

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);

    // Verify proxy signature
    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!secret) {
      return json({ ok: false, error: "Missing SHOPIFY_API_SECRET" }, { status: 500 });
    }

    const verification = verifyShopifyAppProxy(url, secret);
    if (!verification.ok) {
      return json({ ok: false, error: "Unauthorized", reason: verification.reason }, { status: 401 });
    }

    // Identify shop
    const shop = url.searchParams.get("shop");
    if (!shop) return json({ ok: false, error: "Missing shop" }, { status: 400 });

    // Params from theme/JS
    const mode = url.searchParams.get("mode") || undefined;

    const productId = normalize(url.searchParams.get("product_id")) || undefined;
    const collectionHandles = parseCsv(url.searchParams.get("collection_handles"));

    const productType = normalize(url.searchParams.get("product_type")) || "";
    const productVendor = normalize(url.searchParams.get("product_vendor")) || "";
    const productTags = parseCsv(url.searchParams.get("product_tags"));

    // Ensure DB shop row exists
    const dbShop = await prisma.shop.upsert({
      where: { shop },
      update: {},
      create: { shop },
    });

    // 1) Get cached rules index
    const idx = await getRulesIndexCached(dbShop.id);

    // 2) Resolve to chartId (no DB work here)
    const chartId = resolveChartIdFromIndex({
      idx,
      productId,
      collectionHandles,
      productType,
      productVendor,
      productTags,
      includeDefault: mode !== "exists", // ✅ no default for exists
    });

    // exists mode: show/hide button (NO chart query)
    if (mode === "exists") {
      if (!chartId) return new Response(null, { status: 404 });
      return new Response(null, { status: 204 });
    }

    // No chart at all
    if (!chartId) {
      return json(
        { ok: true, chart: null, message: "No size chart configured" },
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
      );
    }

    // 3) Fetch only the selected chart (+ cache)
    const chart = await getChartCached(chartId);

    if (!chart) {
      // chartId exists but chart deleted; treat as none
      return json(
        { ok: true, chart: null, message: "Size chart not found" },
        { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } },
      );
    }

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
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch (err) {
    console.error("[proxy size-chart] crash:", err);
    return new Response("Internal error", { status: 500 });
  }
}