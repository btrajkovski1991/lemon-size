import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

type ChartLite = {
  id: string;
  title: string;
  isDefault: boolean;
};

type KeywordRuleLite = {
  id: string;
  keyword: string;
  field: string;
  priority: number;
  enabled: boolean;
  chartId: string;
  chart: { title: string };
};

type ActionData =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | undefined;

async function getOrCreateShopRow(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shop: shopDomain },
    update: {},
    create: { shop: shopDomain },
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const shopRow = await getOrCreateShopRow(shopDomain);

  const [charts, keywordRules] = await Promise.all([
    prisma.sizeChart.findMany({
      where: { shopId: shopRow.id },
      orderBy: [{ isDefault: "desc" }, { title: "asc" }],
      select: { id: true, title: true, isDefault: true },
    }),
    prisma.sizeKeywordRule.findMany({
      where: { shopId: shopRow.id },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { chart: { select: { title: true } } },
    }),
  ]);

  return { shopDomain, charts, keywordRules };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const shopRow = await getOrCreateShopRow(shopDomain);

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "create") {
    const keyword = String(form.get("keyword") || "").trim();
    const field = String(form.get("field") || "ANY").trim().toUpperCase();
    const chartId = String(form.get("chartId") || "").trim();
    const priority = Number(form.get("priority") || 500);

    if (!keyword) {
      return { ok: false, message: "Enter a keyword before saving the rule." } satisfies ActionData;
    }
    if (!chartId) {
      return { ok: false, message: "Choose a size chart before saving the rule." } satisfies ActionData;
    }

    await prisma.sizeKeywordRule.create({
      data: {
        shopId: shopRow.id,
        chartId,
        keyword,
        field,
        priority,
        enabled: true,
      },
    });

    return { ok: true, message: "Keyword rule saved." } satisfies ActionData;
  }

  if (intent === "toggle") {
    const id = String(form.get("id") || "");
    const enabled = String(form.get("enabled") || "false") === "true";

    if (!id) {
      return { ok: false, message: "Missing rule id." } satisfies ActionData;
    }

    await prisma.sizeKeywordRule.updateMany({
      where: { id, shopId: shopRow.id },
      data: { enabled },
    });

    return { ok: true, message: `Keyword rule ${enabled ? "enabled" : "disabled"}.` } satisfies ActionData;
  }

  if (intent === "delete") {
    const id = String(form.get("id") || "");
    if (!id) {
      return { ok: false, message: "Missing rule id." } satisfies ActionData;
    }

    await prisma.sizeKeywordRule.deleteMany({
      where: { id, shopId: shopRow.id },
    });

    return { ok: true, message: "Keyword rule deleted." } satisfies ActionData;
  }

  return { ok: false, message: "Unknown action." } satisfies ActionData;
};

