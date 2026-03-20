import prisma from "../db.server";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";
import { json } from "../untils/http";
import { buildRulesIndex, resolveChartIdFromIndex, type RulesIndex } from "../utils/size-chart-matching.server";
import { getCachedChart, getCachedRulesIndex } from "../utils/size-chart-cache.server";

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

function normalizeSizeValue(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\.0$/, "");
}

function splitRangeParts(value?: string | null) {
  const raw = normalizeSizeValue(value);
  if (!raw) return [];

  return raw
    .split(/[-/]|TO/gi)
    .map((part) => normalizeSizeValue(part))
    .filter(Boolean);
}

function isSizeLikeColumn(columnName?: string | null) {
  const raw = normalizeSizeValue(columnName);
  if (!raw) return false;

  return [
    "SIZE",
    "RING SIZE",
    "FINGER SIZE",
    "SHOE SIZE",
    "BAND",
    "WIDTH",
    "LENGTH",
    "NECKLACE LENGTH",
    "BRACELET LENGTH",
    "CHAIN LENGTH",
    "CIRCUMFERENCE",
    "DIAMETER",
    "WRIST",
  ].some((token) => raw.includes(token));
}

function rowMatchesAvailableSizes(
  row: { label?: string | null; values?: Record<string, any> | null },
  columns: string[],
  availableSet: Set<string>
) {
  const primaryCandidates = new Set<string>();
  const fallbackCandidates = new Set<string>();

  const addCandidate = (target: Set<string>, value: any) => {
    const normalized = normalizeSizeValue(value);
    if (normalized) target.add(normalized);

    for (const part of splitRangeParts(value)) {
      target.add(part);
    }
  };

  const values = row.values && typeof row.values === "object" ? row.values : {};
  const prioritizedColumns = columns.filter((column) => isSizeLikeColumn(column));

  for (const column of prioritizedColumns) {
    addCandidate(primaryCandidates, values[column]);
  }

  addCandidate(primaryCandidates, row.label);

  for (const value of Object.values(values)) {
    addCandidate(fallbackCandidates, value);
  }

  for (const candidate of primaryCandidates) {
    if (availableSet.has(candidate)) return true;
  }

  if (primaryCandidates.size > 0) return false;

  for (const candidate of fallbackCandidates) {
    if (availableSet.has(candidate)) return true;
  }

  return false;
}

function unique(arr: string[]) {
  return Array.from(new Set(arr));
}

type ChartWithRows = {
  id: string;
  shopId: string;
  title: string;
  unit: string;
  columns: any;
  guideTitle: string | null;
  guideText: string | null;
  guideImage: string | null;
  showGuideImage: boolean | null;
  tips: string | null;
  disclaimer: string | null;
  rows: Array<{ label: string; values: any; sortOrder: number }>;
};

async function fetchChartWithRows(chartId: string): Promise<ChartWithRows | null> {
  const chart = await prisma.sizeChart.findFirst({
    where: { id: chartId },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });

  return (chart as any) ?? null;
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
    const availableSizes = parseCsv(url.searchParams.get("available_sizes"))
      .map((v) => normalizeSizeValue(v))
      .filter(Boolean);

    const dbShop = await prisma.shop.findUnique({
      where: { shop },
      select: { id: true },
    });
    if (!dbShop) {
      return json(
        { ok: true, chart: null, message: "Shop not configured" },
        { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } },
      );
    }

    const idx = await getCachedRulesIndex<RulesIndex>(dbShop.id, () => buildRulesIndex(dbShop.id));

    const resolution = resolveChartIdFromIndex({
      idx,
      productId,
      productHandle,
      productTitle,
      collectionHandles,
      productType,
      productVendor,
      productTags,
      includeDefault: true,
    });
    const chartId = resolution.chartId;

    if (mode === "exists") {
      if (!chartId) return new Response(null, { status: 404 });
      return new Response(null, { status: 204 });
    }

    if (!chartId) {
      return json(
        { ok: true, chart: null, message: "No size chart configured" },
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
      );
    }

    const chart = await getCachedChart(chartId, () => fetchChartWithRows(chartId));
    if (!chart) {
      return json(
        { ok: true, chart: null, message: "Size chart not found" },
        { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } },
      );
    }

    const columns = Array.isArray(chart.columns) ? (chart.columns as string[]) : [];

    let filteredRows = chart.rows.map((r: any) => ({
      label: r.label,
      values: r.values,
    }));

    if (availableSizes.length > 0) {
      const availableSet = new Set(availableSizes);

      const matchedRows = filteredRows.filter((row) =>
        rowMatchesAvailableSizes(row, columns, availableSet)
      );

      if (matchedRows.length > 0) {
        filteredRows = matchedRows;
      }
    }

    return json(
      {
        ok: true,
        chart: {
          id: chart.id,
          title: chart.title,
          unit: chart.unit,
          columns,
          rows: filteredRows,
          guideTitle: chart.guideTitle,
          guideText: chart.guideText,
          guideImage: chart.guideImage,
          showGuideImage: chart.showGuideImage,
          tips: chart.tips,
          disclaimer: chart.disclaimer,
          matchReason: resolution.reason,
        },
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
