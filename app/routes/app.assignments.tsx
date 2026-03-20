import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

type Scope = "ALL" | "PRODUCT" | "COLLECTION" | "TYPE" | "VENDOR" | "TAG";

type ChartPreviewRow = { label: string; sortOrder: number; values: Record<string, any> };
type ChartLite = {
  id: string;
  title: string;
  isDefault: boolean;
  unit?: string | null;
  columns?: string[] | null;
  rows?: ChartPreviewRow[]; // preview rows
};

type RuleLite = {
  id: string;
  priority: number;
  scope: string;
  scopeValue: string | null;
  enabled: boolean;
  chart: { title: string };
};

type ProductLite = {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

type CollectionLite = {
  id: string;
  title: string;
  handle: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

type ActionData =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | undefined;

function normalizeColumns(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((value) => String(value ?? "").trim()).filter(Boolean);
}

function normalizePreviewRows(input: unknown): ChartPreviewRow[] {
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

function normalizeChartLite(chart: any): ChartLite {
  return {
    id: String(chart?.id ?? ""),
    title: String(chart?.title ?? ""),
    isDefault: Boolean(chart?.isDefault),
    unit: chart?.unit ? String(chart.unit) : null,
    columns: normalizeColumns(chart?.columns),
    rows: normalizePreviewRows(chart?.rows),
  };
}

async function getOrCreateShopRow(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shop: shopDomain },
    update: {},
    create: { shop: shopDomain },
  });
}

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

    const scopeValueRaw = String(form.get("scopeValue") || "").trim();
    const scopeValue = scope === "ALL" ? null : scopeValueRaw;

    const chartIdRaw = String(form.get("chartId") || "").trim();

    if (scope !== "ALL" && !scopeValue) {
      return { ok: false, message: "Choose a valid match value before saving the rule." } satisfies ActionData;
    }

    if (!chartIdRaw) {
      return {
        ok: false,
        message: "Choose a size table before saving the rule.",
      } satisfies ActionData;
    }

    await prisma.sizeChartAssignment.create({
      data: {
        shopId: shopRow.id,
        chartId: chartIdRaw,
        priority,
        scope,
        scopeValue,
        enabled: true,
      },
    });

    return { ok: true, message: "Assignment rule saved." } satisfies ActionData;
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

    return { ok: true, message: "Assignment rule deleted." } satisfies ActionData;
  }

  return { ok: false, message: "Unknown action." } satisfies ActionData;
};

function ruleLabel(scope: string, scopeValue: string | null) {
  if (scope === "ALL") return "All products";
  if (scope === "PRODUCT") return `Product: ${scopeValue || ""}`;
  if (scope === "COLLECTION") return `Collection: ${scopeValue || ""}`;
  if (scope === "TYPE") return `Type: ${scopeValue || ""}`;
  if (scope === "VENDOR") return `Vendor: ${scopeValue || ""}`;
  if (scope === "TAG") return `Tag: ${scopeValue || ""}`;
  return `${scope}${scopeValue ? `: ${scopeValue}` : ""}`;
}

