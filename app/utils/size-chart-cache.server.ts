type CacheEntry<T> = {
  exp: number;
  value: T;
};

const RULES_TTL_MS = 60_000;
const CHART_TTL_MS = 60_000;

const rulesCache = new Map<string, CacheEntry<unknown>>();
const rulesInflight = new Map<string, Promise<unknown>>();

const chartCache = new Map<string, CacheEntry<unknown>>();
const chartInflight = new Map<string, Promise<unknown>>();
const shopCharts = new Map<string, Set<string>>();
const chartShop = new Map<string, string>();

function nowMs() {
  return Date.now();
}

export async function getCachedRulesIndex<T>(
  shopId: string,
  loader: () => Promise<T>,
  ttlMs = RULES_TTL_MS,
): Promise<T> {
  const cached = rulesCache.get(shopId);
  if (cached && cached.exp > nowMs()) return cached.value as T;

  const inflight = rulesInflight.get(shopId);
  if (inflight) return inflight as Promise<T>;

  const promise = (async () => {
    try {
      const value = await loader();
      rulesCache.set(shopId, { exp: nowMs() + ttlMs, value });
      return value;
    } finally {
      rulesInflight.delete(shopId);
    }
  })();

  rulesInflight.set(shopId, promise);
  return promise;
}

export async function getCachedChart<T extends { id: string; shopId?: string | null } | null>(
  chartId: string,
  loader: () => Promise<T>,
  ttlMs = CHART_TTL_MS,
): Promise<T> {
  const cached = chartCache.get(chartId);
  if (cached && cached.exp > nowMs()) return cached.value as T;

  const inflight = chartInflight.get(chartId);
  if (inflight) return inflight as Promise<T>;

  const promise = (async () => {
    try {
      const value = await loader();
      chartCache.set(chartId, { exp: nowMs() + ttlMs, value });

      if (value?.shopId) {
        chartShop.set(chartId, value.shopId);
        const ids = shopCharts.get(value.shopId) ?? new Set<string>();
        ids.add(chartId);
        shopCharts.set(value.shopId, ids);
      }

      return value;
    } finally {
      chartInflight.delete(chartId);
    }
  })();

  chartInflight.set(chartId, promise);
  return promise;
}

export function invalidateShopSizeChartCache(shopId: string) {
  rulesCache.delete(shopId);
  rulesInflight.delete(shopId);

  const chartIds = shopCharts.get(shopId);
  if (!chartIds) return;

  for (const chartId of chartIds) {
    chartCache.delete(chartId);
    chartInflight.delete(chartId);
    chartShop.delete(chartId);
  }

  shopCharts.delete(shopId);
}

export function invalidateChartCache(chartId: string) {
  chartCache.delete(chartId);
  chartInflight.delete(chartId);

  const shopId = chartShop.get(chartId);
  if (!shopId) return;

  chartShop.delete(chartId);
  const chartIds = shopCharts.get(shopId);
  if (!chartIds) return;
  chartIds.delete(chartId);
  if (chartIds.size === 0) {
    shopCharts.delete(shopId);
  }
}
