import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type Totals = {
  totalViews: number;
  uniqueProducts: number;
  uniqueCharts: number;
};

type DailyPoint = {
  label: string;
  count: number;
};

type TopChart = {
  chartId: string | null;
  chartTitle: string;
  views: number;
};

type TopProduct = {
  productLabel: string;
  productHandle: string | null;
  views: number;
};

function daysAgo(count: number) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDayLabel(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function coerceNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function isMissingAnalyticsTable(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as any).code) : "";
  return code === "42P01";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await prisma.shop.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  const since14 = daysAgo(13);
  const since30 = daysAgo(29);

  try {
    const [totalsRows, topCharts, topProducts, dailyRows] = await Promise.all([
      prisma.$queryRaw<Array<Totals>>`
        SELECT
          COUNT(*)::int AS "totalViews",
          COUNT(DISTINCT COALESCE(NULLIF("productHandle", ''), NULLIF("productId", '')))::int AS "uniqueProducts",
          COUNT(DISTINCT "chartId")::int AS "uniqueCharts"
        FROM "SizeGuideViewEvent"
        WHERE "shopId" = ${shop.id}
          AND "createdAt" >= ${since30}
      `,
      prisma.$queryRaw<Array<TopChart>>`
        SELECT
          ev."chartId" AS "chartId",
          COALESCE(sc."title", 'Deleted size table') AS "chartTitle",
          COUNT(*)::int AS "views"
        FROM "SizeGuideViewEvent" ev
        LEFT JOIN "SizeChart" sc ON sc."id" = ev."chartId"
        WHERE ev."shopId" = ${shop.id}
          AND ev."createdAt" >= ${since30}
        GROUP BY ev."chartId", sc."title"
        ORDER BY "views" DESC, "chartTitle" ASC
        LIMIT 8
      `,
      prisma.$queryRaw<Array<TopProduct>>`
        SELECT
          COALESCE(NULLIF(ev."productTitle", ''), NULLIF(ev."productHandle", ''), NULLIF(ev."productId", ''), 'Unknown product') AS "productLabel",
          NULLIF(ev."productHandle", '') AS "productHandle",
          COUNT(*)::int AS "views"
        FROM "SizeGuideViewEvent" ev
        WHERE ev."shopId" = ${shop.id}
          AND ev."createdAt" >= ${since30}
        GROUP BY "productLabel", "productHandle"
        ORDER BY "views" DESC, "productLabel" ASC
        LIMIT 8
      `,
      prisma.$queryRaw<Array<{ day: Date; views: number }>>`
        SELECT
          DATE("createdAt") AS "day",
          COUNT(*)::int AS "views"
        FROM "SizeGuideViewEvent"
        WHERE "shopId" = ${shop.id}
          AND "createdAt" >= ${since14}
        GROUP BY DATE("createdAt")
        ORDER BY "day" ASC
      `,
    ]);

    const totals = totalsRows[0] || { totalViews: 0, uniqueProducts: 0, uniqueCharts: 0 };
    const dailyMap = new Map(
      dailyRows.map((row) => [dayKey(new Date(row.day)), coerceNumber(row.views)]),
    );
    const daily: DailyPoint[] = Array.from({ length: 14 }, (_, index) => {
      const date = daysAgo(13 - index);
      const key = dayKey(date);
      return {
        label: formatDayLabel(date),
        count: dailyMap.get(key) || 0,
      };
    });

    return {
      shopDomain: session.shop,
      migrationReady: true,
      totals: {
        totalViews: coerceNumber(totals.totalViews),
        uniqueProducts: coerceNumber(totals.uniqueProducts),
        uniqueCharts: coerceNumber(totals.uniqueCharts),
      },
      daily,
      topCharts: topCharts.map((item) => ({
        chartId: item.chartId,
        chartTitle: item.chartTitle,
        views: coerceNumber(item.views),
      })),
      topProducts: topProducts.map((item) => ({
        productLabel: item.productLabel,
        productHandle: item.productHandle,
        views: coerceNumber(item.views),
      })),
    };
  } catch (error) {
    if (!isMissingAnalyticsTable(error)) throw error;

    return {
      shopDomain: session.shop,
      migrationReady: false,
      totals: { totalViews: 0, uniqueProducts: 0, uniqueCharts: 0 },
      daily: [] as DailyPoint[],
      topCharts: [] as TopChart[],
      topProducts: [] as TopProduct[],
    };
  }
};

