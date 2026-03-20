export type Scope = "ALL" | "PRODUCT" | "COLLECTION" | "TYPE" | "VENDOR" | "TAG";

export type AssignmentChartPreviewRow = {
  label: string;
  sortOrder: number;
  values: Record<string, any>;
};

export type AssignmentChartLite = {
  id: string;
  title: string;
  isDefault: boolean;
  unit?: string | null;
  columns?: string[] | null;
  rows?: AssignmentChartPreviewRow[];
};

export type AssignmentRuleLite = {
  id: string;
  priority: number;
  scope: string;
  scopeValue: string | null;
  enabled: boolean;
  chart: { title: string };
};

export type ProductLite = {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type CollectionLite = {
  id: string;
  title: string;
  handle: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export function parseBulkTextValues(input: string): string[] {
  return String(input || "")
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function normalizeAssignmentColumns(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((value) => String(value ?? "").trim()).filter(Boolean);
}

export function normalizeAssignmentPreviewRows(input: unknown): AssignmentChartPreviewRow[] {
  if (!Array.isArray(input)) return [];

  return input.map((row: any, index) => ({
    label: String(row?.label ?? ""),
    sortOrder: Number(row?.sortOrder ?? index + 1),
    values:
      row?.values && typeof row.values === "object" && !Array.isArray(row.values)
        ? (row.values as Record<string, any>)
        : {},
  }));
}

export function normalizeAssignmentChartLite(chart: any): AssignmentChartLite {
  return {
    id: String(chart?.id ?? ""),
    title: String(chart?.title ?? ""),
    isDefault: Boolean(chart?.isDefault),
    unit: chart?.unit ? String(chart.unit) : null,
    columns: normalizeAssignmentColumns(chart?.columns),
    rows: normalizeAssignmentPreviewRows(chart?.rows),
  };
}

export function ruleLabel(scope: string, scopeValue: string | null) {
  if (scope === "ALL") return "All products";
  if (scope === "PRODUCT") return `Product: ${scopeValue || ""}`;
  if (scope === "COLLECTION") return `Collection: ${scopeValue || ""}`;
  if (scope === "TYPE") return `Type: ${scopeValue || ""}`;
  if (scope === "VENDOR") return `Vendor: ${scopeValue || ""}`;
  if (scope === "TAG") return `Tag: ${scopeValue || ""}`;
  return `${scope}${scopeValue ? `: ${scopeValue}` : ""}`;
}

export function extractShopifyResourceId(scopeValue: string | null) {
  const raw = String(scopeValue || "").trim();
  if (!raw) return "";
  if (raw.includes("/")) return raw.split("/").pop() || raw;
  return raw;
}

export function getRulePresentation(
  rule: AssignmentRuleLite,
  products: ProductLite[],
  collections: CollectionLite[],
) {
  const scope = String(rule.scope || "").toUpperCase();
  const scopeValueId = extractShopifyResourceId(rule.scopeValue);

  if (scope === "PRODUCT") {
    const product =
      products.find((item) => item.id === rule.scopeValue) ||
      products.find((item) => extractShopifyResourceId(item.id) === scopeValueId);
    return {
      title: product ? product.title : `Product #${scopeValueId}`,
      subtitle: product
        ? [product.vendor, product.handle ? `/${product.handle}` : null].filter(Boolean).join(" • ")
        : "Direct product assignment",
      imageUrl: product?.imageUrl || null,
      imageAlt: product?.title || "Product image",
      summary: `Priority ${rule.priority} • ${scope}`,
    };
  }

  if (scope === "COLLECTION") {
    const collection = collections.find((item) => item.handle === rule.scopeValue);
    return {
      title: collection ? collection.title : `Collection: ${rule.scopeValue || ""}`,
      subtitle: collection?.handle || "Collection assignment",
      imageUrl: null,
      imageAlt: null,
      summary: `Priority ${rule.priority} • ${scope}`,
    };
  }

  return {
    title: ruleLabel(rule.scope, rule.scopeValue),
    subtitle: `Priority ${rule.priority} • ${scope}`,
    imageUrl: null,
    imageAlt: null,
    summary: null,
  };
}
