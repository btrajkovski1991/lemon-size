import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
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
  await authenticate.admin(request);

  const shopDomain = await requireShopFromDb();
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
  await authenticate.admin(request);

  const shopDomain = await requireShopFromDb();
  const shopRow = await getOrCreateShopRow(shopDomain);

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "create") {
    const keyword = String(form.get("keyword") || "").trim();
    const field = String(form.get("field") || "ANY").trim().toUpperCase();
    const chartId = String(form.get("chartId") || "").trim();
    const priority = Number(form.get("priority") || 500);

    if (!keyword) throw new Response("Missing keyword", { status: 400 });
    if (!chartId) throw new Response("Missing chartId", { status: 400 });

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

    return { ok: true };
  }

  if (intent === "toggle") {
    const id = String(form.get("id") || "");
    const enabled = String(form.get("enabled") || "false") === "true";

    if (!id) throw new Response("Missing id", { status: 400 });

    await prisma.sizeKeywordRule.updateMany({
      where: { id, shopId: shopRow.id },
      data: { enabled },
    });

    return { ok: true };
  }

  if (intent === "delete") {
    const id = String(form.get("id") || "");
    if (!id) throw new Response("Missing id", { status: 400 });

    await prisma.sizeKeywordRule.deleteMany({
      where: { id, shopId: shopRow.id },
    });

    return { ok: true };
  }

  return { ok: false };
};

export default function KeywordRulesPage() {
  const { shopDomain, charts, keywordRules } = useLoaderData<typeof loader>();

  const defaultChartId = useMemo(() => {
    return charts.find((c) => c.isDefault)?.id || charts[0]?.id || "";
  }, [charts]);

  const [keyword, setKeyword] = useState("");
  const [field, setField] = useState("ANY");
  const [chartId, setChartId] = useState(defaultChartId);
  const [priority, setPriority] = useState("500");

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
          <s-paragraph>No keyword rules yet.</s-paragraph>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {keywordRules.map((rule) => (
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
            ))}
          </div>
        )}
      </s-section>
    </s-page>
  );
}