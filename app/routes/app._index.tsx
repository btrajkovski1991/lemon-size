import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shop: session.shop },
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

export default function Index() {
  const { shopDomain, counts } = useLoaderData<typeof loader>();
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
      label: "Enable the Lemon Size app block in your theme",
      done: false,
      href: "/app/additional",
      help: "Turn on the app block on your product template in the theme customizer.",
    },
    {
      label: "Add fallback keyword rules if needed",
      done: counts.keywordRules > 0,
      href: "/app/keyword-rules",
      help: "Useful when broad catalog matching is easier than direct assignments.",
    },
  ];
  const completedCount = checklist.filter((item) => item.done).length;

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
          <div
            style={{
              padding: 16,
              border: "1px solid #e7e7e7",
              borderRadius: 12,
              background: "white",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Size charts</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{counts.charts}</div>
          </div>

          <div
            style={{
              padding: 16,
              border: "1px solid #e7e7e7",
              borderRadius: 12,
              background: "white",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Assignments</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{counts.assignments}</div>
          </div>

          <div
            style={{
              padding: 16,
              border: "1px solid #e7e7e7",
              borderRadius: 12,
              background: "white",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Keyword rules</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{counts.keywordRules}</div>
          </div>
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

      <s-section heading="Recommended Setup">
        <s-unordered-list>
          <s-list-item>Create one or more size charts in Size Charts.</s-list-item>
          <s-list-item>Assign charts to products, collections, vendors, or tags.</s-list-item>
          <s-list-item>Use keyword rules only as a fallback when direct rules do not match.</s-list-item>
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

      <s-section slot="aside" heading="Need help?">
        <s-paragraph>
          Open the <s-link href="/app/additional">Help</s-link> page for theme setup notes,
          troubleshooting, and App Store readiness guidance.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
