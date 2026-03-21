import { useMemo, useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { buildRulesIndex, explainChartResolution } from "../utils/size-chart-matching.server";
import { getOrCreateShopRow } from "../utils/shop.server";

type ProductLite = {
  id: string;
  title: string;
  handle: string;
  productType: string;
  vendor: string;
  imageUrl?: string | null;
};

type ActionData =
  | {
      ok: true;
      productId: string;
      preview: {
        productTitle: string;
        productHandle: string;
        chartTitle: string | null;
        chartId: string | null;
        reason: string | null;
        productType: string;
        vendor: string;
        imageUrl?: string | null;
        collections: string[];
        tags: string[];
        candidates: Array<{
          chartId: string;
          chartTitle: string | null;
          kind: "assignment" | "keyword" | "default";
          reason: string;
          lostReason?: string;
          winner: boolean;
          priority: number | null;
        }>;
      };
    }
  | { ok: false; message: string }
  | undefined;

async function fetchPickerProducts(admin: any): Promise<ProductLite[]> {
  const response = await admin.graphql(
    `#graphql
      query LemonSizePreviewProducts {
        products(first: 100, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            handle
            productType
            vendor
            featuredImage {
              url
            }
          }
        }
      }
    `,
  );

  const json = await response.json();
  return (json?.data?.products?.nodes ?? []).map((product: any) => ({
    id: String(product?.id ?? ""),
    title: String(product?.title ?? ""),
    handle: String(product?.handle ?? ""),
    productType: String(product?.productType ?? ""),
    vendor: String(product?.vendor ?? ""),
    imageUrl: product?.featuredImage?.url ? String(product.featuredImage.url) : null,
  }));
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopRow = await getOrCreateShopRow(session.shop);

  const [shop, products] = await Promise.all([
    prisma.shop.findUnique({
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
    }),
    fetchPickerProducts(admin),
  ]);

  return {
    shopDomain: session.shop,
    counts: {
      charts: shop?._count.sizeCharts ?? 0,
      assignments: shop?._count.sizeAssignments ?? 0,
      keywordRules: shop?._count.keywordRules ?? 0,
    },
    products,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent !== "preview-match") {
    return { ok: false, message: "Unknown action." } satisfies ActionData;
  }

  const productId = String(form.get("productId") || "").trim();
  if (!productId) {
    return { ok: false, message: "Choose a product before previewing the match." } satisfies ActionData;
  }

  const shop = await getOrCreateShopRow(session.shop);

  const response = await admin.graphql(
    `#graphql
      query LemonSizePreviewProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          productType
          vendor
          featuredImage {
            url
          }
          tags
          collections(first: 20) {
            nodes {
              title
              handle
            }
          }
        }
      }
    `,
    { variables: { id: productId } },
  );

  const json = await response.json();
  const product = json?.data?.product;

  if (!product) {
    return { ok: false, message: "Product not found." } satisfies ActionData;
  }

  const idx = await buildRulesIndex(shop.id);
  const explanation = explainChartResolution({
    idx,
    productId: String(product.id || "").split("/").pop(),
    productTitle: String(product.title || ""),
    productHandle: String(product.handle || ""),
    productType: String(product.productType || ""),
    productVendor: String(product.vendor || ""),
    productTags: Array.isArray(product.tags) ? product.tags.map((tag: any) => String(tag)) : [],
    collectionHandles: Array.isArray(product.collections?.nodes)
      ? product.collections.nodes.map((collection: any) => String(collection.handle || "")).filter(Boolean)
      : [],
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
    productId,
    preview: {
      productTitle: String(product.title || ""),
      productHandle: String(product.handle || ""),
      chartTitle: winningCandidate ? chartTitleMap.get(winningCandidate.chartId) ?? null : null,
      chartId: winningCandidate?.chartId ?? null,
      reason: explanation.resolution.reason,
      productType: String(product.productType || ""),
      vendor: String(product.vendor || ""),
      imageUrl: product?.featuredImage?.url ? String(product.featuredImage.url) : null,
      collections: Array.isArray(product.collections?.nodes)
        ? product.collections.nodes.map((collection: any) => String(collection.handle || "")).filter(Boolean)
        : [],
      tags: Array.isArray(product.tags) ? product.tags.map((tag: any) => String(tag)) : [],
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

export default function Index() {
  const { shopDomain, counts, products } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();

  const checklist = [
    {
      label: "Create your first size chart",
      done: counts.charts > 0,
      href: "/app/size-charts",
      help: "Add a table with the measurements you want shoppers to see.",
    },
    {
      label: "Assign a chart to products or collections",
      done: counts.assignments > 0,
      href: "/app/assignments",
      help: "Direct assignments decide which chart appears on product pages.",
    },
    {
      label: "Add the Lemon Size block to your product template",
      done: false,
      href: "/app/additional",
      help: "In the theme customizer, open a product template and add the Lemon Size app block there. This is not an App embed.",
    },
    {
      label: "Add fallback keyword rules if needed",
      done: counts.keywordRules > 0,
      href: "/app/keyword-rules",
      help: "Useful when broad catalog matching is easier than direct assignments.",
    },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const defaultProductId = useMemo(() => products[0]?.id || "", [products]);
  const [previewProductId, setPreviewProductId] = useState(actionData?.ok ? actionData.productId : defaultProductId);
  const isPreviewSubmitting =
    navigation.state === "submitting" && navigation.formData?.get("intent") === "preview-match";

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === previewProductId) || null,
    [products, previewProductId],
  );

  return (
    <s-page heading="Lemon Size">
      <s-section heading="Overview">
        <s-paragraph>
          Lemon Size helps merchants show the right size guide on the right product page using
          product rules, collections, vendors, tags, and keyword fallbacks.
        </s-paragraph>
        <s-paragraph>
          <strong>Current shop:</strong> {shopDomain}
        </s-paragraph>
      </s-section>

      <s-section heading="How Home Works">
        <div style={guideGridStyle}>
          <GuideCard
            title="1. Check setup progress"
            text="Use the checklist to confirm your charts, assignments, theme block, and fallback rules are in place."
          />
          <GuideCard
            title="2. Preview a real product"
            text="Pick a product and run the matcher to see which chart will win before you open the storefront."
          />
          <GuideCard
            title="3. Fix conflicts faster"
            text="Review the winning chart, conflict explanation, and product details when a match is not what you expected."
          />
        </div>
      </s-section>

      <s-section heading="Setup Progress">
        <s-paragraph>
          {completedCount} of {checklist.length} setup steps completed.
        </s-paragraph>
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

      <s-section heading="Onboarding Checklist">
        <div style={{ display: "grid", gap: 12 }}>
          {checklist.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                padding: 14,
                border: "1px solid #e7e7e7",
                borderRadius: 12,
                background: item.done ? "#f3fbf5" : "white",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {item.done ? "Complete" : "Pending"}: {item.label}
                </div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>{item.help}</div>
              </div>
              <s-link href={item.href}>{item.done ? "Review" : "Open"}</s-link>
            </div>
          ))}
        </div>
      </s-section>

      <s-section heading="Preview Matched Chart">
        <s-paragraph>
          Test a real product against your current assignment and keyword rules before checking the
          storefront.
        </s-paragraph>

        {products.length === 0 ? (
          <div style={emptyBoxStyle}>No products found yet. Add products in Shopify, then come back to preview matching.</div>
        ) : (
          <div style={panelStyle}>
            <Form method="post">
              <input type="hidden" name="intent" value="preview-match" />

              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Product</span>
                  <select
                    name="productId"
                    value={previewProductId}
                    onChange={(event) => setPreviewProductId(event.currentTarget.value)}
                    style={inputStyle}
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                        {product.vendor ? ` • ${product.vendor}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <button
                    type="submit"
                    style={{ ...primaryBtnStyle, minWidth: 180 }}
                    disabled={isPreviewSubmitting}
                  >
                    {isPreviewSubmitting ? "Checking..." : "Preview match"}
                  </button>
                </div>
              </div>
            </Form>

            {selectedProduct ? (
              <div
                style={{
                  ...selectedProductCardStyle,
                  borderRadius: 18,
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div
                  style={{
                    padding: 6,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #edf2f7",
                    flex: "0 0 auto",
                  }}
                >
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.title}
                      style={selectedProductImageStyle}
                    />
                  ) : (
                    <div style={selectedProductPlaceholderStyle}>Preview</div>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                  <div style={{ fontSize: 12, opacity: 0.64, textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Selected product
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 850, marginTop: 6, lineHeight: 1.25 }}>
                    {selectedProduct.title}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.72, marginTop: 6, lineHeight: 1.45 }}>
                    {selectedProduct.vendor ? `${selectedProduct.vendor} • ` : ""}
                    {selectedProduct.productType || "No product type"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.62, marginTop: 6 }}>
                    /products/{selectedProduct.handle}
                  </div>
                </div>
              </div>
            ) : null}

            {actionData && !actionData.ok ? (
              <div style={errorBoxStyle}>{actionData.message}</div>
            ) : null}

            {actionData?.ok ? (
              <div style={resultBoxStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 220px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                  <div style={previewProductCardStyle}>
                    {actionData.preview.imageUrl ? (
                      <img
                        src={actionData.preview.imageUrl}
                        alt={actionData.preview.productTitle}
                        style={previewProductImageStyle}
                      />
                    ) : (
                      <div style={previewProductPlaceholderStyle}>No image</div>
                    )}
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>Previewing product</div>
                    <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4, lineHeight: 1.35 }}>
                      {actionData.preview.productTitle}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      /products/{actionData.preview.productHandle}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Product</div>
                    <div style={{ fontSize: 18, fontWeight: 850, marginTop: 4 }}>
                      {actionData.preview.productTitle}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                      /products/{actionData.preview.productHandle}
                    </div>

                    <div style={{ marginTop: 16, padding: 14, border: "1px solid #e7e7e7", borderRadius: 14, background: "white" }}>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Matched table</div>
                      <div style={{ fontSize: 18, fontWeight: 850, marginTop: 4 }}>
                        {actionData.preview.chartTitle || "No chart matched"}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>
                        <strong>Why:</strong>{" "}
                        {actionData.preview.reason || "No assignment or default chart is currently available for this product."}
                      </div>
                      {actionData.preview.chartId ? (
                        <div style={{ fontSize: 12, opacity: 0.72, marginTop: 10 }}>
                          <s-link href="/app/size-charts">Open size tables</s-link>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {actionData.preview.candidates.length > 1 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                      Rule conflict explanation
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {actionData.preview.candidates.map((candidate, index) => (
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

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <InfoTile label="Product type" value={actionData.preview.productType || "—"} />
                  <InfoTile label="Vendor" value={actionData.preview.vendor || "—"} />
                  <InfoTile
                    label="Collections"
                    value={actionData.preview.collections.length ? actionData.preview.collections.join(", ") : "—"}
                  />
                  <InfoTile
                    label="Tags"
                    value={actionData.preview.tags.length ? actionData.preview.tags.slice(0, 6).join(", ") : "—"}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </s-section>

      <s-section heading="Recommended Setup">
        <s-unordered-list>
          <s-list-item>Create one or more size charts in Size Charts.</s-list-item>
          <s-list-item>Assign charts to products, collections, vendors, or tags.</s-list-item>
          <s-list-item>Use keyword rules only as a fallback when direct assignments do not match.</s-list-item>
          <s-list-item>Enable the Lemon Size app block on your product template in Online Store.</s-list-item>
          <s-list-item>Preview a few live product pages and confirm the modal loads correctly.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Next Steps">
        <s-paragraph>
          Start in <s-link href="/app/size-charts">Size Charts</s-link>, continue with{" "}
          <s-link href="/app/assignments">Assignments</s-link>, and finish with{" "}
          <s-link href="/app/keyword-rules">Keyword rules</s-link> if your catalog needs broader
          fallback matching.
        </s-paragraph>
        <s-paragraph>
          After setup, open your theme customizer and enable the Lemon Size app block on the product
          template before testing the storefront.
        </s-paragraph>
      </s-section>
    </s-page>
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

function GuideCard({ title, text }: { title: string; text: string }) {
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid #e7e7e7",
        background: "white",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

const panelStyle = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "white",
} as const;

const guideGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
} as const;

const selectedProductCardStyle = {
  marginTop: 12,
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "#fafafa",
  display: "grid",
  gridTemplateColumns: "84px minmax(0, 1fr)",
  gap: 14,
  alignItems: "center",
} as const;

const selectedProductImageStyle = {
  width: 84,
  height: 84,
  borderRadius: 14,
  objectFit: "cover",
  background: "#fff",
  border: "1px solid #e7e7e7",
} as const;

const selectedProductPlaceholderStyle = {
  width: 84,
  height: 84,
  borderRadius: 14,
  border: "1px dashed #d1d5db",
  display: "grid",
  placeItems: "center",
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  color: "#6b7280",
} as const;

const previewProductCardStyle = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "white",
} as const;

const previewProductImageStyle = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 14,
  background: "#f3f4f6",
} as const;

const previewProductPlaceholderStyle = {
  width: "100%",
  aspectRatio: "1 / 1",
  borderRadius: 14,
  border: "1px dashed #d1d5db",
  display: "grid",
  placeItems: "center",
  background: "#fafafa",
  fontSize: 13,
  fontWeight: 700,
  color: "#6b7280",
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

const emptyBoxStyle = {
  padding: 16,
  borderRadius: 14,
  border: "1px solid #e7e7e7",
  background: "#fafafa",
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

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
