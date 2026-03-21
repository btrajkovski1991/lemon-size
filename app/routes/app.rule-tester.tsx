import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { buildRulesIndex, explainChartResolution } from "../utils/size-chart-matching.server";
import { getOrCreateShopRow } from "../utils/shop.server";

type TesterFormState = {
  title: string;
  handle: string;
  productType: string;
  vendor: string;
  tags: string;
  collections: string;
  productId: string;
};

type CandidateResult = {
  chartId: string;
  chartTitle: string | null;
  kind: "assignment" | "keyword" | "default";
  reason: string;
  lostReason?: string;
  winner: boolean;
  priority: number | null;
};

type ActionData =
  | {
      ok: true;
      form: TesterFormState;
      result: {
        chartId: string | null;
        chartTitle: string | null;
        reason: string | null;
        candidates: CandidateResult[];
      };
    }
  | { ok: false; message: string; form: TesterFormState }
  | undefined;

function parseCsvInput(value: string): string[] {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function emptyForm(): TesterFormState {
  return {
    title: "",
    handle: "",
    productType: "",
    vendor: "",
    tags: "",
    collections: "",
    productId: "",
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopRow = await getOrCreateShopRow(session.shop);

  const shop = await prisma.shop.findUnique({
    where: { id: shopRow.id },
    select: {
      _count: {
        select: {
          sizeCharts: true,
          sizeAssignments: true,
          keywordRules: true,
        },
      },
    },
  });

  return {
    shopDomain: session.shop,
    counts: {
      charts: shop?._count.sizeCharts ?? 0,
      assignments: shop?._count.sizeAssignments ?? 0,
      keywordRules: shop?._count.keywordRules ?? 0,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const form: TesterFormState = {
    title: String(formData.get("title") || "").trim(),
    handle: String(formData.get("handle") || "").trim(),
    productType: String(formData.get("productType") || "").trim(),
    vendor: String(formData.get("vendor") || "").trim(),
    tags: String(formData.get("tags") || "").trim(),
    collections: String(formData.get("collections") || "").trim(),
    productId: String(formData.get("productId") || "").trim(),
  };

  if (intent !== "test-rule") {
    return { ok: false, message: "Unknown action.", form } satisfies ActionData;
  }

  if (
    !form.title &&
    !form.handle &&
    !form.productType &&
    !form.vendor &&
    !form.tags &&
    !form.collections &&
    !form.productId
  ) {
    return {
      ok: false,
      message: "Enter at least one product detail before testing the rule matcher.",
      form,
    } satisfies ActionData;
  }

  const shop = await getOrCreateShopRow(session.shop);

  const idx = await buildRulesIndex(shop.id);
  const explanation = explainChartResolution({
    idx,
    productId: form.productId || undefined,
    productTitle: form.title || undefined,
    productHandle: form.handle || undefined,
    productType: form.productType || undefined,
    productVendor: form.vendor || undefined,
    productTags: parseCsvInput(form.tags),
    collectionHandles: parseCsvInput(form.collections),
    includeDefault: true,
  });

  const chartIds = Array.from(new Set(explanation.candidates.map((candidate) => candidate.chartId)));
  const charts = chartIds.length
    ? await prisma.sizeChart.findMany({
        where: { shopId: shop.id, id: { in: chartIds } },
        select: { id: true, title: true },
      })
    : [];
  const chartTitleMap = new Map(charts.map((chart) => [chart.id, chart.title]));
  const winningCandidate = explanation.candidates.find((candidate) => candidate.winner) || null;

  return {
    ok: true,
    form,
    result: {
      chartId: winningCandidate?.chartId ?? null,
      chartTitle: winningCandidate ? chartTitleMap.get(winningCandidate.chartId) ?? null : null,
      reason: explanation.resolution.reason,
      candidates: explanation.candidates.map((candidate) => ({
        chartId: candidate.chartId,
        chartTitle: chartTitleMap.get(candidate.chartId) ?? null,
        kind: candidate.kind,
        reason: candidate.reason,
        lostReason: candidate.lostReason,
        winner: candidate.winner,
        priority: candidate.priority,
      })),
    },
  } satisfies ActionData;
};

export default function RuleTesterPage() {
  const { shopDomain, counts } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const initialForm = actionData?.form ?? emptyForm();

  const [form, setForm] = useState<TesterFormState>(initialForm);
  const isSubmitting =
    navigation.state === "submitting" && navigation.formData?.get("intent") === "test-rule";

  useEffect(() => {
    if (actionData?.form) {
      setForm(actionData.form);
    }
  }, [actionData]);

  return (
    <s-page heading="Rule Tester">
      <s-section>
        <s-paragraph>
          Simulate a product and see which size chart would match before the product is even live.
        </s-paragraph>
        <s-paragraph>
          <strong>Current shop:</strong> {shopDomain}
        </s-paragraph>
      </s-section>

      <s-section heading="How Rule Tester Works">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <InfoCard
            title="1. Simulate product data"
            text="Enter the same kind of details Shopify products use: title, handle, product type, vendor, tags, collections, and optional product ID."
          />
          <InfoCard
            title="2. Run the real matcher"
            text="The tester uses the same assignment and keyword resolution logic as the storefront and preview tools."
          />
          <InfoCard
            title="3. Review the winner"
            text="See which chart wins, why it wins, and what other rules also matched but lost so you can fix conflicts faster."
          />
        </div>
      </s-section>

      <s-section heading="Current Rule Setup">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <StatCard label="Size charts" value={counts.charts} />
          <StatCard label="Assignments" value={counts.assignments} />
          <StatCard label="Keyword rules" value={counts.keywordRules} />
        </div>
      </s-section>

      <s-section heading="Test Matcher">
        <div style={panelStyle}>
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 14,
              border: "1px solid #e7e7e7",
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>Best use case</div>
            <div style={{ fontSize: 13, opacity: 0.76, lineHeight: 1.5, marginTop: 8 }}>
              Use this page before creating a real product or when you want to test how a new keyword,
              collection, vendor, or product type would resolve inside Lemon Size.
            </div>
          </div>

          <Form method="post">
            <input type="hidden" name="intent" value="test-rule" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <Field label="Product title">
                <input
                  name="title"
                  value={form.title}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, title: value }));
                  }}
                  placeholder="Oversized Summer Dress"
                  style={inputStyle}
                />
              </Field>

              <Field label="Product handle">
                <input
                  name="handle"
                  value={form.handle}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, handle: value }));
                  }}
                  placeholder="oversized-summer-dress"
                  style={inputStyle}
                />
              </Field>

              <Field label="Product type">
                <input
                  name="productType"
                  value={form.productType}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, productType: value }));
                  }}
                  placeholder="Dress"
                  style={inputStyle}
                />
              </Field>

              <Field label="Vendor">
                <input
                  name="vendor"
                  value={form.vendor}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, vendor: value }));
                  }}
                  placeholder="Lemon Studio"
                  style={inputStyle}
                />
              </Field>

              <Field label="Tags">
                <input
                  name="tags"
                  value={form.tags}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, tags: value }));
                  }}
                  placeholder="summer, oversized, cotton"
                  style={inputStyle}
                />
              </Field>

              <Field label="Collections">
                <input
                  name="collections"
                  value={form.collections}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, collections: value }));
                  }}
                  placeholder="dresses, summer-collection"
                  style={inputStyle}
                />
              </Field>

              <Field label="Product numeric ID">
                <input
                  name="productId"
                  value={form.productId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, productId: value }));
                  }}
                  placeholder="1234567890"
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ fontSize: 12, opacity: 0.72, marginTop: 10, lineHeight: 1.45 }}>
              Tags and collections should be comma-separated. Product numeric ID is optional and is
              only needed when you want to test a direct product assignment exactly.
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="submit" style={primaryBtnStyle} disabled={isSubmitting}>
                {isSubmitting ? "Testing..." : "Run rule test"}
              </button>
            </div>
          </Form>

          {actionData && !actionData.ok ? <div style={errorBoxStyle}>{actionData.message}</div> : null}

          {actionData?.ok ? (
            <div style={resultBoxStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Matched table</div>
                  <div style={{ fontSize: 18, fontWeight: 850, marginTop: 4 }}>
                    {actionData.result.chartTitle || "No chart matched"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Why</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, lineHeight: 1.45 }}>
                    {actionData.result.reason || "No matching rule or default chart was found."}
                  </div>
                </div>
              </div>

              {actionData.result.candidates.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                    Candidate order
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {actionData.result.candidates.map((candidate, index) => (
                      <div
                        key={`${candidate.kind}-${candidate.chartId}-${index}`}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          border: candidate.winner ? "1px solid #b7e1c0" : "1px solid #e7e7e7",
                          background: candidate.winner ? "#f3fbf5" : "white",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 800 }}>
                            {candidate.winner ? "Winner" : "Also matched"}:{" "}
                            {candidate.chartTitle || "Untitled chart"}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.72 }}>
                            {candidate.kind === "default"
                              ? "Default chart"
                              : candidate.kind === "keyword"
                                ? `Keyword rule${candidate.priority != null ? ` • Priority ${candidate.priority}` : ""}`
                                : `Assignment${candidate.priority != null ? ` • Priority ${candidate.priority}` : ""}`}
                          </div>
                        </div>

                        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
                          {candidate.reason}
                        </div>

                        {!candidate.winner && candidate.lostReason ? (
                          <div style={{ fontSize: 12, opacity: 0.74, marginTop: 6, lineHeight: 1.4 }}>
                            {candidate.lostReason}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </s-section>
    </s-page>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e7e7e7",
        borderRadius: 12,
        background: "white",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
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

const panelStyle = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "white",
} as const;

const resultBoxStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  border: "1px solid #dfe3e8",
  background: "#fafafa",
} as const;

const errorBoxStyle = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #ef9a9a",
  background: "#fff5f5",
  color: "#222",
  fontSize: 14,
  fontWeight: 600,
} as const;

const inputStyle = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #d9d9d9",
  padding: "0 12px",
  background: "#fff",
} as const;

const primaryBtnStyle = {
  height: 44,
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;
