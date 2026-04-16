import prisma from "../db.server";

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

export type AssignmentLite = {
  scope: "PRODUCT" | "COLLECTION" | "TYPE" | "VENDOR" | "TAG" | "ALL" | string;
  scopeValue: string | null;
  chartId: string;
  priority: number;
};

export type KeywordRuleLite = {
  keyword: string;
  field: string;
  chartId: string;
  priority: number;
};

export type RulesIndex = {
  assignments: AssignmentLite[];
  byProduct: Map<string, string>;
  byCollection: Map<string, string>;
  byType: Map<string, string>;
  byVendor: Map<string, string>;
  byTag: Map<string, string>;
  keywordRules: KeywordRuleLite[];
  keywordRulesEnabled: boolean;
  defaultChartId: string | null;
};

export type ChartResolution = {
  chartId: string | null;
  reason: string | null;
};

export type MatchCandidate = {
  kind: "assignment" | "keyword" | "default";
  chartId: string;
  reason: string;
  winner: boolean;
  priority: number | null;
  scope?: string;
  scopeValue?: string | null;
  keyword?: string;
  field?: string;
  lostReason?: string;
};

export type MatchExplanation = {
  resolution: ChartResolution;
  candidates: MatchCandidate[];
};

export async function buildRulesIndex(shopId: string): Promise<RulesIndex> {
  const [assignments, keywordRules, def, shop] = await Promise.all([
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
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { keywordRulesEnabled: true },
    }),
  ]);

  const byProduct = new Map<string, string>();
  const byCollection = new Map<string, string>();
  const byType = new Map<string, string>();
  const byVendor = new Map<string, string>();
  const byTag = new Map<string, string>();

  for (const assignment of assignments) {
    const scope = String(assignment.scope || "").toUpperCase();
    const value = normalize(assignment.scopeValue);

    if (scope !== "ALL" && !value) continue;

    if (scope === "PRODUCT") {
      if (!byProduct.has(value)) byProduct.set(value, assignment.chartId);
      continue;
    }

    const key = value.toLowerCase();
    if (scope === "COLLECTION") {
      if (!byCollection.has(key)) byCollection.set(key, assignment.chartId);
      continue;
    }
    if (scope === "TYPE") {
      if (!byType.has(key)) byType.set(key, assignment.chartId);
      continue;
    }
    if (scope === "VENDOR") {
      if (!byVendor.has(key)) byVendor.set(key, assignment.chartId);
      continue;
    }
    if (scope === "TAG") {
      if (!byTag.has(key)) byTag.set(key, assignment.chartId);
    }
  }

  return {
    assignments,
    byProduct,
    byCollection,
    byType,
    byVendor,
    byTag,
    keywordRules: shop?.keywordRulesEnabled === false ? [] : keywordRules,
    keywordRulesEnabled: shop?.keywordRulesEnabled !== false,
    defaultChartId: def?.id ?? null,
  };
}

function assignmentReason(scope: string, scopeValue: string | null, displayValue?: string) {
  if (scope === "PRODUCT") return "Matched by direct product assignment.";
  if (scope === "COLLECTION") return `Matched by collection: ${displayValue || scopeValue || ""}.`;
  if (scope === "TYPE") return `Matched by product type: ${displayValue || scopeValue || ""}.`;
  if (scope === "VENDOR") return `Matched by vendor: ${displayValue || scopeValue || ""}.`;
  if (scope === "TAG") return `Matched by tag: ${displayValue || scopeValue || ""}.`;
  return `Matched by ${scope.toLowerCase()}: ${displayValue || scopeValue || ""}.`;
}

export function keywordRuleMatches(args: {
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

export function resolveChartIdFromIndex(args: {
  idx: RulesIndex;
  productId?: string;
  collectionHandles?: string[];
  productType?: string;
  productVendor?: string;
  productTags?: string[];
  productTitle?: string;
  productHandle?: string;
  includeDefault?: boolean;
}): ChartResolution {
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
      .map((handle) => handle.trim())
      .filter((handle) => handle && handle.toLowerCase() !== "all"),
  );
  const typeNorm = normalizeLower(productType);
  const vendorNorm = normalizeLower(productVendor);
  const tagsNorm = unique(productTags.map(normalizeTag).filter(Boolean));

  if (productGid) {
    const hit = idx.byProduct.get(productGid);
    if (hit) {
      return {
        chartId: hit,
        reason: "Matched by direct product assignment.",
      };
    }
  }

  for (const handle of collections) {
    const hit = idx.byCollection.get(handle.toLowerCase());
    if (hit) {
      return {
        chartId: hit,
        reason: `Matched by collection: ${handle}.`,
      };
    }
  }

  if (typeNorm) {
    const hit = idx.byType.get(typeNorm);
    if (hit) {
      return {
        chartId: hit,
        reason: `Matched by product type: ${productType}.`,
      };
    }
  }

  if (vendorNorm) {
    const hit = idx.byVendor.get(vendorNorm);
    if (hit) {
      return {
        chartId: hit,
        reason: `Matched by vendor: ${productVendor}.`,
      };
    }
  }

  for (const tag of tagsNorm) {
    const hit = idx.byTag.get(tag);
    if (hit) {
      return {
        chartId: hit,
        reason: `Matched by tag: ${tag}.`,
      };
    }
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
      return {
        chartId: rule.chartId,
        reason: `Matched by keyword rule: ${rule.keyword}.`,
      };
    }
  }

  if (!includeDefault) {
    return { chartId: null, reason: null };
  }

  return {
    chartId: idx.defaultChartId,
    reason: idx.defaultChartId ? "Using the default size chart." : null,
  };
}