export default function KeywordRulesPage() {
  const actionData = useActionData<ActionData>();
  const { shopDomain, charts, keywordRules } = useLoaderData<typeof loader>();

  const defaultChartId = useMemo(() => {
    return charts.find((c) => c.isDefault)?.id || charts[0]?.id || "";
  }, [charts]);

  const [keyword, setKeyword] = useState("");
  const [field, setField] = useState("ANY");
  const [chartId, setChartId] = useState(defaultChartId);
  const [priority, setPriority] = useState("500");
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chartFilter, setChartFilter] = useState("all");

  const filteredKeywordRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keywordRules.filter((rule) => {
      const keywordValue = String(rule.keyword || "").toLowerCase();
      const chartTitle = String(rule.chart.title || "").toLowerCase();
      const fieldValue = String(rule.field || "").toUpperCase();
      const statusValue = rule.enabled ? "enabled" : "disabled";

      if (q && !keywordValue.includes(q) && !chartTitle.includes(q)) return false;
      if (fieldFilter !== "all" && fieldValue !== fieldFilter) return false;
      if (statusFilter !== "all" && statusValue !== statusFilter) return false;
      if (chartFilter !== "all" && rule.chart.title !== chartFilter) return false;
      return true;
    });
  }, [keywordRules, search, fieldFilter, statusFilter, chartFilter]);

  const chartOptions = useMemo(
    () =>
      Array.from(new Set(keywordRules.map((rule) => rule.chart.title)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [keywordRules],
  );

  return (
    <s-page heading="Keyword rules">
      <s-section>
        <s-paragraph>
          <strong>Shop:</strong> {shopDomain}
        </s-paragraph>
        <s-paragraph>
          Manual rules still win first. These keyword rules are used only as fallback.
        </s-paragraph>
      </s-section>

      <s-section heading="How Keyword Rules Work">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <InfoCard
            title="1. Use these as fallback"
            text="Keyword rules run only after direct assignments, so they are best for broad catalog matching."
          />
          <InfoCard
            title="2. Choose the right field"
            text="Match against title, handle, product type, vendor, tags, or any field depending on how your catalog is structured."
          />
          <InfoCard
            title="3. Keep keywords specific"
            text="Specific keywords and lower priority numbers help avoid noisy matches when multiple products share similar wording."
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

      <s-section heading="Create keyword rule">
        {charts.length === 0 ? (
          <s-banner tone="critical">
            No size charts found. Create or seed a size chart first.
          </s-banner>
        ) : (
          <Form method="post">
            <input type="hidden" name="intent" value="create" />

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                alignItems: "end",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Keyword</span>
                <input
                  name="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.currentTarget.value)}
                  placeholder="dress"
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #d9d9d9",
                    padding: "0 12px",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Match field</span>
                <select
                  name="field"
                  value={field}
                  onChange={(e) => setField(e.currentTarget.value)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #d9d9d9",
                    padding: "0 12px",
                  }}
                >
                  <option value="ANY">Any field</option>
                  <option value="TITLE">Title</option>
                  <option value="HANDLE">Handle</option>
                  <option value="TYPE">Product type</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="TAG">Tag</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Size chart</span>
                <select
                  name="chartId"
                  value={chartId}
                  onChange={(e) => setChartId(e.currentTarget.value)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #d9d9d9",
                    padding: "0 12px",
                  }}
                >
                  {charts.map((chart) => (
                    <option key={chart.id} value={chart.id}>
                      {chart.title}{chart.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Priority</span>
                <input
                  name="priority"
                  type="number"
                  min="1"
                  step="1"
                  value={priority}
                  onChange={(e) => setPriority(e.currentTarget.value)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #d9d9d9",
                    padding: "0 12px",
                  }}
                />
              </label>
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                type="submit"
                style={{
                  height: 42,
                  padding: "0 18px",
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save keyword rule
              </button>
            </div>
          </Form>
        )}
      </s-section>

      <s-section heading="Existing keyword rules">
        {keywordRules.length === 0 ? (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: "1px solid #e7e7e7",
              background: "#fafafa",
            }}
          >
            <s-paragraph>No keyword rules yet.</s-paragraph>
            <s-paragraph>
              Create a keyword rule only if you want a fallback match when direct assignments do not
              apply.
            </s-paragraph>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid #e7e7e7",
                background: "#fafafa",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 1.2fr) repeat(3, minmax(160px, .8fr))",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Search keyword rules
                  </label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    placeholder="Search keyword or chart"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Field
                  </label>
                  <select value={fieldFilter} onChange={(e) => setFieldFilter(e.currentTarget.value)} style={inputStyle}>
                    <option value="all">All fields</option>
                    <option value="ANY">Any field</option>
                    <option value="TITLE">Title</option>
                    <option value="HANDLE">Handle</option>
                    <option value="TYPE">Product type</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="TAG">Tag</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Status
                  </label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.currentTarget.value)} style={inputStyle}>
                    <option value="all">All statuses</option>
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Chart
                  </label>
                  <select value={chartFilter} onChange={(e) => setChartFilter(e.currentTarget.value)} style={inputStyle}>
                    <option value="all">All charts</option>
                    {chartOptions.map((option) => (
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
                  Showing {filteredKeywordRules.length} of {keywordRules.length} keyword rule(s)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFieldFilter("all");
                    setStatusFilter("all");
                    setChartFilter("all");
                  }}
                  style={secondaryBtnStyle}
                >
                  Reset filters
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
            {filteredKeywordRules.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  border: "1px solid #eee",
                  background: "#fafafa",
                }}
              >
                No keyword rules match the selected filters.
              </div>
            ) : (
              filteredKeywordRules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  border: "1px solid #e9e9e9",
                  borderRadius: 14,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "1.1fr .8fr .9fr .6fr auto auto",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{rule.keyword}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Field: {rule.field}</div>
                  </div>

                  <div style={{ fontSize: 13 }}>
                    <strong>Chart:</strong> {rule.chart.title}
                  </div>

                  <div style={{ fontSize: 13 }}>
                    <strong>Priority:</strong> {rule.priority}
                  </div>

                  <div style={{ fontSize: 13 }}>
                    <strong>Status:</strong> {rule.enabled ? "Enabled" : "Disabled"}
                  </div>

                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={rule.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={rule.enabled ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      style={{
                        height: 38,
                        padding: "0 14px",
                        borderRadius: 10,
                        border: "1px solid #d0d0d0",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {rule.enabled ? "Disable" : "Enable"}
                    </button>
                  </Form>

                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={rule.id} />
                    <button
                      type="submit"
                      style={{
                        height: 38,
                        padding: "0 14px",
                        borderRadius: 10,
                        border: "1px solid #e24a4a",
                        background: "#fff5f5",
                        color: "#b42318",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </Form>
                </div>
              </div>
              ))
            )}
            </div>
          </>
        )}
      </s-section>
    </s-page>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: "1px solid #e7e7e7",
        background: "white",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.76, marginTop: 8, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

const inputStyle = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #d9d9d9",
  padding: "0 12px",
  width: "100%",
} as const;

const secondaryBtnStyle = {
  height: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d0d0d0",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
} as const;
