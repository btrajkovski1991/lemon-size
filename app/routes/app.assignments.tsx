import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { Form, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

type Scope = "ALL" | "PRODUCT" | "COLLECTION" | "TYPE" | "VENDOR" | "TAG";

type ChartLite = { id: string; title: string; isDefault: boolean };
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

async function requireShopFromDb() {
  const online = await prisma.session.findFirst({
    where: { isOnline: true },
    orderBy: [{ expires: "desc" }],
    select: { shop: true },
  });
  if (online?.shop) return online.shop;

  const any = await prisma.session.findFirst({
    orderBy: [{ expires: "desc" }],
    select: { shop: true },
  });

  if (!any?.shop) {
    throw new Response(
      "No Shopify session found. Re-open the app from Shopify Admin and re-auth.",
      { status: 401 },
    );
  }
  return any.shop;
}

async function getOrCreateShopRow(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shop: shopDomain },
    update: {},
    create: { shop: shopDomain },
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const shopDomain = await requireShopFromDb();
  const shopRow = await getOrCreateShopRow(shopDomain);

  const charts = await prisma.sizeChart.findMany({
    where: { shopId: shopRow.id },
    orderBy: [{ isDefault: "desc" }, { title: "asc" }],
    select: { id: true, title: true, isDefault: true },
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
  await authenticate.admin(request);

  const shopDomain = await requireShopFromDb();
  const shopRow = await getOrCreateShopRow(shopDomain);

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "create") {
    const scope = String(form.get("scope") || "ALL") as Scope;
    const priority = Number(form.get("priority") || 100);

    const scopeValueRaw = String(form.get("scopeValue") || "").trim();
    const scopeValue = scope === "ALL" ? null : scopeValueRaw;

    const chartIdRaw = String(form.get("chartId") || "").trim();
    const demoKey = String(form.get("demoKey") || "").trim();

    if (scope !== "ALL" && !scopeValue) {
      throw new Response("Missing scopeValue", { status: 400 });
    }

    if (chartIdRaw) {
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
      return { ok: true };
    }

    const fallback = await prisma.sizeChart.findFirst({
      where: { shopId: shopRow.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!fallback?.id) {
      throw new Response(
        `No Size Charts found in DB. Create/seed charts first. (Demo selected: ${demoKey || "none"})`,
        { status: 400 },
      );
    }

    await prisma.sizeChartAssignment.create({
      data: {
        shopId: shopRow.id,
        chartId: fallback.id,
        priority,
        scope,
        scopeValue,
        enabled: true,
      },
    });

    return { ok: true };
  }

  // SAFE TOGGLE
  if (intent === "toggle") {
    const id = String(form.get("id") || "");
    const enabled = String(form.get("enabled") || "false") === "true";
    if (!id) throw new Response("Missing id", { status: 400 });

    const result = await prisma.sizeChartAssignment.updateMany({
      where: { id, shopId: shopRow.id },
      data: { enabled },
    });

    return { ok: true, updated: result.count };
  }

  // SAFE DELETE
  if (intent === "delete") {
    const id = String(form.get("id") || "");
    if (!id) throw new Response("Missing id", { status: 400 });

    const result = await prisma.sizeChartAssignment.deleteMany({
      where: { id, shopId: shopRow.id },
    });

    return { ok: true, deleted: result.count };
  }

  return { ok: false };
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

/** Demo tables shown when DB has no charts (UI test mode). */
const DEMO_TABLES = [
  { key: "shoe", title: "Shoes (US/EU/Foot length)" },
  { key: "suit", title: "Suits & Blazers (Chest/Waist)" },
  { key: "default", title: "Default table" },
];

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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: any;
  footer?: any;
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
          width: "min(900px, 96vw)",
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
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
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

export default function Assignments() {
  const { shopDomain, charts, rules, products, collections } = useLoaderData<typeof loader>();
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

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  );

  const selectedCollection = useMemo(
    () => collections.find((c) => c.handle === collectionHandle) || null,
    [collections, collectionHandle],
  );

  const defaultChartId = useMemo(() => {
    const d = charts.find((c: ChartLite) => c.isDefault);
    return d?.id || charts?.[0]?.id || "";
  }, [charts]);

  const [chartId, setChartId] = useState<string>(defaultChartId);
  const [demoKey, setDemoKey] = useState<string>("shoe");
  const [priority, setPriority] = useState<string>("100");

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

  return (
    <s-page heading="Size chart assignments">
      <s-section>
        <s-paragraph>
          <strong>Shop:</strong> {shopDomain}
        </s-paragraph>
      </s-section>

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

      <s-section heading="Create rule">
        <Form method="post">
          <input type="hidden" name="intent" value="create" />
          <input type="hidden" name="scopeValue" value={scopeValue} />
          <input type="hidden" name="chartId" value={chartsEmpty ? "" : chartId} />
          <input type="hidden" name="demoKey" value={chartsEmpty ? demoKey : ""} />

          <s-stack direction="inline" gap="base" style={{ alignItems: "flex-start" }}>
            {/* LEFT */}
            <s-box padding="base" borderWidth="base" borderRadius="base" style={{ flex: 1 }}>
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

                    <s-paragraph style={{ marginTop: 8 }}>
                      Applies to all products in this collection.
                    </s-paragraph>
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
                          ? "e.g. Shoes, Suits, Jeans"
                          : scope === "VENDOR"
                            ? "e.g. Nike, Adidas"
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
            </s-box>

            {/* RIGHT */}
            <s-box padding="base" borderWidth="base" borderRadius="base" style={{ width: 420 }}>
              <s-heading>Select size table</s-heading>

              {!chartsEmpty ? (
                <>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Size table
                    </label>
                    <select
                      value={chartId}
                      onChange={(e) => setChartId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                      }}
                    >
                      {charts.map((c: ChartLite) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                          {c.isDefault ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <s-paragraph style={{ marginTop: 8 }}>
                    This selects an existing table from your database.
                  </s-paragraph>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Size table (demo)
                    </label>
                    <select
                      value={demoKey}
                      onChange={(e) => setDemoKey(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                      }}
                    >
                      {DEMO_TABLES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <s-paragraph style={{ marginTop: 8 }}>
                    No DB charts found yet — add charts to enable real selection.
                  </s-paragraph>
                </>
              )}

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
            </s-box>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Rules">
        {rules.length === 0 ? (
          <s-paragraph>No rules yet.</s-paragraph>
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