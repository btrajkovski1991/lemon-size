import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";
import { json } from "../untils/http";

function parseCsv(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalize(value?: string | null) {
  return String(value || "").trim();
}

function normalizeLower(value?: string | null) {
  return normalize(value).toLowerCase();
}

function normalizeTag(value?: string | null) {
  return normalize(value).toLowerCase();
}

function unique(arr: string[]) {
  return Array.from(new Set(arr));
}

function nowMs() {
  return Date.now();
}

function heightBucket(height?: number | null) {
  if (!Number.isFinite(height as number)) return null;
  const start = Math.floor((height as number) / 5) * 5;
  return `${start}-${start + 4}`;
}

function weightBucket(weight?: number | null) {
  if (!Number.isFinite(weight as number)) return null;
  const start = Math.floor((weight as number) / 5) * 5;
  return `${start}-${start + 4}`;
}

function confidenceLabel(sampleSize: number, winRate: number) {
  if (sampleSize >= 20 && winRate >= 0.85) return "High";
  if (sampleSize >= 8 && winRate >= 0.7) return "Medium";
  return "Low";
}

type AssignmentLite = {
  scope: "PRODUCT" | "COLLECTION" | "TYPE" | "VENDOR" | "TAG" | "ALL" | string;
  scopeValue: string | null;
  chartId: string;
  priority: number;
};

type KeywordRuleLite = {
  keyword: string;
  field: string;
  chartId: string;
  priority: number;
};

type RulesIndex = {
  byProduct: Map<string, string>;
  byCollection: Map<string, string>;
  byType: Map<string, string>;
  byVendor: Map<string, string>;
  byTag: Map<string, string>;
  keywordRules: KeywordRuleLite[];
  defaultChartId: string | null;
};

type ChartWithRows = {
  id: string;
  title: string;
  unit: string;
  columns: any;
  guideTitle: string | null;
  guideText: string | null;
  guideImage: string | null;
  tips: string | null;
  disclaimer: string | null;
  rows: Array<{ label: string; values: any; sortOrder: number }>;
};

const RULES_TTL_MS = 60_000;
const rulesCache = new Map<string, { exp: number; value: RulesIndex }>();
const rulesInflight = new Map<string, Promise<RulesIndex>>();

const CHART_TTL_MS = 60_000;
const chartCache = new Map<string, { exp: number; value: ChartWithRows | null }>();
const chartInflight = new Map<string, Promise<ChartWithRows | null>>();

async function buildRulesIndex(shopId: string): Promise<RulesIndex> {
  const [assignments, keywordRules, def] = await Promise.all([
    prisma.sizeChartAssignment.findMany({
      where: { shopId, enabled: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { scope: true, scopeValue: true, chartId: true, priority: true },
    }) as Promise<AssignmentLite[]>,
    prisma.sizeKeywordRule.findMany({
      where: { shopId, enabled: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { keyword: true, field: true, chartId: true, priority: true },
    }) as Promise<KeywordRuleLite[]>,
    prisma.sizeChart.findFirst({
      where: { shopId, isDefault: true },
      select: { id: true },
    }),
  ]);

  const byProduct = new Map<string, string>();
  const byCollection = new Map<string, string>();
  const byType = new Map<string, string>();
  const byVendor = new Map<string, string>();
  const byTag = new Map<string, string>();

  for (const a of assignments) {
    const scope = String(a.scope || "").toUpperCase();
    const v = normalize(a.scopeValue);

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
    keywordRules,
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

function keywordRuleMatches(args: {
  keyword: string;
  field: string;
  productTitle?: string;
  productHandle?: string;
  productType?: string;
  productVendor?: string;
  productTags?: string[];
}) {
  const keyword = normalizeLower(args.keyword);
  if (!keyword) return false;

  const inText = (value?: string | null) => normalizeLower(value).includes(keyword);

  const field = String(args.field || "ANY").toUpperCase();
  if (field === "TITLE") return inText(args.productTitle);
  if (field === "HANDLE") return inText(args.productHandle);
  if (field === "TYPE") return inText(args.productType);
  if (field === "VENDOR") return inText(args.productVendor);
  if (field === "TAG") {
    return (args.productTags || []).some((tag) => normalizeLower(tag).includes(keyword));
  }

  return (
    inText(args.productTitle) ||
    inText(args.productHandle) ||
    inText(args.productType) ||
    inText(args.productVendor) ||
    (args.productTags || []).some((tag) => normalizeLower(tag).includes(keyword))
  );
}

function resolveChartIdFromIndex(args: {
  idx: RulesIndex;
  productId?: string;
  collectionHandles?: string[];
  productType?: string;
  productVendor?: string;
  productTags?: string[];
  productTitle?: string;
  productHandle?: string;
  includeDefault?: boolean;
}): string | null {
  const {
    idx,
    productId,
    collectionHandles = [],
    productType = "",
    productVendor = "",
    productTags = [],
    productTitle = "",
    productHandle = "",
    includeDefault = true,
  } = args;

  const productGid = productId ? `gid://shopify/Product/${productId}` : "";
  const collections = unique(
    collectionHandles
      .map((h) => h.trim())
      .filter((h) => h && h.toLowerCase() !== "all"),
  );
  const typeNorm = normalizeLower(productType);
  const vendorNorm = normalizeLower(productVendor);
  const tagsNorm = unique(productTags.map(normalizeTag).filter(Boolean));

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

  for (const rule of idx.keywordRules) {
    if (
      keywordRuleMatches({
        keyword: rule.keyword,
        field: rule.field,
        productTitle,
        productHandle,
        productType,
        productVendor,
        productTags,
      })
    ) {
      return rule.chartId;
    }
  }

  if (!includeDefault) return null;
  return idx.defaultChartId;
}

async function getRecommendation(args: {
  shopId: string;
  chartId: string;
  productId?: string;
  productHandle?: string;
  heightCm?: number | null;
  weightKg?: number | null;
}) {
  const { shopId, chartId, productId, productHandle, heightCm, weightKg } = args;

  const hBucket = heightBucket(heightCm);
  const wBucket = weightBucket(weightKg);

  if (!hBucket && !wBucket) return null;

  const rows = await prisma.sizePurchaseSignal.findMany({
    where: {
      shopId,
      kept: true,
      returned: false,
      refunded: false,
      OR: [
        productId ? { productId } : undefined,
        productHandle ? { productHandle } : undefined,
        { chartId },
      ].filter(Boolean) as any,
    },
    select: {
      sizeLabel: true,
      heightCm: true,
      weightKg: true,
    },
    take: 500,
  });

  const filtered = rows.filter((row) => {
    const sameHeight = !hBucket || heightBucket(row.heightCm) === hBucket;
    const sameWeight = !wBucket || weightBucket(row.weightKg) === wBucket;
    return sameHeight && sameWeight;
  });

  if (!filtered.length) return null;

  const counts = new Map<string, number>();
  for (const row of filtered) {
    const key = String(row.sizeLabel || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;

  const [size, winCount] = ranked[0];
  const sampleSize = filtered.length;
  const keptRate = winCount / sampleSize;
  const confidence = confidenceLabel(sampleSize, keptRate);
  const percent = Math.round(keptRate * 100);

  return {
    size,
    confidence,
    keptRate,
    sampleSize,
    message: `${percent}% of customers with similar height and weight kept size ${size}`,
  };
}

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);

    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!secret) {
      return json({ ok: false, error: "Missing SHOPIFY_API_SECRET" }, { status: 500 });
    }

    const verification = verifyShopifyAppProxy(url, secret);
    if (!verification.ok) {
      return json(
        { ok: false, error: "Unauthorized", reason: verification.reason },
        { status: 401 },
      );
    }

    const shop = normalize(url.searchParams.get("shop"));
    if (!shop) {
      return json({ ok: false, error: "Missing shop" }, { status: 400 });
    }

    const mode = normalize(url.searchParams.get("mode")) || undefined;

    const productId = normalize(url.searchParams.get("product_id")) || undefined;
    const productHandle = normalize(url.searchParams.get("product_handle")) || undefined;
    const productTitle = normalize(url.searchParams.get("product_title")) || undefined;
    const productType = normalize(url.searchParams.get("product_type")) || "";
    const productVendor = normalize(url.searchParams.get("product_vendor")) || "";
    const productTags = parseCsv(url.searchParams.get("product_tags"));
    const collectionHandles = parseCsv(url.searchParams.get("collection_handles"));

    const heightCmRaw = Number(url.searchParams.get("height_cm") || "");
    const weightKgRaw = Number(url.searchParams.get("weight_kg") || "");
    const heightCm = Number.isFinite(heightCmRaw) ? heightCmRaw : null;
    const weightKg = Number.isFinite(weightKgRaw) ? weightKgRaw : null;

    const dbShop = await prisma.shop.upsert({
      where: { shop },
      update: {},
      create: { shop },
    });

    const idx = await getRulesIndexCached(dbShop.id);

    const chartId = resolveChartIdFromIndex({
      idx,
      productId,
      productHandle,
      productTitle,
      collectionHandles,
      productType,
      productVendor,
      productTags,
      includeDefault: mode !== "exists",
    });

    if (mode === "exists") {
      if (!chartId) return new Response(null, { status: 404 });
      return new Response(null, { status: 204 });
    }

    if (!chartId) {
      return json(
        { ok: true, chart: null, recommendation: null, message: "No size chart configured" },
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
      );
    }

    const chart = await getChartCached(chartId);
    if (!chart) {
      return json(
        { ok: true, chart: null, recommendation: null, message: "Size chart not found" },
        { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } },
      );
    }

    const recommendation = await getRecommendation({
      shopId: dbShop.id,
      chartId,
      productId,
      productHandle,
      heightCm,
      weightKg,
    });

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
          guideTitle: chart.guideTitle,
          guideText: chart.guideText,
          guideImage: chart.guideImage,
          tips: chart.tips,
          disclaimer: chart.disclaimer,
        },
        recommendation,
      },
      {
        headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
      },
    );
  } catch (error) {
    console.error("[proxy.lemon-size.size-chart] error", error);
    return json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}