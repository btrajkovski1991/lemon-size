import { Prisma } from "@prisma/client";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { InfoCard } from "../components/admin-ui";
import { getOrCreateShopRow } from "../utils/shop.server";

type RangeOption = 7 | 14 | 30 | 90;

type Totals = {
  totalViews: number;
  uniqueProducts: number;
  uniqueCharts: number;
};

type DailyPoint = {
  label: string;
  count: number;
};

type HourlyPoint = {
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

type RecentEvent = {
  createdAt: Date;
  chartTitle: string;
  productLabel: string;
  productHandle: string | null;
};

type Insight = {
  title: string;
  value: string;
  text: string;
};

type ComparisonStats = {
  currentViews: number;
  previousViews: number;
  delta: number;
  deltaLabel: string;
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

function formatDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return { delta: 0, deltaLabel: "No change vs previous period" };
  }

  if (previous === 0) {
    return { delta: 100, deltaLabel: `Up from 0 in the previous period` };
  }

  const delta = Math.round(((current - previous) / previous) * 100);
  const sign = delta > 0 ? "+" : "";
  return {
    delta,
    deltaLabel: `${sign}${delta}% vs previous ${previous > 0 ? "period" : "baseline"}`,
  };
}

function percent(part: number, whole: number) {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function parseRange(value: string | null): RangeOption {
  const num = Number(value);
  if (num === 7 || num === 14 || num === 30 || num === 90) return num;
  return 30;
}

function parsePage(value: string | null) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return 1;
  return Math.floor(num);
}

