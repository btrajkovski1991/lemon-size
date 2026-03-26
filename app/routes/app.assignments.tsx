import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { ChartTitleIcon, InfoCard, ModalShell, Thumb } from "../components/admin-ui";
import { invalidateShopSizeChartCache } from "../utils/size-chart-cache.server";
import {
  type AssignmentChartLite as ChartLite,
  type AssignmentRuleLite as RuleLite,
  type CollectionLite,
  type ProductLite,
  type Scope,
  getRulePresentation,
  normalizeAssignmentChartLite,
  parseBulkTextValues,
  ruleLabel,
} from "../utils/assignments";
import { getOrCreateShopRow } from "../utils/shop.server";

type ActionData =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | undefined;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const shopRow = await getOrCreateShopRow(shopDomain);

  // ✅ include preview data (small + cheap): columns + first 5 rows
  const charts = await prisma.sizeChart.findMany({
    where: { shopId: shopRow.id },
    orderBy: [{ isDefault: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      isDefault: true,
      unit: true,
      columns: true,
      rows: {
        orderBy: [{ sortOrder: "asc" }],
        take: 5,
        select: { label: true, sortOrder: true, values: true },
      },
    },
  });

  const rules = await prisma.sizeChartAssignment.findMany({
    where: { shopId: shopRow.id },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    include: { chart: { select: { title: true } } },
  });

  // Products + collections for pickers
  const resp = await admin.graphql(
    `#graphql
      query LemonSizeAssignmentsPickers {
        products(first: 100, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            handle
            vendor
            featuredImage { url altText }
          }
        }
        collections(first: 100, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            handle
            image { url altText }
          }
        }
      }
    `,
  );

  const json = await resp.json();
  const products: ProductLite[] =
    (json?.data?.products?.nodes ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      vendor: p.vendor,
      imageUrl: p.featuredImage?.url ?? null,
      imageAlt: p.featuredImage?.altText ?? null,
    }));

  const collections: CollectionLite[] =
    (json?.data?.collections?.nodes ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      imageUrl: c.image?.url ?? null,
      imageAlt: c.image?.altText ?? null,
    }));

  return { shopDomain, charts, rules, products, collections };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const shopRow = await getOrCreateShopRow(shopDomain);

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "create") {
    const scope = String(form.get("scope") || "ALL") as Scope;
    const priority = Number(form.get("priority") || 100);
    const chartIdRaw = String(form.get("chartId") || "").trim();
    const scopeValuesJson = String(form.get("scopeValuesJson") || "[]");
    let scopeValues: Array<string | null> = [];

    try {
      const parsed = JSON.parse(scopeValuesJson);
      if (Array.isArray(parsed)) {
        scopeValues = parsed
          .map((value) => {
            if (value == null) return null;
            const normalized = String(value).trim();
            return normalized || null;
          })
          .filter((value, index, arr) => arr.indexOf(value) === index);
      }
    } catch (_error) {
      return { ok: false, message: "Invalid bulk assignment payload." } satisfies ActionData;
    }

    if (scope === "ALL") {
      scopeValues = [null];
    }

    if (scope !== "ALL" && scopeValues.length === 0) {
      return {
        ok: false,
        message: "Choose one or more valid match values before saving the rule.",
      } satisfies ActionData;
    }

    if (!chartIdRaw) {
      return {
        ok: false,
        message: "Choose a size table before saving the rule.",
      } satisfies ActionData;
    }

    await prisma.sizeChartAssignment.createMany({
      data: scopeValues.map((scopeValue) => ({
        shopId: shopRow.id,
        chartId: chartIdRaw,
        priority,
        scope,
        scopeValue,
        enabled: true,
      })),
    });
    invalidateShopSizeChartCache(shopRow.id);

    return {
      ok: true,
      message:
        scopeValues.length === 1
          ? "Assignment rule saved."
          : `${scopeValues.length} assignment rules saved.`,
    } satisfies ActionData;
  }

  // SAFE TOGGLE
  if (intent === "toggle") {
    const id = String(form.get("id") || "");
    const enabled = String(form.get("enabled") || "false") === "true";
    if (!id) return { ok: false, message: "Missing rule id." } satisfies ActionData;

    const result = await prisma.sizeChartAssignment.updateMany({
      where: { id, shopId: shopRow.id },
      data: { enabled },
    });
    invalidateShopSizeChartCache(shopRow.id);

    return {
      ok: true,
      message: `Assignment rule ${enabled ? "enabled" : "disabled"}.`,
    } satisfies ActionData;
  }

  // SAFE DELETE
  if (intent === "delete") {
    const id = String(form.get("id") || "");
    if (!id) return { ok: false, message: "Missing rule id." } satisfies ActionData;

    const result = await prisma.sizeChartAssignment.deleteMany({
      where: { id, shopId: shopRow.id },
    });
    invalidateShopSizeChartCache(shopRow.id);

    return { ok: true, message: "Assignment rule deleted." } satisfies ActionData;
  }

  return { ok: false, message: "Unknown action." } satisfies ActionData;
};

