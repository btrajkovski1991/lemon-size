import { useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { ChartTitleIcon, InfoCard, ModalShell } from "../components/admin-ui";
import { invalidateShopSizeChartCache } from "../utils/size-chart-cache.server";
import {
  type ChartRowLite,
  type EditorChart,
  type SizeChartLite as ChartLite,
  buildDuplicateTitle,
  buildEditorFromChart,
  emptyEditor,
  normalizeChartColumns,
  normalizeChartRows,
  normalizeSizeChartLite,
  normalizeUnitValue,
  parseTableText,
} from "../utils/size-charts";
import { getOrCreateShopRow } from "../utils/shop.server";

type ActionData =
  | { ok: true; message: string; intent?: "save" | "delete" | "duplicate"; chartId?: string }
  | { ok: false; message: string }
  | undefined;

const GUIDE_IMAGE_PRESETS = [
  {
    label: "Tops",
    value: "/images/size-guides/tops.png",
  },
  {
    label: "Bottoms",
    value: "/images/size-guides/bottoms.png",
  },
  {
    label: "Blazer",
    value: "/images/size-guides/blazer.png",
  },
  {
    label: "Jacket",
    value: "/images/size-guides/jacket.png",
  },
  {
    label: "Dress",
    value: "/images/size-guides/dress.png",
  },
  {
    label: "Bikini",
    value: "/images/size-guides/bikini.png",
  },
  {
    label: "Bra",
    value: "/images/size-guides/bra.png",
  },
  {
    label: "Brief",
    value: "/images/size-guides/brief.png",
  },
  {
    label: "Shoes",
    value: "/images/size-guides/shoes.png",
  },
  {
    label: "Socks",
    value: "/images/size-guides/socks.png",
  },
  {
    label: "Headwear",
    value: "/images/size-guides/headwear.png",
  },
  {
    label: "Ring",
    value: "/images/size-guides/ring.png",
  },
  {
    label: "Bracelet",
    value: "/images/size-guides/bracelet.png",
  },
  {
    label: "Necklace",
    value: "/images/size-guides/necklace.png",
  },
];

const JEWELRY_TABLE_TEMPLATES = [
  {
    key: "ring",
    label: "Ring size",
    build: (): Partial<EditorChart> => ({
      title: "Ring Size",
      unit: "mm",
      guideTitle: "How to measure your ring size",
      guideText:
        "Measure the inside diameter of a ring that already fits, or measure the circumference of your finger with a paper strip and compare it to the chart.",
      guideImage: "/images/size-guides/ring.png",
      showGuideImage: true,
      tips: "For the most precise fit, measure at the end of the day and avoid measuring when fingers are very cold.",
      disclaimer: "If you are between sizes, choose the larger size for comfort.",
      columns: ["RING SIZE", "DIAMETER", "CIRCUMFERENCE"],
      rows: [
        {
          label: "US 5",
          sortOrder: 1,
          values: {
            "RING SIZE": "US 5",
            DIAMETER: "15.7 mm",
            CIRCUMFERENCE: "49.3 mm",
          },
        },
        {
          label: "US 6",
          sortOrder: 2,
          values: {
            "RING SIZE": "US 6",
            DIAMETER: "16.5 mm",
            CIRCUMFERENCE: "51.9 mm",
          },
        },
        {
          label: "US 7",
          sortOrder: 3,
          values: {
            "RING SIZE": "US 7",
            DIAMETER: "17.3 mm",
            CIRCUMFERENCE: "54.4 mm",
          },
        },
      ],
    }),
  },
  {
    key: "necklace",
    label: "Necklace size",
    build: (): Partial<EditorChart> => ({
      title: "Necklace Size",
      unit: "cm",
      guideTitle: "How to measure necklace fit",
      guideText:
        "Measure around the neck where the necklace will sit, then compare that measurement to the necklace length in the chart.",
      guideImage: "/images/size-guides/necklace.png",
      showGuideImage: true,
      tips: "Use chain length as the main fit field. Thickness is helpful as a product detail, but length matters most for sizing.",
      disclaimer: "Neck thickness is usually not the main sizing field unless the style fits closely like a choker.",
      columns: ["STYLE", "NECKLACE LENGTH", "DROP LENGTH", "THICKNESS"],
      rows: [
        {
          label: "Choker",
          sortOrder: 1,
          values: {
            STYLE: "Choker",
            "NECKLACE LENGTH": "35 cm",
            "DROP LENGTH": "0 cm",
            THICKNESS: "2 mm",
          },
        },
        {
          label: "Princess",
          sortOrder: 2,
          values: {
            STYLE: "Princess",
            "NECKLACE LENGTH": "45 cm",
            "DROP LENGTH": "10 cm",
            THICKNESS: "2.5 mm",
          },
        },
        {
          label: "Matinee",
          sortOrder: 3,
          values: {
            STYLE: "Matinee",
            "NECKLACE LENGTH": "55 cm",
            "DROP LENGTH": "20 cm",
            THICKNESS: "3 mm",
          },
        },
      ],
    }),
  },
  {
    key: "bracelet",
    label: "Bracelet size",
    build: (): Partial<EditorChart> => ({
      title: "Bracelet Size",
      unit: "cm",
      guideTitle: "How to measure bracelet fit",
      guideText:
        "Measure the wrist circumference snugly, then choose the bracelet length that gives the fit you want.",
      guideImage: "/images/size-guides/bracelet.png",
      showGuideImage: true,
      tips: "Wrist circumference and bracelet length are the main fit fields. Width is optional for style, and clasp thickness is usually not a sizing field.",
      disclaimer: "Add a little extra room for looser styles or charm bracelets.",
      columns: ["FIT", "WRIST", "BRACELET LENGTH", "WIDTH"],
      rows: [
        {
          label: "Small",
          sortOrder: 1,
          values: {
            FIT: "Small",
            WRIST: "14 cm",
            "BRACELET LENGTH": "16 cm",
            WIDTH: "4 mm",
          },
        },
        {
          label: "Medium",
          sortOrder: 2,
          values: {
            FIT: "Medium",
            WRIST: "16 cm",
            "BRACELET LENGTH": "18 cm",
            WIDTH: "5 mm",
          },
        },
        {
          label: "Large",
          sortOrder: 3,
          values: {
            FIT: "Large",
            WRIST: "18 cm",
            "BRACELET LENGTH": "20 cm",
            WIDTH: "6 mm",
          },
        },
      ],
    }),
  },
];


export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const shopRow = await getOrCreateShopRow(shopDomain);

  const charts = await prisma.sizeChart.findMany({
    where: { shopId: shopRow.id },
    orderBy: [{ isDefault: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      isDefault: true,
      unit: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          assigns: true,
          keywordAssignments: true,
        },
      },
      guideTitle: true,
      guideText: true,
      guideImage: true,
      showGuideImage: true,
      tips: true,
      disclaimer: true,
      columns: true,
      rows: {
        orderBy: [{ sortOrder: "asc" }],
        select: {
          id: true,
          label: true,
          sortOrder: true,
          values: true,
        },
      },
    },
  });

  return { shopDomain, charts };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const shopRow = await getOrCreateShopRow(shopDomain);

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "save") {
    const chartId = String(form.get("chartId") || "").trim() || null;
    const title = String(form.get("title") || "").trim();
    const unitInput = String(form.get("unit") || "").trim();
    const guideTitle = String(form.get("guideTitle") || "").trim();
    const guideText = String(form.get("guideText") || "").trim();
    const guideImage = String(form.get("guideImage") || "").trim();
    const showGuideImage = String(form.get("showGuideImage") || "false") === "true";
    const tips = String(form.get("tips") || "").trim();
    const disclaimer = String(form.get("disclaimer") || "").trim();
    const isDefault = String(form.get("isDefault") || "false") === "true";

    let columns: string[] = [];
    let rows: ChartRowLite[] = [];

    try {
      columns = normalizeChartColumns(JSON.parse(String(form.get("columnsJson") || "[]")));
      rows = normalizeChartRows(JSON.parse(String(form.get("rowsJson") || "[]")), columns);
    } catch (error) {
      return { ok: false, message: "Invalid table payload." } satisfies ActionData;
    }

    if (!title) {
      return { ok: false, message: "Table title is required." } satisfies ActionData;
    }

    const unit = normalizeUnitValue(unitInput);
    if (!unit) {
      return {
        ok: false,
        message: 'Unit must be "cm", "mm", or "in" so storefront conversion works correctly.',
      } satisfies ActionData;
    }

    if (columns.length === 0) {
      return { ok: false, message: "Add at least one column." } satisfies ActionData;
    }

    if (rows.length === 0) {
      return { ok: false, message: "Add at least one row." } satisfies ActionData;
    }

    const duplicateCols = columns.filter((col, i) => columns.indexOf(col) !== i);
    if (duplicateCols.length > 0) {
      return { ok: false, message: "Column names must be unique." } satisfies ActionData;
    }

    for (const row of rows) {
      if (!String(row.label || "").trim()) {
        return { ok: false, message: "Every row must have a label." } satisfies ActionData;
      }
    }

    if (isDefault) {
      await prisma.sizeChart.updateMany({
        where: { shopId: shopRow.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    if (chartId) {
      const existing = await prisma.sizeChart.findFirst({
        where: { id: chartId, shopId: shopRow.id },
        select: { id: true },
      });

      if (!existing) {
        return { ok: false, message: "Table not found." } satisfies ActionData;
      }

      await prisma.sizeChart.update({
        where: { id: chartId },
        data: {
          title,
          unit,
          isDefault,
          guideTitle: guideTitle || null,
          guideText: guideText || null,
          guideImage: guideImage || null,
          showGuideImage,
          tips: tips || null,
          disclaimer: disclaimer || null,
          columns,
        },
      });

      await prisma.sizeChartRow.deleteMany({
        where: { chartId },
      });

      await prisma.sizeChartRow.createMany({
        data: rows.map((row, index) => ({
          chartId,
          label: String(row.label || "").trim(),
          sortOrder: index + 1,
          values: Object.fromEntries(
            columns.map((col) => [col, String(row.values?.[col] ?? "")]),
          ),
        })),
      });
      invalidateShopSizeChartCache(shopRow.id);

      return { ok: true, message: "Table updated.", intent: "save", chartId } satisfies ActionData;
    }

    await prisma.sizeChart.create({
      data: {
        shopId: shopRow.id,
        title,
        unit,
        isDefault,
        guideTitle: guideTitle || null,
        guideText: guideText || null,
        guideImage: guideImage || null,
        showGuideImage,
        tips: tips || null,
        disclaimer: disclaimer || null,
        columns,
        rows: {
          create: rows.map((row, index) => ({
            label: String(row.label || "").trim(),
            sortOrder: index + 1,
            values: Object.fromEntries(
              columns.map((col) => [col, String(row.values?.[col] ?? "")]),
            ),
          })),
        },
      },
    });
    invalidateShopSizeChartCache(shopRow.id);

    return { ok: true, message: "Table created.", intent: "save" } satisfies ActionData;
  }

  if (intent === "delete") {
    const chartId = String(form.get("chartId") || "").trim();
    if (!chartId) {
      return { ok: false, message: "Missing chartId." } satisfies ActionData;
    }

    const usageCount = await prisma.sizeChartAssignment.count({
      where: { chartId, shopId: shopRow.id },
    });

    const keywordUsageCount = await prisma.sizeKeywordRule.count({
      where: { chartId, shopId: shopRow.id },
    });

    if (usageCount > 0 || keywordUsageCount > 0) {
      return {
        ok: false,
        message:
          `This table is still in use by ${usageCount} assignment(s) and ` +
          `${keywordUsageCount} keyword rule(s). Remove those links first.`,
      } satisfies ActionData;
    }

    await prisma.sizeChartRow.deleteMany({
      where: { chartId },
    });

    await prisma.sizeChart.deleteMany({
      where: { id: chartId, shopId: shopRow.id },
    });
    invalidateShopSizeChartCache(shopRow.id);

    return { ok: true, message: "Table deleted.", intent: "delete" } satisfies ActionData;
  }

  if (intent === "duplicate") {
    const chartId = String(form.get("chartId") || "").trim();
    if (!chartId) {
      return { ok: false, message: "Missing chartId." } satisfies ActionData;
    }

    const source = await prisma.sizeChart.findFirst({
      where: { id: chartId, shopId: shopRow.id },
      include: {
        rows: {
          orderBy: [{ sortOrder: "asc" }],
        },
      },
    });

    if (!source) {
      return { ok: false, message: "Source table not found." } satisfies ActionData;
    }

    const existingTitles = (
      await prisma.sizeChart.findMany({
        where: { shopId: shopRow.id },
        select: { title: true },
      })
    ).map((chart) => String(chart.title || "").trim());

    const duplicated = await prisma.sizeChart.create({
      data: {
        shopId: shopRow.id,
        title: buildDuplicateTitle(source.title, existingTitles),
        unit: source.unit,
        isDefault: false,
        guideTitle: source.guideTitle,
        guideText: source.guideText,
        guideImage: source.guideImage,
        showGuideImage: source.showGuideImage ?? true,
        tips: source.tips,
        disclaimer: source.disclaimer,
        columns: Array.isArray(source.columns) ? source.columns : [],
        rows: {
          create: source.rows.map((row) => ({
            label: row.label,
            sortOrder: row.sortOrder,
            values: row.values as any,
          })),
        },
      },
    });
    invalidateShopSizeChartCache(shopRow.id);

    return {
      ok: true,
      message: "Table duplicated. You can rename or adjust the copy now.",
      intent: "duplicate",
      chartId: duplicated.id,
    } satisfies ActionData;
  }

  return { ok: false, message: "Unknown action." } satisfies ActionData;
};

function ChartPreview({ chart }: { chart: EditorChart | ChartLite | null }) {
  if (!chart) return null;

  const cols = (chart.columns ?? []).filter(Boolean);
  const rows = chart.rows ?? [];

  if (!cols.length) {
    return (
      <div
        style={{
          marginTop: 10,
          padding: 14,
          borderRadius: 14,
          border: "1px solid #eee",
          background: "#fafafa",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>Preview</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
          Add columns to preview the table.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        border: "1px solid #eee",
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800 }}>Preview</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {chart.unit ? String(chart.unit).toUpperCase() : ""}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  style={{
                    textAlign: "left",
                    fontSize: 12,
                    padding: "12px 12px",
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={cols.length}
                  style={{
                    padding: 16,
                    fontSize: 12,
                    opacity: 0.7,
                    borderBottom: "1px solid #f2f2f2",
                  }}
                >
                  No rows yet.
                </td>
              </tr>
            ) : (
              rows.slice(0, 6).map((r, idx) => (
                <tr key={r.id || idx}>
                  {cols.map((c) => (
                    <td
                      key={c}
                      style={{
                        padding: "12px 12px",
                        borderBottom: "1px solid #f2f2f2",
                        fontSize: 12,
                        background: idx % 2 === 0 ? "white" : "#fcfcfc",
                      }}
                    >
                      {String(r.values?.[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
        Showing first {Math.min(6, rows.length)} rows & {cols.length} columns.
      </div>
    </div>
  );
}

function ChartCard({
  chart,
  onEdit,
}: {
  chart: ChartLite;
  onEdit: (chart: ChartLite) => void;
}) {
  const usageCount = (chart.assignmentCount || 0) + (chart.keywordRuleCount || 0);

  return (
    <div
      style={{
        border: "1px solid #e7e7e7",
        borderRadius: 18,
        padding: 18,
        background: "white",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 16,
            border: "1px solid #edf2f7",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <ChartTitleIcon title={chart.title} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 850, fontSize: 17, lineHeight: 1.2 }}>
            {chart.title}
            {chart.isDefault ? " (default)" : ""}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: 11,
                color: "#475467",
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 10px",
                borderRadius: 999,
                background: "#f3f6f8",
                border: "1px solid #e7ecef",
              }}
            >
              {chart.unit ? String(chart.unit).toUpperCase() : "—"} base unit
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#475467",
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 10px",
                borderRadius: 999,
                background: "#f3f6f8",
                border: "1px solid #e7ecef",
              }}
            >
              {Array.isArray(chart.columns) ? chart.columns.length : 0} cols •{" "}
              {Array.isArray(chart.rows) ? chart.rows.length : 0} rows
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "#fbfbfc",
            border: "1px solid #eef0f3",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: ".04em" }}>
            Usage
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
            {chart.assignmentCount || 0} assignment(s) • {chart.keywordRuleCount || 0} rule(s)
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "#fbfbfc",
            border: "1px solid #eef0f3",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: ".04em" }}>
            Updated
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
            {chart.updatedAt ? new Date(chart.updatedAt).toLocaleDateString() : "—"}
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: chart.guideImage
              ? chart.showGuideImage
                ? "#f3fbf5"
                : "#fbfbfc"
              : "#fbfbfc",
            border: chart.guideImage && chart.showGuideImage ? "1px solid #dbeee0" : "1px solid #eef0f3",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: ".04em" }}>
            Storefront image
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
            {!chart.guideImage ? "None" : chart.showGuideImage ? "Visible" : "Hidden"}
          </div>
        </div>
      </div>

      <ChartPreview chart={chart} />

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => onEdit(chart)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #dfe3e8",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Edit
        </button>

        <Form method="post">
          <input type="hidden" name="intent" value="duplicate" />
          <input type="hidden" name="chartId" value={chart.id} />
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #dfe3e8",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Duplicate table
          </button>
        </Form>

        {!chart.isDefault ? (
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="chartId" value={chart.id} />
            <button
              type="submit"
              disabled={usageCount > 0}
              title={
                usageCount > 0
                  ? "This chart is still used by assignments or keyword rules."
                  : undefined
              }
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d32f2f",
                background: "white",
                color: "#d32f2f",
                cursor: usageCount > 0 ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: usageCount > 0 ? 0.5 : 1,
              }}
            >
              Delete
            </button>
          </Form>
        ) : null}
      </div>

      {usageCount > 0 ? (
        <div style={{ fontSize: 12, opacity: 0.72, marginTop: 10 }}>
          Remove linked assignments and keyword rules before deleting this table.
        </div>
      ) : null}
    </div>
  );
}

export default function SizeChartsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { shopDomain } = loaderData;
  const charts = useMemo<ChartLite[]>(
    () => (loaderData.charts ?? []).map((chart) => normalizeSizeChartLite(chart)),
    [loaderData.charts],
  );
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorChart>(emptyEditor());

  const [search, setSearch] = useState("");
  const [onlyDefault, setOnlyDefault] = useState(false);
  const [onlyWithImage, setOnlyWithImage] = useState(false);
  const [unitFilter, setUnitFilter] = useState("all");
  const [usageFilter, setUsageFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("recently-updated");
  const [editorInitialJson, setEditorInitialJson] = useState(JSON.stringify(emptyEditor()));
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";
  const sortedCharts = useMemo(() => {
    const items = [...(charts ?? [])];

    items.sort((a, b) => {
      if (sortOrder === "title-asc") {
        return String(a.title || "").localeCompare(String(b.title || ""), undefined, {
          sensitivity: "base",
        });
      }

      if (sortOrder === "title-desc") {
        return String(b.title || "").localeCompare(String(a.title || ""), undefined, {
          sensitivity: "base",
        });
      }

      if (sortOrder === "recently-created") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }

      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    return items;
  }, [charts, sortOrder]);

  useEffect(() => {
    if (actionData?.ok && actionData.intent === "save") {
      setEditorOpen(false);
      setEditorInitialJson(JSON.stringify(emptyEditor()));
    }
  }, [actionData]);

  useEffect(() => {
    if (!actionData?.ok || actionData.intent !== "duplicate" || !actionData.chartId) return;

    const duplicatedChart = charts.find((chart) => chart.id === actionData.chartId);
    if (!duplicatedChart) return;

    const next = buildEditorFromChart(duplicatedChart);
    setEditor(next);
    setEditorInitialJson(JSON.stringify(next));
    setImportText("");
    setImportMessage("Duplicated table loaded. Update the copy and save when you're ready.");
    setEditorOpen(true);
  }, [actionData, charts]);

  const editorDirty = useMemo(
    () => JSON.stringify(editor) !== editorInitialJson,
    [editor, editorInitialJson],
  );

  useEffect(() => {
    if (!editorOpen || !editorDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editorOpen, editorDirty]);

  function closeEditor() {
    if (editorOpen && editorDirty) {
      const confirmed = window.confirm("You have unsaved changes. Discard them?");
      if (!confirmed) return;
    }
    setEditorOpen(false);
  }

  function openCreate() {
    const next = emptyEditor();
    setEditor(next);
    setEditorInitialJson(JSON.stringify(next));
    setImportText("");
    setImportMessage(null);
    setEditorOpen(true);
  }

  function applyTemplate(templateKey: string) {
    const template = JEWELRY_TABLE_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) return;

    const next = {
      ...emptyEditor(),
      ...template.build(),
      id: editor.id,
      isDefault: editor.isDefault,
    } satisfies EditorChart;

    setEditor(next);
    setImportText("");
    setImportMessage(`${template.label} template loaded. Adjust any values, then save the table.`);
  }

  function openEdit(chart: ChartLite) {
    const next = buildEditorFromChart(chart);
    setEditor(next);
    setEditorInitialJson(JSON.stringify(next));
    setImportText("");
    setImportMessage(null);
    setEditorOpen(true);
  }

  function importTableFromText() {
    const parsed = parseTableText(importText);

    if (!parsed) {
      setImportMessage("Paste a table with a header row and at least one data row.");
      return;
    }

    setEditor((prev) => ({
      ...prev,
      columns: parsed.columns,
      rows: parsed.rows.length > 0 ? parsed.rows : prev.rows,
    }));
    setImportMessage(`Imported ${parsed.rows.length} row(s) and ${parsed.columns.length} column(s).`);
  }

  function setColumnName(index: number, value: string) {
    setEditor((prev) => {
      const oldCol = prev.columns[index];
      const nextColumns = [...prev.columns];
      nextColumns[index] = value;

      const nextRows = prev.rows.map((row) => {
        const nextValues: Record<string, string> = {};

        nextColumns.forEach((col, colIndex) => {
          const sourceKey = colIndex === index ? oldCol : col;
          nextValues[col] = String(row.values?.[sourceKey] ?? "");
        });

        return { ...row, values: nextValues };
      });

      return { ...prev, columns: nextColumns, rows: nextRows };
    });
  }

  function addColumn() {
    setEditor((prev) => {
      const newNameBase = "COLUMN";
      let counter = prev.columns.length + 1;
      let candidate = `${newNameBase} ${counter}`;

      while (prev.columns.includes(candidate)) {
        counter += 1;
        candidate = `${newNameBase} ${counter}`;
      }

      const nextColumns = [...prev.columns, candidate];
      const nextRows = prev.rows.map((row) => ({
        ...row,
        values: {
          ...row.values,
          [candidate]: "",
        },
      }));

      return { ...prev, columns: nextColumns, rows: nextRows };
    });
  }

  function removeColumn(index: number) {
    setEditor((prev) => {
      if (prev.columns.length <= 1) return prev;

      const colToRemove = prev.columns[index];
      const nextColumns = prev.columns.filter((_, i) => i !== index);

      const nextRows = prev.rows.map((row) => {
        const nextValues: Record<string, string> = {};
        nextColumns.forEach((col) => {
          nextValues[col] = String(row.values?.[col] ?? "");
        });
        return { ...row, values: nextValues };
      });

      return {
        ...prev,
        columns: nextColumns,
        rows: nextRows.map((row) => {
          const cleaned = { ...row };
          delete cleaned.values[colToRemove];
          return cleaned;
        }),
      };
    });
  }

  function addRow() {
    setEditor((prev) => {
      const rowNumber = prev.rows.length + 1;
      const values = Object.fromEntries(prev.columns.map((col) => [col, ""]));

      return {
        ...prev,
        rows: [
          ...prev.rows,
          {
            label: `Row ${rowNumber}`,
            sortOrder: rowNumber,
            values,
          },
        ],
      };
    });
  }

  function removeRow(index: number) {
    setEditor((prev) => {
      if (prev.rows.length <= 1) return prev;

      const nextRows = prev.rows
        .filter((_, i) => i !== index)
        .map((row, idx) => ({ ...row, sortOrder: idx + 1 }));

      return { ...prev, rows: nextRows };
    });
  }

  function setRowLabel(index: number, value: string) {
    setEditor((prev) => {
      const nextRows = [...prev.rows];
      nextRows[index] = { ...nextRows[index], label: value };
      return { ...prev, rows: nextRows };
    });
  }

  function setCellValue(rowIndex: number, columnName: string, value: string) {
    setEditor((prev) => {
      const nextRows = [...prev.rows];
      const row = nextRows[rowIndex];

      nextRows[rowIndex] = {
        ...row,
        values: {
          ...row.values,
          [columnName]: value,
        },
      };

      return { ...prev, rows: nextRows };
    });
  }

  const unitOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        (sortedCharts || [])
          .map((chart) => String(chart.unit || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    return values.sort();
  }, [sortedCharts]);

  const filteredCharts = useMemo(() => {
    return sortedCharts.filter((chart) => {
      const title = String(chart.title || "").trim().toLowerCase();
      const unit = String(chart.unit || "").trim().toLowerCase();
      const hasImage = !!String(chart.guideImage || "").trim();
      const usageCount = (chart.assignmentCount || 0) + (chart.keywordRuleCount || 0);

      if (search && !title.includes(search.trim().toLowerCase())) return false;
      if (onlyDefault && !chart.isDefault) return false;
      if (onlyWithImage && !hasImage) return false;
      if (unitFilter !== "all" && unit !== unitFilter) return false;
      if (usageFilter === "linked" && usageCount === 0) return false;
      if (usageFilter === "unused" && usageCount > 0) return false;

      return true;
    });
  }, [sortedCharts, search, onlyDefault, onlyWithImage, unitFilter, usageFilter]);

  const columnsJson = JSON.stringify(editor.columns);
  const rowsJson = JSON.stringify(
    editor.rows.map((row, idx) => ({
      label: row.label,
      sortOrder: idx + 1,
      values: row.values,
    })),
  );

  return (
    <s-page heading="Size tables" inlineSize="large">
      <s-section>
        <s-paragraph>
          <strong>Shop:</strong> {shopDomain}
        </s-paragraph>
      </s-section>

      <s-section heading="How Size Tables Work">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <InfoCard
            title="1. Build the table"
            text="Add columns and rows for the exact measurements shoppers should compare against on the storefront."
          />
          <InfoCard
            title="2. Add guide content"
            text="Use the guide title, text, tips, disclaimer, and optional image to explain how shoppers should measure."
          />
          <InfoCard
            title="3. Reuse and assign"
            text="Once saved, the table can be duplicated, assigned to multiple rules, and filtered here by unit, image, or usage."
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

      <s-section heading="Manage tables">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <s-paragraph>
            Create custom size tables here, then assign them to products, collections, or other matching rules from the Assignments page.
          </s-paragraph>

          <button
            type="button"
            onClick={openCreate}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #2e7d32",
              background: "#3aa655",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            Create table
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #e7e7e7",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "grid",
            gridTemplateColumns: "minmax(220px, 1.2fr) repeat(5, minmax(150px, .75fr))",
            gap: 12,
            alignItems: "end",
          }}
          >
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                Search tables
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by table name"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                Unit
              </label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All units</option>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                Usage
              </label>
              <select value={usageFilter} onChange={(e) => setUsageFilter(e.target.value)} style={inputStyle}>
                <option value="all">All tables</option>
                <option value="linked">Used in rules</option>
                <option value="unused">Unused tables</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                Sort
              </label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={inputStyle}>
                <option value="recently-updated">Last saved or edited</option>
                <option value="recently-created">Newest created</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
                padding: "0 4px",
              }}
            >
              <input
                type="checkbox"
                checked={onlyDefault}
                onChange={(e) => setOnlyDefault(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Only default</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
                padding: "0 4px",
              }}
            >
              <input
                type="checkbox"
                checked={onlyWithImage}
                onChange={(e) => setOnlyWithImage(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Only with image</span>
            </label>
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
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Showing {filteredCharts.length} of {sortedCharts.length} table(s)
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setOnlyDefault(false);
                setOnlyWithImage(false);
                setUnitFilter("all");
                setUsageFilter("all");
                setSortOrder("recently-updated");
              }}
              style={secondaryBtnStyle}
            >
              Reset filters
            </button>
          </div>
        </div>

        {filteredCharts.length === 0 ? (
          <div style={{ ...emptyStateStyle, marginTop: 16 }}>
            No size tables match the current filters.
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 18,
            }}
          >
            {filteredCharts.map((chart) => (
              <ChartCard key={chart.id} chart={chart} onEdit={openEdit} />
            ))}
          </div>
        )}
      </s-section>

      <ModalShell
        open={editorOpen}
        title={editor.id ? "Edit size table" : "Create size table"}
        onClose={closeEditor}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={closeEditor}
              disabled={isSubmitting}
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

            <Form method="post">
              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="chartId" value={editor.id || ""} />
              <input type="hidden" name="title" value={editor.title} />
              <input type="hidden" name="unit" value={editor.unit} />
              <input type="hidden" name="guideTitle" value={editor.guideTitle} />
              <input type="hidden" name="guideText" value={editor.guideText} />
              <input type="hidden" name="guideImage" value={editor.guideImage} />
              <input type="hidden" name="showGuideImage" value={String(editor.showGuideImage)} />
              <input type="hidden" name="tips" value={editor.tips} />
              <input type="hidden" name="disclaimer" value={editor.disclaimer} />
              <input type="hidden" name="isDefault" value={String(editor.isDefault)} />
              <input type="hidden" name="columnsJson" value={columnsJson} />
              <input type="hidden" name="rowsJson" value={rowsJson} />

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #2e7d32",
                  background: "#3aa655",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                {isSubmitting ? "Saving..." : editor.id ? "Save changes" : "Create table"}
              </button>
            </Form>
          </>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 420px) minmax(560px, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid #e7e7e7",
              borderRadius: 14,
              padding: 14,
              background: "white",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 850, marginBottom: 12 }}>Table details</div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Quick templates</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {JEWELRY_TABLE_TEMPLATES.map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => applyTemplate(template.key)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: "1px solid #dfe3e8",
                        background: "white",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.4 }}>
                  Start faster with ready-made jewelry tables for rings, necklaces, and bracelets.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Title</label>
                <input
                  value={editor.title}
                  onChange={(e) => setEditor((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Socks"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Unit</label>
                <input
                  value={editor.unit}
                  onChange={(e) => setEditor((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder="cm, mm, or in"
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.4 }}>
                  Use the same unit here as the unit you enter in the table values. Storefront
                  shoppers can switch between MM, CM, and INCHES automatically.
                </div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.4 }}>
                  For rings and jewelry, measurement columns like <strong>DIAMETER</strong>,{" "}
                  <strong>CIRCUMFERENCE</strong>, <strong>FINGER SIZE</strong>,{" "}
                  <strong>NECKLACE LENGTH</strong>, <strong>BRACELET LENGTH</strong>, and{" "}
                  <strong>THICKNESS</strong> now convert automatically too.
                </div>
                {editor.unit.trim() && !normalizeUnitValue(editor.unit) ? (
                  <div style={{ fontSize: 12, color: "#c62828", marginTop: 6, lineHeight: 1.4 }}>
                    Use only <strong>cm</strong>, <strong>mm</strong>, or <strong>in</strong> here
                    for reliable storefront conversion.
                  </div>
                ) : null}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={editor.isDefault}
                  onChange={(e) => setEditor((prev) => ({ ...prev, isDefault: e.target.checked }))}
                />
                <span style={{ fontSize: 13 }}>Use as global fallback table (optional)</span>
              </label>
              <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.4, marginTop: -2 }}>
                Leave this unchecked if you only want size tables to appear when a direct assignment
                or keyword rule matches a product.
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Guide title</label>
                <input
                  value={editor.guideTitle}
                  onChange={(e) => setEditor((prev) => ({ ...prev, guideTitle: e.target.value }))}
                  placeholder="How to measure (Socks)"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Guide image URL</label>
                <input
                  value={editor.guideImage}
                  onChange={(e) => setEditor((prev) => ({ ...prev, guideImage: e.target.value }))}
                  placeholder="https://cdn.shopify.com/... or /images/size-guides/shoes.png"
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {GUIDE_IMAGE_PRESETS.map((preset) => {
                    const active = editor.guideImage === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setEditor((prev) => ({ ...prev, guideImage: preset.value }))}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 999,
                          border: active ? "1px solid #2e7d32" : "1px solid #dfe3e8",
                          background: active ? "#f3fbf5" : "white",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  {editor.guideImage ? (
                    <button
                      type="button"
                      onClick={() => setEditor((prev) => ({ ...prev, guideImage: "" }))}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: "1px solid #dfe3e8",
                        background: "white",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Clear image
                    </button>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.4 }}>
                  Choose a built-in guide image or paste your own image URL or storefront path.
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={editor.showGuideImage}
                  onChange={(e) => setEditor((prev) => ({ ...prev, showGuideImage: e.target.checked }))}
                />
                <span style={{ fontSize: 13 }}>Display guide image on storefront</span>
              </label>

             {editor.guideImage && editor.showGuideImage ? (
                    <div
                      style={{
                        border: "1px solid #e7e7e7",
                        borderRadius: 12,
                        padding: 10,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                        Image preview
                      </div>

                      <img
                        src={editor.guideImage}
                        alt={editor.guideTitle || editor.title || "Guide image"}
                        style={{
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "contain",
                          borderRadius: 10,
                          display: "block",
                          background: "white",
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}

                  {editor.guideImage && !editor.showGuideImage ? (
                    <div
                      style={{
                        border: "1px solid #e7e7e7",
                        borderRadius: 12,
                        padding: 10,
                        background: "#fafafa",
                        fontSize: 12,
                        opacity: 0.7,
                      }}
                    >
                      Guide image is saved, but hidden on storefront.
                    </div>
                  ) : null}

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Guide text</label>
                <textarea
                  value={editor.guideText}
                  onChange={(e) => setEditor((prev) => ({ ...prev, guideText: e.target.value }))}
                  rows={4}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Tips</label>
                <textarea
                  value={editor.tips}
                  onChange={(e) => setEditor((prev) => ({ ...prev, tips: e.target.value }))}
                  rows={3}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Disclaimer</label>
                <textarea
                  value={editor.disclaimer}
                  onChange={(e) => setEditor((prev) => ({ ...prev, disclaimer: e.target.value }))}
                  rows={3}
                  style={textareaStyle}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #e7e7e7",
              borderRadius: 14,
              padding: 14,
              background: "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 850 }}>Table builder</div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={addColumn} style={secondaryBtnStyle}>
                  Add column
                </button>
                <button type="button" onClick={addRow} style={secondaryBtnStyle}>
                  Add row
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e7e7e7",
                  background: "#fafafa",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>CSV / paste import</div>
                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    if (importMessage) setImportMessage(null);
                  }}
                  rows={6}
                  placeholder={`SIZE,CHEST,LENGTH\nS,88,62\nM,94,65`}
                  style={textareaStyle}
                />
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 8, lineHeight: 1.4 }}>
                  Paste CSV, tab-separated, or semicolon-separated data. The first row should be the
                  column headers.
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={importTableFromText} style={secondaryBtnStyle}>
                    Import into table
                  </button>
                  {importMessage ? (
                    <div style={{ fontSize: 12, opacity: 0.78 }}>{importMessage}</div>
                  ) : null}
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Columns</div>

              <div style={{ display: "grid", gap: 8 }}>
                {editor.columns.map((col, index) => (
                    <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <input
                      value={col}
                      onChange={(e) => setColumnName(index, e.target.value)}
                      placeholder={`Column ${index + 1}`}
                      style={inputStyle}
                    />

                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      disabled={editor.columns.length <= 1}
                      style={dangerGhostBtnStyle}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Rows</div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Label</th>
                      {editor.columns.map((col) => (
                        <th key={col} style={thStyle}>
                          {col}
                        </th>
                      ))}
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {editor.rows.map((row, rowIndex) => (
                       <tr key={row.id || rowIndex}>
                          <td style={tdStyle}>
                          <input
                            value={row.label}
                            onChange={(e) => setRowLabel(rowIndex, e.target.value)}
                            placeholder={`Row ${rowIndex + 1}`}
                            style={tableInputStyle}
                          />
                        </td>

                        {editor.columns.map((col) => (
                          <td key={`${rowIndex}-${col}`} style={tdStyle}>
                            <input
                              value={String(row.values?.[col] ?? "")}
                              onChange={(e) => setCellValue(rowIndex, col, e.target.value)}
                              placeholder={col}
                              style={tableInputStyle}
                            />
                          </td>
                        ))}

                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => removeRow(rowIndex)}
                            disabled={editor.rows.length <= 1}
                            style={dangerGhostBtnStyle}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ChartPreview chart={editor} />
            </div>
          </div>
        </div>
      </ModalShell>
    </s-page>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dfe3e8",
  background: "white",
} as const;

const textareaStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dfe3e8",
  background: "white",
  resize: "vertical",
} as const;

const secondaryBtnStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dfe3e8",
  background: "white",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const emptyStateStyle = {
  padding: 20,
  borderRadius: 16,
  border: "1px solid #e7e7e7",
  background: "#fafafa",
} as const;

const dangerGhostBtnStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ef9a9a",
  background: "white",
  color: "#c62828",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const thStyle = {
  textAlign: "left",
  fontSize: 12,
  padding: "12px 12px",
  borderBottom: "1px solid #eee",
  background: "#fafafa",
  whiteSpace: "nowrap",
} as const;

const tdStyle = {
  padding: "12px 12px",
  borderBottom: "1px solid #f2f2f2",
  verticalAlign: "top",
} as const;

const tableInputStyle = {
  width: "100%",
  minWidth: 120,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #dfe3e8",
  background: "white",
} as const;

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