export default function AnalyticsPage() {
  const { shopDomain, migrationReady, totals, daily, topCharts, topProducts } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="Analytics">
      <s-section>
        <s-paragraph>
          Understand which size tables shoppers open most often and which products drive the most
          size-guide views.
        </s-paragraph>
        <s-paragraph>
          <strong>Current shop:</strong> {shopDomain}
        </s-paragraph>
      </s-section>

      <s-section heading="How Analytics Works">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <InfoCard
            title="1. Tracks real opens"
            text="A view is recorded when a shopper successfully opens a size guide on the storefront."
          />
          <InfoCard
            title="2. Groups by table and product"
            text="You can see which size tables are consulted most and which products trigger the most size-guide activity."
          />
          <InfoCard
            title="3. Supports marketing decisions"
            text="Use this data to find products where sizing matters most and where better fit guidance can improve conversion."
          />
        </div>
      </s-section>

      {!migrationReady ? (
        <s-section>
          <div style={warningBoxStyle}>
            Analytics storage is not ready yet. Run your Prisma migration first, then reload this
            page.
          </div>
        </s-section>
      ) : null}

      <s-section heading="Last 30 days">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <StatCard label="Guide opens" value={totals.totalViews} />
          <StatCard label="Products viewed" value={totals.uniqueProducts} />
          <StatCard label="Tables opened" value={totals.uniqueCharts} />
        </div>
      </s-section>

      <s-section heading="Recent trend">
        {daily.length === 0 || daily.every((point) => point.count === 0) ? (
          <div style={emptyStateStyle}>
            No size-guide opens have been recorded yet. Open a size guide on the storefront to
            start collecting analytics.
          </div>
        ) : (
          <div style={panelStyle}>
            <BarChart title="Guide opens in the last 14 days" items={daily} />
          </div>
        )}
      </s-section>

      <s-section heading="Top size tables">
        {topCharts.length === 0 ? (
          <div style={emptyStateStyle}>No size-table analytics yet for the last 30 days.</div>
        ) : (
          <div style={panelStyle}>
            <RankList
              items={topCharts.map((item) => ({
                label: item.chartTitle,
                hint: item.chartId ? "Tracked size table" : "Referenced table",
                value: item.views,
              }))}
            />
          </div>
        )}
      </s-section>

      <s-section heading="Top products">
        {topProducts.length === 0 ? (
          <div style={emptyStateStyle}>No product analytics yet for the last 30 days.</div>
        ) : (
          <div style={panelStyle}>
            <RankList
              items={topProducts.map((item) => ({
                label: item.productLabel,
                hint: item.productHandle ? `/products/${item.productHandle}` : "Tracked product",
                value: item.views,
              }))}
            />
          </div>
        )}
      </s-section>
    </s-page>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.76, marginTop: 8, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{value}</div>
    </div>
  );
}

function BarChart({ title, items }: { title: string; items: DailyPoint[] }) {
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "grid",
              gridTemplateColumns: "72px minmax(0, 1fr) 48px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#5b6472" }}>{item.label}</div>
            <div style={{ height: 12, borderRadius: 999, background: "#eef2f6", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.max((item.count / maxValue) * 100, item.count > 0 ? 8 : 0)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #89d49b 0%, #3aa655 100%)",
                }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankList({
  items,
}: {
  items: Array<{ label: string; hint: string; value: number }>;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <div key={`${item.label}-${item.hint}`} style={cardStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 72px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>{item.hint}</div>
              <div style={{ height: 8, marginTop: 10, borderRadius: 999, background: "#eef2f6", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #b0d5ff 0%, #0b63ff 100%)",
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, textAlign: "right" }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const cardStyle = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "white",
} as const;

const panelStyle = {
  padding: 18,
  borderRadius: 18,
  border: "1px solid #e7e7e7",
  background: "white",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
} as const;

const emptyStateStyle = {
  padding: 20,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "#fafafa",
} as const;

const warningBoxStyle = {
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid #f0d6a7",
  background: "#fff8eb",
  color: "#6a4d12",
  fontSize: 14,
  fontWeight: 700,
} as const;

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
