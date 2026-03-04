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

type ProductLite = { id: string; title: string; handle: string };
type CollectionLite = { id: string; title: string; handle: string };

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

  // Products + collections for pickers (limit 50)
  const resp = await admin.graphql(
    `#graphql
      query LemonSizeAssignmentsPickers {
        products(first: 50, sortKey: UPDATED_AT, reverse: true) {
          nodes { id title handle }
        }
        collections(first: 50, sortKey: UPDATED_AT, reverse: true) {
          nodes { id title handle }
        }
      }
    `,
  );

  const json = await resp.json();
  const products: ProductLite[] = json?.data?.products?.nodes ?? [];
  const collections: CollectionLite[] = json?.data?.collections?.nodes ?? [];

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
    const demoKey = String(form.get("demoKey") || "").trim(); // for UI test only

    if (scope !== "ALL" && !scopeValue) {
      throw new Response("Missing scopeValue", { status: 400 });
    }

    // If charts exist -> require chartId
    // If charts do not exist -> allow demoKey (UI test)
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

    // UI TEST MODE: if no chartId, still create a placeholder assignment using DEFAULT chart
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

  // ✅ SAFE TOGGLE (won't throw if record missing)
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

  // ✅ SAFE DELETE (prevents P2025)
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
  {
    key: "shoe",
    title: "Shoes (US/EU/Foot length)",
    unit: "in",
    columns: ["SIZE US", "SIZE EUR", "FOOT LENGTH"],
    rows: [
      { label: "", values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "9.84" } },
      { label: "", values: { "SIZE US": "7.5", "SIZE EUR": "41", "FOOT LENGTH": "10" } },
      { label: "", values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "10.2" } },
      { label: "", values: { "SIZE US": "8.5", "SIZE EUR": "42", "FOOT LENGTH": "10.4" } },
      { label: "", values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "10.6" } },
    ],
  },
  {
    key: "suit",
    title: "Suits & Blazers (Chest/Waist)",
    unit: "cm",
    columns: ["CHEST", "WAIST"],
    rows: [
      { label: "46", values: { CHEST: "92", WAIST: "80" } },
      { label: "48", values: { CHEST: "96", WAIST: "84" } },
      { label: "50", values: { CHEST: "100", WAIST: "88" } },
    ],
  },
  {
    key: "default",
    title: "Default table",
    unit: "cm",
    columns: ["A", "B", "C"],
    rows: [
      { label: "S", values: { A: "10", B: "20", C: "30" } },
      { label: "M", values: { A: "12", B: "22", C: "32" } },
      { label: "L", values: { A: "14", B: "24", C: "34" } },
    ],
  },
];

function PreviewTable({
  title,
  unit,
  columns,
  rows,
}: {
  title: string;
  unit: string;
  columns: string[];
  rows: { label?: string; values: Record<string, string> }[];
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 650 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Unit: {unit}</div>

      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                Size
              </th>
              {columns.map((c) => (
                <th
                  key={c}
                  style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 6).map((r, idx) => (
              <tr key={idx} style={{ borderTop: "1px solid #f3f3f3" }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{r.label || "-"}</td>
                {columns.map((c) => (
                  <td key={c} style={{ padding: 10 }}>{r.values?.[c] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Assignments() {
  const { shopDomain, charts, rules, products, collections } = useLoaderData<typeof loader>();

  const chartsEmpty = charts.length === 0;

  // UI state
  const [scope, setScope] = useState<Scope>("PRODUCT");
  const [productId, setProductId] = useState<string>(products?.[0]?.id || "");
  const [collectionHandle, setCollectionHandle] = useState<string>(collections?.[0]?.handle || "");
  const [textValue, setTextValue] = useState<string>("");

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
    if (scope === "PRODUCT") return productId;
    if (scope === "COLLECTION") return collectionHandle;
    return textValue.trim();
  }, [scope, productId, collectionHandle, textValue]);

  const demo = useMemo(() => {
    return DEMO_TABLES.find((d) => d.key === demoKey) || DEMO_TABLES[0];
  }, [demoKey]);

  return (
    <s-page heading="Size chart assignments">
      <s-section>
        <s-paragraph>
          <strong>Shop:</strong> {shopDomain}
        </s-paragraph>
      </s-section>

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
                    <select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                      }}
                    >
                      {products.map((p: ProductLite) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.handle})
                        </option>
                      ))}
                    </select>
                  </>
                ) : scope === "COLLECTION" ? (
                  <>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                      Select collection
                    </label>
                    <select
                      value={collectionHandle}
                      onChange={(e) => setCollectionHandle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #dfe3e8",
                        background: "white",
                      }}
                    >
                      {collections.map((c: CollectionLite) => (
                        <option key={c.id} value={c.handle}>
                          {c.title} ({c.handle})
                        </option>
                      ))}
                    </select>

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
                            : "e.g. Suits & Blazers"
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
                    No DB charts found yet — showing demo tables for UI testing.
                    Next: we seed real charts so rules can save correctly.
                  </s-paragraph>

                  <PreviewTable
                    title={demo.title}
                    unit={demo.unit}
                    columns={demo.columns}
                    rows={demo.rows as any}
                  />
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