function ChartPreview({ chart }: { chart: ChartLite | null }) {
  if (!chart) return null;

  const cols = (chart.columns ?? []).filter(Boolean);
  const rows = chart.rows ?? [];

  if (!cols.length || !rows.length) {
    return (
      <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #eee", background: "#fafafa" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Preview</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
          No preview rows yet for this chart.
        </div>
      </div>
    );
  }

  const showCols = cols.slice(0, 3);

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #eee", background: "white" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Preview</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{chart.unit ? String(chart.unit).toUpperCase() : ""}</div>
      </div>

      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
          <thead>
            <tr>
              {showCols.map((c) => (
                <th
                  key={c}
                  style={{
                    textAlign: "left",
                    fontSize: 12,
                    padding: "10px 10px",
                    borderBottom: "1px solid #eee",
                    background: "#fafafa",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 4).map((r) => (
              <tr key={`${r.label}-${r.sortOrder}`}>
                {showCols.map((c) => (
                  <td key={c} style={{ padding: "10px 10px", borderBottom: "1px solid #f2f2f2", fontSize: 12 }}>
                    {String(r.values?.[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
        Showing first {Math.min(4, rows.length)} rows & {showCols.length} columns.
      </div>
    </div>
  );
}

export default function Assignments() {
  const actionData = useActionData<ActionData>();
  const loaderData = useLoaderData<typeof loader>();
  const { shopDomain, rules, products, collections } = loaderData;
  const charts = useMemo<ChartLite[]>(
    () => (loaderData.charts ?? []).map((chart) => normalizeAssignmentChartLite(chart)),
    [loaderData.charts],
  );
  const chartsEmpty = charts.length === 0;

  // UI state
  const [scope, setScope] = useState<Scope>("PRODUCT");

  // Selected values
  const [productIds, setProductIds] = useState<string[]>(products?.[0]?.id ? [products[0].id] : []);
  const [collectionHandles, setCollectionHandles] = useState<string[]>(
    collections?.[0]?.handle ? [collections[0].handle] : [],
  );
  const [textValue, setTextValue] = useState<string>("");

  // Pickers
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [collectionQuery, setCollectionQuery] = useState("");

  // Chart picker modal
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [chartQuery, setChartQuery] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleScopeFilter, setRuleScopeFilter] = useState("ALL");
  const [ruleStatusFilter, setRuleStatusFilter] = useState("all");
  const [ruleChartFilter, setRuleChartFilter] = useState("all");
  const [chartSelectorHover, setChartSelectorHover] = useState(false);

  const selectedProducts = useMemo(
    () => products.filter((p) => productIds.includes(p.id)),
    [products, productIds],
  );

  const selectedCollections = useMemo(
    () => collections.filter((c) => collectionHandles.includes(c.handle)),
    [collections, collectionHandles],
  );

  const defaultChartId = useMemo(() => {
    const d = charts.find((c) => c.isDefault);
    return d?.id || charts?.[0]?.id || "";
  }, [charts]);

  const [chartId, setChartId] = useState<string>(defaultChartId);
  const [priority, setPriority] = useState<string>("100");

  const selectedChart = useMemo(
    () => charts.find((c) => c.id === chartId) || null,
    [charts, chartId],
  );

  const scopeValues = useMemo(() => {
    if (scope === "ALL") return [null];
    if (scope === "PRODUCT") return productIds;
    if (scope === "COLLECTION") return collectionHandles;
    return parseBulkTextValues(textValue);
  }, [scope, productIds, collectionHandles, textValue]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      return (
        p.title.toLowerCase().includes(q) ||
        (p.vendor || "").toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q)
      );
    });
  }, [products, productQuery]);

  const filteredCollections = useMemo(() => {
    const q = collectionQuery.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) => {
      return c.title.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
    });
  }, [collections, collectionQuery]);

  const filteredCharts = useMemo(() => {
    const q = chartQuery.trim().toLowerCase();
    if (!q) return charts;
    return charts.filter((c) => c.title.toLowerCase().includes(q));
  }, [charts, chartQuery]);

  const ruleChartOptions = useMemo(
    () =>
      Array.from(new Set(rules.map((rule: RuleLite) => rule.chart.title)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [rules],
  );

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    return rules.filter((rule: RuleLite) => {
      const label = ruleLabel(rule.scope, rule.scopeValue).toLowerCase();
      const chartTitle = String(rule.chart.title || "").toLowerCase();
      const status = rule.enabled ? "enabled" : "disabled";

      if (q && !label.includes(q) && !chartTitle.includes(q)) return false;
      if (ruleScopeFilter !== "ALL" && String(rule.scope).toUpperCase() !== ruleScopeFilter) return false;
      if (ruleStatusFilter !== "all" && status !== ruleStatusFilter) return false;
      if (ruleChartFilter !== "all" && rule.chart.title !== ruleChartFilter) return false;
      return true;
    });
  }, [rules, ruleSearch, ruleScopeFilter, ruleStatusFilter, ruleChartFilter]);

  return (
    <s-page heading="Size chart assignments">
      <s-section>
        <s-paragraph>
          <strong>Shop:</strong> {shopDomain}
        </s-paragraph>
      </s-section>

      <s-section heading="How Assignments Work">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <InfoCard
            title="1. Choose what should match"
            text="Pick products, collections, product types, vendors, tags, or all products as the matching condition."
          />
          <InfoCard
            title="2. Pick the size table"
            text="Select the chart shoppers should see when that condition matches on the storefront."
          />
          <InfoCard
            title="3. Use priority to break ties"
            text="Lower priority numbers win first, so direct and important assignment rules should stay near the top."
          />
        </div>
      </s-section>

      {actionData ? (
        <s-section>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: actionData.ok ? "1px solid #b7e1c0" : "1px solid #ef9a9a",
              background: actionData.ok ? "#f3fbf5" : "#fff5f5",
              color: "#222",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {actionData.message}
          </div>
        </s-section>
      ) : null}

      {/* Product picker modal */}
      <ModalShell
        open={productPickerOpen}
        title="Select Products"
        onClose={() => setProductPickerOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setProductPickerOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #cfd3d8",
                background: "white",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => setProductPickerOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2e7d32",
                background: "#3aa655",
                color: "white",
                cursor: "pointer",
              }}
            >
              Select
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <input
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Filter products by full name"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #dfe3e8",
              background: "white",
            }}
          />
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid #eee",
              background: "#fafafa",
              fontSize: 13,
              color: "#444",
            }}
          >
            <div>Showing {Math.min(filteredProducts.length, 100)} products</div>
            <div style={{ opacity: 0.7 }}>Select one or more products</div>
          </div>

          {filteredProducts.slice(0, 100).map((p) => {
            const checked = productIds.includes(p.id);
            return (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderTop: "1px solid #f1f1f1",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="productPick"
                  checked={checked}
                  onChange={() =>
                    setProductIds((prev) =>
                      prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                    )
                  }
                  style={{ width: 18, height: 18 }}
                />

                <Thumb url={p.imageUrl} alt={p.imageAlt} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 750, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {p.vendor ? `${p.vendor} • ` : ""}{p.handle}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </ModalShell>

      {/* Collection picker modal */}
      <ModalShell
        open={collectionPickerOpen}
        title="Select Collections"
        onClose={() => setCollectionPickerOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCollectionPickerOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #cfd3d8",
                background: "white",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => setCollectionPickerOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2e7d32",
                background: "#3aa655",
                color: "white",
                cursor: "pointer",
              }}
            >
              Select
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <input
            value={collectionQuery}
            onChange={(e) => setCollectionQuery(e.target.value)}
            placeholder="Filter collections by name or handle"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #dfe3e8",
              background: "white",
            }}
          />
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid #eee",
              background: "#fafafa",
              fontSize: 13,
              color: "#444",
            }}
          >
            <div>Showing {Math.min(filteredCollections.length, 100)} collections</div>
            <div style={{ opacity: 0.7 }}>Select one or more collections</div>
          </div>
          {filteredCollections.slice(0, 100).map((c) => {
            const checked = collectionHandles.includes(c.handle);
            return (
              <label
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderTop: "1px solid #f1f1f1",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="collectionPick"
                  checked={checked}
                  onChange={() =>
                    setCollectionHandles((prev) =>
                      prev.includes(c.handle)
                        ? prev.filter((handle) => handle !== c.handle)
                        : [...prev, c.handle],
                    )
                  }
                  style={{ width: 18, height: 18 }}
                />

                <Thumb url={c.imageUrl} alt={c.imageAlt} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 750, fontSize: 14 }}>{c.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{c.handle}</div>
                </div>
              </label>
            );
          })}
        </div>
      </ModalShell>

      {/* ✅ Chart picker modal (nice grid + SVG icons + preview-like feel) */}
      <ModalShell
        open={chartPickerOpen}
        title="Choose size table"
        onClose={() => setChartPickerOpen(false)}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setChartPickerOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #cfd3d8",
                background: "white",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </>
        }
      >
        {chartsEmpty ? (
          <s-paragraph>
            No size tables are available for this shop yet. Refresh the page or create one manually.
          </s-paragraph>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                value={chartQuery}
                onChange={(e) => setChartQuery(e.target.value)}
                placeholder="Search templates…"
                style={{
                  width: "100%",
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid #dfe3e8",
                  background: "white",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {filteredCharts.map((c) => {
                const active = c.id === chartId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setChartId(c.id);
                      setChartPickerOpen(false);
                    }}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      border: active ? "2px solid #3aa655" : "1px solid #e7e7e7",
                      background: "white",
                      padding: 12,
                      cursor: "pointer",
                      boxShadow: active ? "0 10px 20px rgba(58,166,85,.14)" : "0 8px 18px rgba(0,0,0,.06)",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                    aria-pressed={active}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 14,
                        border: "1px solid #eee",
                        background: "#fafafa",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      <ChartTitleIcon title={c.title} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 850, fontSize: 14, lineHeight: 1.1 }}>
                        {c.title}
                        {c.isDefault ? " (default)" : ""}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                        {c.unit ? String(c.unit).toUpperCase() : "—"} • {Array.isArray(c.columns) ? c.columns.length : 0} cols
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </ModalShell>

      <s-section heading="Create rule">
        <Form method="post">
          <input type="hidden" name="intent" value="create" />
          <input type="hidden" name="scopeValuesJson" value={JSON.stringify(scopeValues)} />
          <input type="hidden" name="chartId" value={chartsEmpty ? "" : chartId} />

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div
              style={{
                flex: "1 1 420px",
                padding: 16,
                border: "1px solid #e7e7e7",
                borderRadius: 12,
                background: "white",
              }}
            >
              <s-heading>Apply to Products</s-heading>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>
                Bulk helper: save one assignment rule for every selected product, collection, or
                entered match value.
              </div>

              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Add new matching condition
                </label>

                <select
                  name="scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as Scope)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #dfe3e8",
                    background: "white",
                  }}
                >
                  <option value="PRODUCT">Products</option>
                  <option value="COLLECTION">Collections</option>
                  <option value="TYPE">Product types</option>
                  <option value="VENDOR">Product vendors</option>
                  <option value="TAG">Product tags</option>
                  <option value="ALL">All products</option>
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                {scope === "ALL" ? (
                  <s-paragraph>
                    This rule applies to <strong>all products</strong>.
                  </s-paragraph>
                ) : scope === "PRODUCT" ? (
                  <>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Select products
                    </label>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setProductPickerOpen(true)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #dfe3e8",
                          background: "white",
                          cursor: "pointer",
                        }}
                      >
                        {selectedProducts.length > 0 ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={{ fontWeight: 750, fontSize: 14 }}>
                              {selectedProducts.length} product(s) selected
                            </div>
                            <div style={{ display: "grid", gap: 6 }}>
                              {selectedProducts.slice(0, 3).map((product) => (
                                <div key={product.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Thumb url={product.imageUrl} alt={product.imageAlt} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 750, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {product.title}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                      {product.vendor ? `${product.vendor} • ` : ""}
                                      {product.handle}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {selectedProducts.length > 3 ? (
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                  +{selectedProducts.length - 3} more selected
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          "Choose one or more products…"
                        )}
                      </button>
                    </div>
                  </>
                ) : scope === "COLLECTION" ? (
                  <>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Select collections
                    </label>

                    <button
                      type="button"
                      onClick={() => setCollectionPickerOpen(true)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      {selectedCollections.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontWeight: 750, fontSize: 14 }}>
                            {selectedCollections.length} collection(s) selected
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            {selectedCollections.slice(0, 3).map((collection) => (
                              <div key={collection.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Thumb url={collection.imageUrl} alt={collection.imageAlt} />
                                <div>
                                  <div style={{ fontWeight: 750, fontSize: 14 }}>{collection.title}</div>
                                  <div style={{ fontSize: 12, opacity: 0.75 }}>{collection.handle}</div>
                                </div>
                              </div>
                            ))}
                            {selectedCollections.length > 3 ? (
                              <div style={{ fontSize: 12, opacity: 0.7 }}>
                                +{selectedCollections.length - 3} more selected
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        "Choose one or more collections…"
                      )}
                    </button>

                    <div style={{ marginTop: 8 }}>
                      <s-paragraph>Applies to all products in this collection.</s-paragraph>
                    </div>
                  </>
                ) : (
                  <>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Value ({scope.toLowerCase()})
                    </label>
                    <textarea
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder={
                        scope === "TYPE"
                          ? "Shoes\nTops\nDresses"
                          : scope === "VENDOR"
                            ? "Nike\nAdidas"
                            : "oversized\nsummer"
                      }
                      style={{
                        width: "100%",
                        minHeight: 108,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, lineHeight: 1.4 }}>
                      Enter one or more values separated by commas, semicolons, or new lines.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                width: 460,
                maxWidth: "100%",
                padding: 16,
                border: "1px solid #e7e7e7",
                borderRadius: 12,
                background: "white",
              }}
            >
              <s-heading>Select size table</s-heading>

              {chartsEmpty ? (
                <>
                  <div style={{ marginTop: 8 }}>
                    <s-paragraph>
                      <strong>No size tables found.</strong> Refresh the page to load the default starter charts, or create one manually.
                    </s-paragraph>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Priority (lower wins)
                    </label>
                    <input
                      name="priority"
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <s-button variant="primary" type="submit" disabled>
                      Save rule
                    </s-button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setChartPickerOpen(true)}
                      onMouseEnter={() => setChartSelectorHover(true)}
                      onMouseLeave={() => setChartSelectorHover(false)}
                      onFocus={() => setChartSelectorHover(true)}
                      onBlur={() => setChartSelectorHover(false)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "16px 18px",
                        borderRadius: 16,
                        border: chartSelectorHover ? "1px solid #3aa655" : "1px solid #cfd8dc",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 14,
                        boxShadow: chartSelectorHover
                          ? "0 14px 30px rgba(58,166,85,.16)"
                          : "0 6px 16px rgba(15,23,42,.06)",
                        transform: chartSelectorHover ? "translateY(-1px)" : "translateY(0)",
                        transition:
                          "border-color .18s ease, box-shadow .18s ease, transform .18s ease, background-color .18s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                        <div
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 16,
                            border: chartSelectorHover ? "1px solid #cfe8d5" : "1px solid #eee",
                            background: chartSelectorHover ? "#f3fbf5" : "#fafafa",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "0 0 auto",
                            boxShadow: chartSelectorHover ? "inset 0 0 0 1px rgba(58,166,85,.08)" : "none",
                            transition:
                              "border-color .18s ease, background-color .18s ease, box-shadow .18s ease",
                          }}
                        >
                          <ChartTitleIcon title={selectedChart?.title || ""} size={52} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 850, fontSize: 18, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {selectedChart?.title || "Choose a table…"}
                            {selectedChart?.isDefault ? " (default)" : ""}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              marginTop: 4,
                              fontWeight: 600,
                              color: chartSelectorHover ? "#226c35" : "rgba(17,24,39,.65)",
                            }}
                          >
                            Click to choose or change
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 28,
                          color: chartSelectorHover ? "#2f855a" : "rgba(17,24,39,.45)",
                          lineHeight: 1,
                          transform: chartSelectorHover ? "translateX(2px)" : "translateX(0)",
                          transition: "transform .18s ease, color .18s ease",
                        }}
                      >
                        ›
                      </div>
                    </button>

                    <ChartPreview chart={selectedChart} />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Priority (lower wins)
                    </label>
                    <input
                      name="priority"
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 8 }}>
                      This save will create{" "}
                      <strong>{scopeValues.length || 0}</strong>{" "}
                      assignment rule{scopeValues.length === 1 ? "" : "s"}.
                    </div>
                    <s-button variant="primary" type="submit">
                      {scopeValues.length > 1 ? "Save bulk rules" : "Save rule"}
                    </s-button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Form>
      </s-section>

      <s-section heading="Rules">
        {rules.length === 0 ? (
          <div style={emptyStateStyle}>
            <s-paragraph>No assignment rules yet.</s-paragraph>
            <s-paragraph>
              Start with a direct product or collection assignment. Those rules are checked before
              keyword fallbacks.
            </s-paragraph>
          </div>
        ) : (
          <>
            <s-paragraph>
              Review your direct matching rules here. Assignments are checked before any keyword
              fallback rules.
            </s-paragraph>
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid #e7e7e7",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 1.4fr) repeat(3, minmax(160px, .8fr))",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Search rules</label>
                  <input
                    value={ruleSearch}
                    onChange={(e) => setRuleSearch(e.target.value)}
                    placeholder="Search by rule label or table"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Scope</label>
                  <select value={ruleScopeFilter} onChange={(e) => setRuleScopeFilter(e.target.value)} style={inputStyle}>
                    <option value="ALL">All scopes</option>
                    <option value="PRODUCT">Products</option>
                    <option value="COLLECTION">Collections</option>
                    <option value="TYPE">Product types</option>
                    <option value="VENDOR">Vendors</option>
                    <option value="TAG">Tags</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Status</label>
                  <select value={ruleStatusFilter} onChange={(e) => setRuleStatusFilter(e.target.value)} style={inputStyle}>
                    <option value="all">All statuses</option>
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Table</label>
                  <select value={ruleChartFilter} onChange={(e) => setRuleChartFilter(e.target.value)} style={inputStyle}>
                    <option value="all">All tables</option>
                    {ruleChartOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.72 }}>
                  Showing {filteredRules.length} of {rules.length} assignment rule(s)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRuleSearch("");
                    setRuleScopeFilter("ALL");
                    setRuleStatusFilter("all");
                    setRuleChartFilter("all");
                  }}
                  style={secondaryBtnStyle}
                >
                  Reset filters
                </button>
              </div>
            </div>

            {filteredRules.length === 0 ? (
              <div style={{ ...emptyStateStyle, marginTop: 16 }}>
                No assignment rules match the current filters.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {filteredRules.map((r: RuleLite) => {
                  const presentation = getRulePresentation(r, products, collections);

                  return (
                    <div
                      key={r.id}
                      style={{
                        border: "1px solid #e7e7e7",
                        borderRadius: 18,
                        padding: 18,
                        background: "white",
                        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1.6fr) repeat(3, minmax(120px, .6fr)) auto auto",
                          gap: 14,
                          alignItems: "start",
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            display: "flex",
                            gap: 14,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              padding: 6,
                              borderRadius: 14,
                              background: "#f8fafc",
                              border: "1px solid #edf2f7",
                              flex: "0 0 auto",
                            }}
                          >
                            <Thumb url={presentation.imageUrl} alt={presentation.imageAlt} />
                          </div>
                          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                            <div
                              style={{
                                fontSize: 17,
                                fontWeight: 850,
                                lineHeight: 1.3,
                                wordBreak: "break-word",
                              }}
                            >
                              {presentation.title}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#5b6472",
                                marginTop: 6,
                                lineHeight: 1.45,
                                wordBreak: "break-word",
                              }}
                            >
                              {presentation.subtitle}
                            </div>
                            {presentation.summary ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#475467",
                                  marginTop: 8,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "5px 10px",
                                  borderRadius: 999,
                                  background: "#f3f6f8",
                                  border: "1px solid #e7ecef",
                                }}
                              >
                                {presentation.summary}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "#fbfbfc",
                            border: "1px solid #eef0f3",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: ".04em" }}>
                            Table
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, wordBreak: "break-word" }}>
                            {r.chart.title}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: r.enabled ? "#f3fbf5" : "#fbf4f4",
                            border: r.enabled ? "1px solid #dbeee0" : "1px solid #f0dede",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: ".04em" }}>
                            Status
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                            {r.enabled ? "Enabled" : "Disabled"}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "#fbfbfc",
                            border: "1px solid #eef0f3",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: ".04em" }}>
                            Priority
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{r.priority}</div>
                        </div>

                        <Form method="post" style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="enabled" value={(!r.enabled).toString()} />
                          <s-button type="submit" variant="tertiary">
                            {r.enabled ? "Disable" : "Enable"}
                          </s-button>
                        </Form>

                        <Form method="post" style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={r.id} />
                          <s-button type="submit" variant="tertiary" tone="critical">
                            Delete
                          </s-button>
                        </Form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </s-section>
    </s-page>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dfe3e8",
  background: "white",
} as const;

const secondaryBtnStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dfe3e8",
  background: "white",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const emptyStateStyle = {
  padding: 20,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "#fafafa",
} as const;

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