export function explainChartResolution(args: {
  idx: RulesIndex;
  productId?: string;
  collectionHandles?: string[];
  productType?: string;
  productVendor?: string;
  productTags?: string[];
  productTitle?: string;
  productHandle?: string;
  includeDefault?: boolean;
}): MatchExplanation {
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
  const collectionSet = new Set(
    unique(collectionHandles.map((handle) => handle.trim()).filter(Boolean)).map((handle) =>
      handle.toLowerCase(),
    ),
  );
  const typeNorm = normalizeLower(productType);
  const vendorNorm = normalizeLower(productVendor);
  const tagSet = new Set(unique(productTags.map(normalizeTag).filter(Boolean)));

  const candidates: MatchCandidate[] = [];

  for (const assignment of idx.assignments) {
    const scope = String(assignment.scope || "").toUpperCase();
    const rawValue = normalize(assignment.scopeValue);

    if (scope === "PRODUCT" && productGid && rawValue === productGid) {
      candidates.push({
        kind: "assignment",
        chartId: assignment.chartId,
        reason: assignmentReason(scope, rawValue),
        winner: false,
        priority: assignment.priority,
        scope,
        scopeValue: rawValue,
      });
      continue;
    }

    if (scope === "COLLECTION" && rawValue && collectionSet.has(rawValue.toLowerCase())) {
      candidates.push({
        kind: "assignment",
        chartId: assignment.chartId,
        reason: assignmentReason(scope, rawValue, rawValue),
        winner: false,
        priority: assignment.priority,
        scope,
        scopeValue: rawValue,
      });
      continue;
    }

    if (scope === "TYPE" && rawValue && typeNorm === rawValue.toLowerCase()) {
      candidates.push({
        kind: "assignment",
        chartId: assignment.chartId,
        reason: assignmentReason(scope, rawValue, productType || rawValue),
        winner: false,
        priority: assignment.priority,
        scope,
        scopeValue: rawValue,
      });
      continue;
    }

    if (scope === "VENDOR" && rawValue && vendorNorm === rawValue.toLowerCase()) {
      candidates.push({
        kind: "assignment",
        chartId: assignment.chartId,
        reason: assignmentReason(scope, rawValue, productVendor || rawValue),
        winner: false,
        priority: assignment.priority,
        scope,
        scopeValue: rawValue,
      });
      continue;
    }

    if (scope === "TAG" && rawValue && tagSet.has(rawValue.toLowerCase())) {
      candidates.push({
        kind: "assignment",
        chartId: assignment.chartId,
        reason: assignmentReason(scope, rawValue, rawValue),
        winner: false,
        priority: assignment.priority,
        scope,
        scopeValue: rawValue,
      });
    }
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
      candidates.push({
        kind: "keyword",
        chartId: rule.chartId,
        reason: `Matched by keyword rule: ${rule.keyword}.`,
        winner: false,
        priority: rule.priority,
        keyword: rule.keyword,
        field: rule.field,
      });
    }
  }

  if (includeDefault && idx.defaultChartId) {
    candidates.push({
      kind: "default",
      chartId: idx.defaultChartId,
      reason: "Using the default size chart.",
      winner: false,
      priority: null,
    });
  }

  const winner = candidates[0] ?? null;
  const winnerReason = winner?.reason ?? null;
  const winnerChartId = winner?.chartId ?? null;

  const explainedCandidates = candidates.map((candidate, index) => ({
    ...candidate,
    winner: index === 0,
    lostReason:
      index === 0
        ? undefined
        : winner
          ? `${winner.reason} This rule matched too, but it is checked later.`
          : undefined,
  }));

  return {
    resolution: {
      chartId: winnerChartId,
      reason: winnerReason,
    },
    candidates: explainedCandidates,
  };
}