function parseDateTimeInput(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isMissingAnalyticsTable(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error ? String((error as any).code) : "";
  return code === "42P01";
}

function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  if (/[",\n]/.test(raw)) return `"${raw.replaceAll('"', '""')}"`;
  return raw;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "type,label,hint,views\n";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const rangeDays = parseRange(url.searchParams.get("range"));
  const selectedChartId = String(url.searchParams.get("chartId") || "").trim() || null;
  const recentEventsPage = parsePage(url.searchParams.get("eventsPage"));
  const recentEventsFromInput = String(url.searchParams.get("eventsFrom") || "").trim();
  const recentEventsToInput = String(url.searchParams.get("eventsTo") || "").trim();
  const recentEventsFrom = parseDateTimeInput(recentEventsFromInput);
  const recentEventsTo = parseDateTimeInput(recentEventsToInput);
  const format = String(url.searchParams.get("format") || "").trim().toLowerCase();
  const recentEventsPageSize = 10;
  const recentEventsOffset = (recentEventsPage - 1) * recentEventsPageSize;

  const shop = await getOrCreateShopRow(session.shop);

  const since = daysAgo(rangeDays - 1);
  const previousSince = daysAgo(rangeDays * 2 - 1);
  const previousUntil = daysAgo(rangeDays);
  const chartFilterSql = selectedChartId
    ? Prisma.sql`AND ev."chartId" = ${selectedChartId}`
    : Prisma.empty;
  const recentEventsFromSql = recentEventsFrom
    ? Prisma.sql`AND ev."createdAt" >= ${recentEventsFrom}`
    : Prisma.empty;
  const recentEventsToSql = recentEventsTo
    ? Prisma.sql`AND ev."createdAt" <= ${recentEventsTo}`
    : Prisma.empty;

  try {
    const [
      chartOptions,
      totalsRows,
      previousTotalsRows,
      topCharts,
      topProducts,
      dailyRows,
      selectedChartRows,
      weekdayRows,
      hourlyRows,
      recentEventsCountRows,
      recentEventsRows,
    ] =
      await Promise.all([
        prisma.sizeChart.findMany({
          where: { shopId: shop.id },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        }),
        prisma.$queryRaw<Array<Totals>>`
          SELECT
            COUNT(*)::int AS "totalViews",
            COUNT(DISTINCT COALESCE(NULLIF(ev."productHandle", ''), NULLIF(ev."productId", '')))::int AS "uniqueProducts",
            COUNT(DISTINCT ev."chartId")::int AS "uniqueCharts"
          FROM "SizeGuideViewEvent" ev
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
        `,
        prisma.$queryRaw<Array<Totals>>`
          SELECT
            COUNT(*)::int AS "totalViews",
            COUNT(DISTINCT COALESCE(NULLIF(ev."productHandle", ''), NULLIF(ev."productId", '')))::int AS "uniqueProducts",
            COUNT(DISTINCT ev."chartId")::int AS "uniqueCharts"
          FROM "SizeGuideViewEvent" ev
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${previousSince}
            AND ev."createdAt" < ${previousUntil}
            ${chartFilterSql}
        `,
        prisma.$queryRaw<Array<TopChart>>`
          SELECT
            ev."chartId" AS "chartId",
            COALESCE(sc."title", 'Deleted size table') AS "chartTitle",
            COUNT(*)::int AS "views"
          FROM "SizeGuideViewEvent" ev
          LEFT JOIN "SizeChart" sc ON sc."id" = ev."chartId"
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
          GROUP BY ev."chartId", sc."title"
          ORDER BY "views" DESC, "chartTitle" ASC
          LIMIT 10
        `,
        prisma.$queryRaw<Array<TopProduct>>`
          SELECT
            COALESCE(NULLIF(ev."productTitle", ''), NULLIF(ev."productHandle", ''), NULLIF(ev."productId", ''), 'Unknown product') AS "productLabel",
            NULLIF(ev."productHandle", '') AS "productHandle",
            COUNT(*)::int AS "views"
          FROM "SizeGuideViewEvent" ev
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
          GROUP BY "productLabel", "productHandle"
          ORDER BY "views" DESC, "productLabel" ASC
          LIMIT 10
        `,
        prisma.$queryRaw<Array<{ day: Date; views: number }>>`
          SELECT
            DATE(ev."createdAt") AS "day",
            COUNT(*)::int AS "views"
          FROM "SizeGuideViewEvent" ev
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
          GROUP BY DATE(ev."createdAt")
          ORDER BY "day" ASC
        `,
        selectedChartId
          ? prisma.$queryRaw<Array<{ chartTitle: string; views: number }>>`
              SELECT
                COALESCE(sc."title", 'Deleted size table') AS "chartTitle",
                COUNT(*)::int AS "views"
              FROM "SizeGuideViewEvent" ev
              LEFT JOIN "SizeChart" sc ON sc."id" = ev."chartId"
              WHERE ev."shopId" = ${shop.id}
                AND ev."createdAt" >= ${since}
                AND ev."chartId" = ${selectedChartId}
              GROUP BY sc."title"
              LIMIT 1
            `
          : Promise.resolve([] as Array<{ chartTitle: string; views: number }>),
        prisma.$queryRaw<Array<{ weekday: number; views: number }>>`
          SELECT
            EXTRACT(DOW FROM ev."createdAt")::int AS "weekday",
            COUNT(*)::int AS "views"
          FROM "SizeGuideViewEvent" ev
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
          GROUP BY EXTRACT(DOW FROM ev."createdAt")
          ORDER BY "views" DESC, "weekday" ASC
        `,
        prisma.$queryRaw<Array<{ hour: number; views: number }>>`
          SELECT
            EXTRACT(HOUR FROM ev."createdAt")::int AS "hour",
            COUNT(*)::int AS "views"
          FROM "SizeGuideViewEvent" ev
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
          GROUP BY EXTRACT(HOUR FROM ev."createdAt")
          ORDER BY "views" DESC, "hour" ASC
        `,
        prisma.$queryRaw<Array<{ count: number }>>`
          SELECT
            COUNT(*)::int AS "count"
          FROM "SizeGuideViewEvent" ev
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
            ${recentEventsFromSql}
            ${recentEventsToSql}
        `,
        prisma.$queryRaw<Array<RecentEvent>>`
          SELECT
            ev."createdAt" AS "createdAt",
            COALESCE(sc."title", 'Deleted size table') AS "chartTitle",
            COALESCE(NULLIF(ev."productTitle", ''), NULLIF(ev."productHandle", ''), NULLIF(ev."productId", ''), 'Unknown product') AS "productLabel",
            NULLIF(ev."productHandle", '') AS "productHandle"
          FROM "SizeGuideViewEvent" ev
          LEFT JOIN "SizeChart" sc ON sc."id" = ev."chartId"
          WHERE ev."shopId" = ${shop.id}
            AND ev."createdAt" >= ${since}
            ${chartFilterSql}
            ${recentEventsFromSql}
            ${recentEventsToSql}
          ORDER BY ev."createdAt" DESC
          LIMIT ${recentEventsPageSize}
          OFFSET ${recentEventsOffset}
        `,
      ]);

    const totals = totalsRows[0] || { totalViews: 0, uniqueProducts: 0, uniqueCharts: 0 };
    const previousTotals = previousTotalsRows[0] || {
      totalViews: 0,
      uniqueProducts: 0,
      uniqueCharts: 0,
    };
    const totalViews = coerceNumber(totals.totalViews);
    const previousViews = coerceNumber(previousTotals.totalViews);
    const topChartViews = coerceNumber(topCharts[0]?.views);
    const topProductViews = coerceNumber(topProducts[0]?.views);
    const comparison = {
      currentViews: totalViews,
      previousViews,
      ...formatDelta(totalViews, previousViews),
    } satisfies ComparisonStats;
    const dailyMap = new Map(
      dailyRows.map((row) => [dayKey(new Date(row.day)), coerceNumber(row.views)]),
    );
    const daily: DailyPoint[] = Array.from({ length: rangeDays }, (_, index) => {
      const date = daysAgo(rangeDays - 1 - index);
      const key = dayKey(date);
      return {
        label: formatDayLabel(date),
        count: dailyMap.get(key) || 0,
      };
    });
    const hourlyMap = new Map(
      hourlyRows.map((row) => [coerceNumber(row.hour), coerceNumber(row.views)]),
    );
    const hourly: HourlyPoint[] = Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      count: hourlyMap.get(hour) || 0,
    }));
    const bestWeekdayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bestWeekday = weekdayRows[0]
      ? {
          label: bestWeekdayMap[coerceNumber(weekdayRows[0].weekday)] || "Unknown day",
          views: coerceNumber(weekdayRows[0].views),
        }
      : null;
    const bestHour = hourlyRows[0]
      ? {
          label: `${String(coerceNumber(hourlyRows[0].hour)).padStart(2, "0")}:00`,
          views: coerceNumber(hourlyRows[0].views),
        }
      : null;
    const bestCombined = bestWeekday && bestHour ? `${bestWeekday.label} around ${bestHour.label}` : null;

    const insights: Insight[] = [
      {
        title: "Most-opened size table",
        value: topCharts[0]?.chartTitle || "No data yet",
        text: topCharts[0]
          ? `${topCharts[0].views} opens, or ${percent(topChartViews, totalViews)} of tracked views in this range.`
          : "Open a size guide on the storefront to start collecting data.",
      },
      {
        title: "Highest size-guide usage product",
        value: topProducts[0]?.productLabel || "No data yet",
        text: topProducts[0]
          ? `${topProducts[0].views} opens, or ${percent(topProductViews, totalViews)} of tracked views in this range.`
          : "No products have size-guide views yet in this range.",
      },
      {
        title: "Period comparison",
        value: comparison.deltaLabel,
        text: totalViews
          ? `${comparison.currentViews} guide opens in this period versus ${comparison.previousViews} in the previous ${rangeDays}-day period.`
          : "When shoppers open guides, this page will compare your current period against the previous one.",
      },
      {
        title: "Best day for size-guide usage",
        value: bestWeekday?.label || "No data yet",
        text: bestWeekday
          ? `${bestWeekday.views} opens happened on ${bestWeekday.label}, your strongest day in this range.`
          : "No weekday pattern is available yet for this range.",
      },
      {
        title: "Best hour of day",
        value: bestHour?.label || "No data yet",
        text: bestHour
          ? `${bestHour.views} opens happened around ${bestHour.label}, your strongest hour in this range.`
          : "No hourly pattern is available yet for this range.",
      },
      {
        title: "Best weekday + hour",
        value: bestCombined || "No data yet",
        text: bestCombined
          ? `Size-guide engagement is strongest on ${bestCombined} in this date range.`
          : "Not enough data yet to combine weekday and hour guidance.",
      },
      {
        title: "Sizing concentration",
        value: totalViews ? `${Math.max(topChartViews, topProductViews)} top interactions` : "No data yet",
        text: totalViews
          ? `Use the top table and product lists below to see where fit guidance matters most in your catalog.`
          : "When shoppers open guides, this page will show which products need the most fit support.",
      },
    ];

    const selectedChartTitle =
      selectedChartRows[0]?.chartTitle ||
      chartOptions.find((chart) => chart.id === selectedChartId)?.title ||
      null;
    const recentEventsTotal = coerceNumber(recentEventsCountRows[0]?.count);
    const recentEventsTotalPages = Math.max(1, Math.ceil(recentEventsTotal / recentEventsPageSize));

    if (format === "csv") {
      const csv = toCsv([
        ...topCharts.map((item) => ({
          type: "chart",
          label: item.chartTitle,
          hint: item.chartId || "",
          views: coerceNumber(item.views),
        })),
        ...topProducts.map((item) => ({
          type: "product",
          label: item.productLabel,
          hint: item.productHandle || "",
          views: coerceNumber(item.views),
        })),
      ]);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lemon-size-analytics-${rangeDays}d.csv"`,
        },
      });
    }

    return {
      shopDomain: session.shop,
      migrationReady: true,
      rangeDays,
      selectedChartId,
      selectedChartTitle,
      recentEventsPage,
      recentEventsPageSize,
      recentEventsTotal,
      recentEventsTotalPages,
      recentEventsFromInput,
      recentEventsToInput,
      chartOptions,
      comparison,
      totals: {
        totalViews,
        uniqueProducts: coerceNumber(totals.uniqueProducts),
        uniqueCharts: coerceNumber(totals.uniqueCharts),
      },
      daily,
      hourly,
      insights,
      recentEvents: recentEventsRows.map((row) => ({
        createdAt: new Date(row.createdAt).toISOString(),
        chartTitle: row.chartTitle,
        productLabel: row.productLabel,
        productHandle: row.productHandle,
      })),
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
      rangeDays,
      selectedChartId,
      selectedChartTitle: null,
      recentEventsPage,
      recentEventsPageSize,
      recentEventsTotal: 0,
      recentEventsTotalPages: 1,
      recentEventsFromInput,
      recentEventsToInput,
      chartOptions: [] as Array<{ id: string; title: string }>,
      comparison: {
        currentViews: 0,
        previousViews: 0,
        delta: 0,
        deltaLabel: "No change vs previous period",
      } satisfies ComparisonStats,
      totals: { totalViews: 0, uniqueProducts: 0, uniqueCharts: 0 },
      daily: [] as DailyPoint[],
      hourly: [] as HourlyPoint[],
      insights: [] as Insight[],
      recentEvents: [] as Array<{
        createdAt: string;
        chartTitle: string;
        productLabel: string;
        productHandle: string | null;
      }>,
      topCharts: [] as TopChart[],
      topProducts: [] as TopProduct[],
    };
  }
};