function Thumb({ url, alt }: { url?: string | null; alt?: string | null }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        border: "1px solid #e7e7e7",
        background: "#fafafa",
        overflow: "hidden",
        flex: "0 0 auto",
      }}
    >
      {url ? (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img
          src={url}
          alt={alt || "image"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
    </div>
  );
}

function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: any;
  footer?: any;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: wide ? "min(980px, 96vw)" : "min(900px, 96vw)",
          maxHeight: "86vh",
          background: "white",
          borderRadius: 16,
          boxShadow: "0 12px 30px rgba(0,0,0,.20)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 24,
              lineHeight: 1,
              cursor: "pointer",
              padding: 6,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

/** ✅ Simple SVG icon set per template title (admin UI only). */
function IconForChartTitle({ title }: { title: string }) {
  const common = { width: 42, height: 42, viewBox: "0 0 48 48", fill: "none" as const };

  const stroke = "#2a2a2a";
  const muted = "#9aa0a6";

  const t = title.toLowerCase();

  // shoes
  if (t.includes("shoe")) {
    return (
      <svg {...common}>
        <path
          d="M9 30c7 0 12-6 13-10l8 6c3 2 6 3 9 3h2v6H9v-5z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 35h32" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // tops
  if (t.includes("tops")) {
    return (
      <svg {...common}>
        <path
          d="M16 14l8-4 8 4 4 8-6 4v20H18V26l-6-4 4-8z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // bottoms
  if (t.includes("bottom")) {
    return (
      <svg {...common}>
        <path
          d="M18 10h12l2 28-7-2-3 8-3-8-7 2 2-28z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // blazer / jacket
  if (t.includes("blazer") || t.includes("jacket")) {
    return (
      <svg {...common}>
        <path
          d="M16 12l8-2 8 2 4 10-6 6v14H18V28l-6-6 4-10z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M24 10v32" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // dress
  if (t.includes("dress")) {
    return (
      <svg {...common}>
        <path
          d="M20 10h8l2 8-2 4 6 18H14l6-18-2-4 2-8z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // bra
  if (t.includes("bra")) {
    return (
      <svg {...common}>
        <path
          d="M14 22c2-6 8-8 10-8s8 2 10 8"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 22c0 6 2 10 6 10m22-10c0 6-2 10-6 10"
          stroke={muted}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // bikini / brief
  if (t.includes("bikini") || t.includes("brief")) {
    return (
      <svg {...common}>
        <path
          d="M16 18c2 4 4 6 8 6s6-2 8-6"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16 18l-2 20h24l-2-20"
          stroke={muted}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // pet clothing / collar
  if (t.includes("pet")) {
    return (
      <svg {...common}>
        <circle cx="24" cy="20" r="8" stroke={stroke} strokeWidth="2" />
        <path d="M16 36c2-6 14-6 16 0" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // headwear
  if (t.includes("headwear")) {
    return (
      <svg {...common}>
        <path
          d="M12 28c2-8 8-12 12-12s10 4 12 12"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 28h24v6H12v-6z" stroke={muted} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  // bracelet
  if (t.includes("bracelet")) {
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="10" stroke={stroke} strokeWidth="2" />
        <path d="M18 24h12" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // ring
  if (t.includes("ring")) {
    return (
      <svg {...common}>
        <circle cx="24" cy="26" r="10" stroke={stroke} strokeWidth="2" />
        <path d="M19 14l5-6 5 6" stroke={muted} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  // necklace
  if (t.includes("necklace")) {
    return (
      <svg {...common}>
        <path
          d="M14 18c3-4 7-6 10-6s7 2 10 6"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M24 18v10" stroke={muted} strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="32" r="3" stroke={muted} strokeWidth="2" />
      </svg>
    );
  }

  // default
  return (
    <svg {...common}>
      <rect x="12" y="12" width="24" height="24" rx="6" stroke={stroke} strokeWidth="2" />
      <path d="M16 20h16M16 26h16M16 32h10" stroke={muted} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
    () => (loaderData.charts ?? []).map((chart) => normalizeChartLite(chart)),
    [loaderData.charts],
  );
  const chartsEmpty = charts.length === 0;

  // UI state
  const [scope, setScope] = useState<Scope>("PRODUCT");

  // Selected values
  const [productId, setProductId] = useState<string>(products?.[0]?.id || "");
  const [collectionHandle, setCollectionHandle] = useState<string>(collections?.[0]?.handle || "");
  const [textValue, setTextValue] = useState<string>("");

  // Pickers
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [collectionQuery, setCollectionQuery] = useState("");

  // Chart picker modal
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [chartQuery, setChartQuery] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  );

  const selectedCollection = useMemo(
    () => collections.find((c) => c.handle === collectionHandle) || null,
    [collections, collectionHandle],
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

  // scopeValue to save
  const scopeValue = useMemo(() => {
    if (scope === "ALL") return "";
    if (scope === "PRODUCT") return productId; // GID from GraphQL
    if (scope === "COLLECTION") return collectionHandle; // handle
    return textValue.trim();
  }, [scope, productId, collectionHandle, textValue]);

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

  return (
    <s-page heading="Size chart assignments">
      <s-section>
        <s-paragraph>
          <strong>Shop:</strong> {shopDomain}
        </s-paragraph>
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
            <div style={{ opacity: 0.7 }}>Pick 1 product</div>
          </div>

          {filteredProducts.slice(0, 100).map((p) => {
            const checked = p.id === productId;
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
                  type="radio"
                  name="productPick"
                  checked={checked}
                  onChange={() => setProductId(p.id)}
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
        title="Select Collection"
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
          {filteredCollections.slice(0, 100).map((c) => {
            const checked = c.handle === collectionHandle;
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
                  type="radio"
                  name="collectionPick"
                  checked={checked}
                  onChange={() => setCollectionHandle(c.handle)}
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
            No charts found. Seed/create charts first.
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
                      <IconForChartTitle title={c.title} />
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
          <input type="hidden" name="scopeValue" value={scopeValue} />
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
                      Select product
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
                        {selectedProduct ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Thumb url={selectedProduct.imageUrl} alt={selectedProduct.imageAlt} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 750, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {selectedProduct.title}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                {selectedProduct.vendor ? `${selectedProduct.vendor} • ` : ""}
                                {selectedProduct.handle}
                              </div>
                            </div>
                          </div>
                        ) : (
                          "Choose a product…"
                        )}
                      </button>
                    </div>
                  </>
                ) : scope === "COLLECTION" ? (
                  <>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Select collection
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
                      {selectedCollection ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Thumb url={selectedCollection.imageUrl} alt={selectedCollection.imageAlt} />
                          <div>
                            <div style={{ fontWeight: 750, fontSize: 14 }}>{selectedCollection.title}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{selectedCollection.handle}</div>
                          </div>
                        </div>
                      ) : (
                        "Choose a collection…"
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
                    <input
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder={
                        scope === "TYPE"
                          ? "e.g. Shoes, Tops (product)"
                          : scope === "VENDOR"
                            ? "e.g. Nike"
                            : "e.g. oversized"
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                      }}
                    />
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
                      <strong>No size tables found.</strong> Seed/create charts first.
                    </s-paragraph>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <s-paragraph>
                      Run: <code>SEED_SHOP="{shopDomain}" node prisma/seed.mjs</code>
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
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 12px",
                        borderRadius: 12,
                        border: "1px solid #dfe3e8",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            border: "1px solid #eee",
                            background: "#fafafa",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "0 0 auto",
                          }}
                        >
                          <IconForChartTitle title={selectedChart?.title || ""} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 850, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {selectedChart?.title || "Choose a table…"}
                            {selectedChart?.isDefault ? " (default)" : ""}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            Click to change
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 18, opacity: 0.7 }}>›</div>
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
                    <s-button variant="primary" type="submit">
                      Save rule
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
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: "1px solid #e7e7e7",
              background: "#fafafa",
            }}
          >
            <s-paragraph>No assignment rules yet.</s-paragraph>
            <s-paragraph>
              Start with a direct product or collection assignment. Those rules are checked before
              keyword fallbacks.
            </s-paragraph>
          </div>
        ) : (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px" }}>Priority</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Rule</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Table</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Enabled</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r: RuleLite) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>{r.priority}</td>
                    <td style={{ padding: "8px" }}>{ruleLabel(r.scope, r.scopeValue)}</td>
                    <td style={{ padding: "8px" }}>{r.chart.title}</td>
                    <td style={{ padding: "8px" }}>
                      <Form method="post">
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="enabled" value={(!r.enabled).toString()} />
                        <s-button type="submit" variant="tertiary">
                          {r.enabled ? "Enabled" : "Disabled"}
                        </s-button>
                      </Form>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={r.id} />
                        <s-button type="submit" variant="tertiary" tone="critical">
                          Delete
                        </s-button>
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </s-box>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