export default function AnalyticsPage() {
  const location = useLocation();
  const {
    shopDomain,
    migrationReady,
    rangeDays,
    selectedChartId,
    selectedChartTitle,
    recentEventsPage,
    recentEventsPageSize,
    recentEventsTotal,
    recentEventsTotalPages,
    recentEventsFromInput,
    recentEventsToInput,
    chartOptions,
    comparison,
    totals,
    daily,
    hourly,
    insights,
    recentEvents,
    topCharts,
    topProducts,
  } = useLoaderData<typeof loader>();
  const recentEventsOffset = (recentEventsPage - 1) * recentEventsPageSize;
  const preservedParams = Array.from(new URLSearchParams(location.search).entries()).filter(
    ([key]) => !["range", "chartId", "format", "eventsPage", "eventsFrom", "eventsTo"].includes(key),
  );

  const buildAnalyticsHref = (next: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams();

    for (const [key, value] of preservedParams) {
      params.append(key, value);
    }

    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const query = params.toString();
    return `/app/analytics${query ? `?${query}` : ""}`;
  };

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
            title="2. Filter by time and table"
            text="Use the date range and size-table filter to see broad trends or inspect one table in more detail."
          />
          <InfoCard
            title="3. Export for reporting"
            text="Export chart and product rankings as CSV when you want to share the data or use it in external reports."
          />
        </div>
      </s-section>

      <s-section heading="Filters">
        <div style={panelStyle}>
          <form method="get">
            {preservedParams.map(([key, value], index) => (
              <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
            ))}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                alignItems: "end",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={fieldLabelStyle}>Date range</span>
                <select name="range" defaultValue={String(rangeDays)} style={inputStyle}>
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={fieldLabelStyle}>Size table</span>
                <select name="chartId" defaultValue={selectedChartId || ""} style={inputStyle}>
                  <option value="">All size tables</option>
                  {chartOptions.map((chart) => (
                    <option key={chart.id} value={chart.id}>
                      {chart.title}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" style={primaryBtnStyle}>
                  Apply filters
                </button>
                <a
                  href={buildAnalyticsHref({
                    range: String(rangeDays),
                    chartId: selectedChartId || null,
                    format: "csv",
                  })}
                  style={secondaryLinkStyle}
                >
                  Export CSV
                </a>
              </div>
            </div>
          </form>
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

      <s-section heading={`Overview for the last ${rangeDays} days`}>
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
          <StatCard
            label="Previous period"
            value={comparison.previousViews}
            sublabel={comparison.deltaLabel}
          />
        </div>
      </s-section>

      <s-section heading="Marketing insights">
        {insights.length === 0 ? (
          <div style={emptyStateStyle}>No insight data yet for this date range.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {insights.map((insight) => (
              <InfoCard
                key={insight.title}
                title={insight.title}
                text={`${insight.value}\n${insight.text}`}
                preserveLineBreaks
              />
            ))}
          </div>
        )}
      </s-section>

      {selectedChartTitle ? (
        <s-section heading="Selected table detail">
          <div style={panelStyle}>
            <div style={{ fontSize: 12, opacity: 0.72, textTransform: "uppercase", letterSpacing: ".04em" }}>
              Current drilldown
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{selectedChartTitle}</div>
            <div style={{ fontSize: 13, opacity: 0.74, marginTop: 8, lineHeight: 1.5 }}>
              These metrics and lists are currently filtered to one size table. Clear the table
              filter above to return to your full store view.
            </div>
          </div>
        </s-section>
      ) : null}

      <s-section heading="Recent trend">
        {daily.length === 0 || daily.every((point) => point.count === 0) ? (
          <div style={emptyStateStyle}>
            No size-guide opens have been recorded yet. Open a size guide on the storefront to
            start collecting analytics.
          </div>
        ) : (
          <div style={panelStyle}>
            <BarChart title={`Guide opens in the last ${rangeDays} days`} items={daily} />
          </div>
        )}
      </s-section>

      <s-section heading="Hourly breakdown">
        {hourly.length === 0 || hourly.every((point) => point.count === 0) ? (
          <div style={emptyStateStyle}>
            No hourly size-guide data is available yet for this date range.
          </div>
        ) : (
          <div style={panelStyle}>
            <BarChart title="Guide opens by hour of day" items={hourly} compact />
          </div>
        )}
      </s-section>

      <s-section heading="Recent events">
        {recentEvents.length === 0 ? (
          <div style={emptyStateStyle}>
            No recent size-guide events were tracked in this date range.
          </div>
        ) : (
          <div style={panelStyle}>
            <form method="get" style={{ marginBottom: 16 }}>
              {preservedParams.map(([key, value], index) => (
                <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
              ))}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <input type="hidden" name="range" value={String(rangeDays)} />
                {selectedChartId ? <input type="hidden" name="chartId" value={selectedChartId} /> : null}
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={fieldLabelStyle}>Events from</span>
                  <input
                    type="datetime-local"
                    name="eventsFrom"
                    defaultValue={recentEventsFromInput}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={fieldLabelStyle}>Events to</span>
                  <input
                    type="datetime-local"
                    name="eventsTo"
                    defaultValue={recentEventsToInput}
                    style={inputStyle}
                  />
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="submit" style={primaryBtnStyle}>
                    Filter events
                  </button>
                  <a
                    href={buildAnalyticsHref({
                      range: String(rangeDays),
                      chartId: selectedChartId || null,
                    })}
                    style={secondaryLinkStyle}
                  >
                    Clear event filter
                  </a>
                </div>
              </div>
            </form>
            <div style={{ display: "grid", gap: 10 }}>
              {recentEvents.map((event, index) => (
                <div
                  key={`${event.createdAt}-${event.chartTitle}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: index === recentEvents.length - 1 ? "0" : "1px solid #eef2f6",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#667085",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        marginBottom: 6,
                      }}
                    >
                      #{recentEventsOffset + index + 1}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>
                      {event.productLabel}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                      {event.productHandle ? `/products/${event.productHandle} • ` : ""}
                      {event.chartTitle}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right", whiteSpace: "nowrap" }}>
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            {recentEventsTotal > recentEventsPageSize ? (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.72 }}>
                  Showing page {recentEventsPage} of {recentEventsTotalPages} • {recentEventsTotal} total event(s)
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {recentEventsPage > 1 ? (
                    <a
                      href={buildAnalyticsHref({
                        range: String(rangeDays),
                        chartId: selectedChartId || null,
                        eventsFrom: recentEventsFromInput || null,
                        eventsTo: recentEventsToInput || null,
                        eventsPage: String(recentEventsPage - 1),
                      })}
                      style={secondaryLinkStyle}
                    >
                      Previous
                    </a>
                  ) : null}
                  {recentEventsPage < recentEventsTotalPages ? (
                    <a
                      href={buildAnalyticsHref({
                        range: String(rangeDays),
                        chartId: selectedChartId || null,
                        eventsFrom: recentEventsFromInput || null,
                        eventsTo: recentEventsToInput || null,
                        eventsPage: String(recentEventsPage + 1),
                      })}
                      style={secondaryLinkStyle}
                    >
                      Next
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </s-section>

      <s-section heading="Top size tables">
        {topCharts.length === 0 ? (
          <div style={emptyStateStyle}>No size-table analytics yet for this date range.</div>
        ) : (
          <div style={panelStyle}>
            <RankList
              items={topCharts.map((item) => ({
                label: item.chartTitle,
                hint: item.chartId
                  ? item.chartId === selectedChartId
                    ? "Selected size table"
                    : "Tracked size table"
                  : "Referenced table",
                value: item.views,
                href: item.chartId
                  ? buildAnalyticsHref({
                      range: String(rangeDays),
                      chartId: item.chartId,
                    })
                  : undefined,
              }))}
            />
          </div>
        )}
      </s-section>

      <s-section heading="Top products">
        {topProducts.length === 0 ? (
          <div style={emptyStateStyle}>No product analytics yet for this date range.</div>
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

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel?: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{value}</div>
      {sublabel ? (
        <div style={{ fontSize: 12, opacity: 0.72, marginTop: 8, lineHeight: 1.45 }}>{sublabel}</div>
      ) : null}
    </div>
  );
}

function BarChart({
  title,
  items,
  compact,
}: {
  title: string;
  items: Array<DailyPoint | HourlyPoint>;
  compact?: boolean;
}) {
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "grid", gap: compact ? 8 : 10 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "56px minmax(0, 1fr) 44px" : "72px minmax(0, 1fr) 48px",
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
  items: Array<{ label: string; hint: string; value: number; href?: string }>;
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
                {item.href ? (
                  <s-link href={item.href}>{item.label}</s-link>
                ) : (
                  item.label
                )}
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

const inputStyle = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #d9d9d9",
  padding: "0 12px",
  width: "100%",
} as const;

const fieldLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
} as const;

const primaryBtnStyle = {
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #2e7d32",
  background: "#3aa655",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
} as const;

const secondaryLinkStyle = {
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d0d0d0",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
