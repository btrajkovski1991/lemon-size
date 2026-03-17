import { useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

type ChartRowValueMap = Record<string, string>;

type ChartRowLite = {
  id?: string;
  label: string;
  sortOrder: number;
  values: ChartRowValueMap;
};

type ChartLite = {
  id: string;
  title: string;
  isDefault: boolean;
  unit?: string | null;
  columns?: string[] | null;
  guideTitle?: string | null;
  guideText?: string | null;
  guideImage?: string | null;
  showGuideImage?: boolean | null;
  tips?: string | null;
  disclaimer?: string | null;
  rows?: ChartRowLite[];
};

type ActionData =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | undefined;

type EditorChart = {
  id: string | null;
  title: string;
  unit: string;
  isDefault: boolean;
  guideTitle: string;
  guideText: string;
  guideImage: string;
  showGuideImage: boolean;
  tips: string;
  disclaimer: string;
  columns: string[];
  rows: ChartRowLite[];
};

function emptyEditor(): EditorChart {
  return {
    id: null,
    title: "",
    unit: "cm",
    isDefault: false,
    guideTitle: "",
    guideText: "",
    guideImage: "",
    showGuideImage: true,
    tips: "",
    disclaimer: "",
    columns: ["SIZE", "VALUE"],
    rows: [
      {
        label: "Row 1",
        sortOrder: 1,
        values: {
          SIZE: "S",
          VALUE: "",
        },
      },
    ],
  };
}

function normalizeColumns(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x || "").trim()).filter(Boolean);
}

function normalizeRows(input: unknown, columns: string[]): ChartRowLite[] {
  if (!Array.isArray(input)) return [];

  return input.map((row: any, index) => {
    const values: Record<string, string> = {};
    const rawValues = row?.values && typeof row.values === "object" ? row.values : {};

    for (const col of columns) {
      values[col] = String(rawValues[col] ?? "");
    }

    return {
      id: row?.id ? String(row.id) : undefined,
      label: String(row?.label ?? ""),
      sortOrder: Number(row?.sortOrder ?? index + 1),
      values,
    };
  });
}

function buildEditorFromChart(chart?: ChartLite | null): EditorChart {
  if (!chart) return emptyEditor();

  const cols = normalizeColumns(chart.columns);
  const rows = normalizeRows(chart.rows ?? [], cols);

  return {
    id: chart.id,
    title: chart.title || "",
    unit: chart.unit || "cm",
    isDefault: !!chart.isDefault,
    guideTitle: chart.guideTitle || "",
    guideText: chart.guideText || "",
    guideImage: chart.guideImage || "",
    showGuideImage: chart.showGuideImage ?? true,
    tips: chart.tips || "",
    disclaimer: chart.disclaimer || "",
    columns: cols.length ? cols : ["SIZE", "VALUE"],
    rows: rows.length
      ? rows
      : [
          {
            label: "Row 1",
            sortOrder: 1,
            values: Object.fromEntries((cols.length ? cols : ["SIZE", "VALUE"]).map((c) => [c, ""])),
          },
        ],
  };
}

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

  const charts = await prisma.sizeChart.findMany({
    where: { shopId: shopRow.id },
    orderBy: [{ isDefault: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      isDefault: true,
      unit: true,
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
  await authenticate.admin(request);

  const shopDomain = await requireShopFromDb();
  const shopRow = await getOrCreateShopRow(shopDomain);

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "save") {
    const chartId = String(form.get("chartId") || "").trim() || null;
    const title = String(form.get("title") || "").trim();
    const unit = String(form.get("unit") || "").trim() || "cm";
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
      columns = normalizeColumns(JSON.parse(String(form.get("columnsJson") || "[]")));
      rows = normalizeRows(JSON.parse(String(form.get("rowsJson") || "[]")), columns);
    } catch (error) {
      return { ok: false, message: "Invalid table payload." } satisfies ActionData;
    }

    if (!title) {
      return { ok: false, message: "Table title is required." } satisfies ActionData;
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

      return { ok: true, message: "Table updated." } satisfies ActionData;
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

    return { ok: true, message: "Table created." } satisfies ActionData;
  }

  if (intent === "delete") {
    const chartId = String(form.get("chartId") || "").trim();
    if (!chartId) {
      return { ok: false, message: "Missing chartId." } satisfies ActionData;
    }

    const usageCount = await prisma.sizeChartAssignment.count({
      where: { chartId, shopId: shopRow.id },
    });

    if (usageCount > 0) {
      return {
        ok: false,
        message: `This table is used in ${usageCount} assignment(s). Remove those assignments first.`,
      } satisfies ActionData;
    }

    await prisma.sizeChartRow.deleteMany({
      where: { chartId },
    });

    await prisma.sizeChart.deleteMany({
      where: { id: chartId, shopId: shopRow.id },
    });

    return { ok: true, message: "Table deleted." } satisfies ActionData;
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

    await prisma.sizeChart.create({
      data: {
        shopId: shopRow.id,
        title: `${source.title} Copy`,
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

    return { ok: true, message: "Table duplicated." } satisfies ActionData;
  }

  return { ok: false, message: "Unknown action." } satisfies ActionData;
};

function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: any;
  footer?: any;
  wide?: boolean;
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
          width: wide ? "min(1280px, 96vw)" : "min(920px, 96vw)",
          maxHeight: "90vh",
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
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 24,
              lineHeight: 1,
              cursor: "pointer",
              padding: 6,
            }}
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

function IconForChartTitle({ title }: { title: string }) {
  const common = { width: 42, height: 42, viewBox: "0 0 48 48", fill: "none" as const };
  const stroke = "#2a2a2a";
  const muted = "#9aa0a6";
  const t = String(title || "").toLowerCase();

  if (t.includes("shoe") || t.includes("sock")) {
    return (
      <svg {...common}>
        <path
          d="M9 30c7 0 12-6 13-10l8 6c3 2 6 3 9 3h2v6H9v-5z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 35h32" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (t.includes("tops")) {
    return (
      <svg {...common}>
        <path
          d="M16 14l8-4 8 4 4 8-6 4v20H18V26l-6-4 4-8z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (t.includes("bottom")) {
    return (
      <svg {...common}>
        <path
          d="M18 10h12l2 28-7-2-3 8-3-8-7 2 2-28z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (t.includes("blazer") || t.includes("jacket")) {
    return (
      <svg {...common}>
        <path
          d="M16 12l8-2 8 2 4 10-6 6v14H18V28l-6-6 4-10z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M24 10v32" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (t.includes("dress")) {
    return (
      <svg {...common}>
        <path
          d="M20 10h8l2 8-2 4 6 18H14l6-18-2-4 2-8z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="12" y="12" width="24" height="24" rx="6" stroke={stroke} strokeWidth="2" />
      <path d="M16 20h16M16 26h16M16 32h10" stroke={muted} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
  return (
    <div
      style={{
        border: "1px solid #e7e7e7",
        borderRadius: 18,
        padding: 18,
        background: "white",
        boxShadow: "0 10px 24px rgba(0,0,0,.05)",
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 16,
            border: "1px solid #eee",
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <IconForChartTitle title={chart.title} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 850, fontSize: 16, lineHeight: 1.15 }}>
            {chart.title}
            {chart.isDefault ? " (default)" : ""}
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
            {chart.unit ? String(chart.unit).toUpperCase() : "—"} •{" "}
            {Array.isArray(chart.columns) ? chart.columns.length : 0} cols •{" "}
            {Array.isArray(chart.rows) ? chart.rows.length : 0} rows
          </div>

          {chart.guideImage ? (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Image: {chart.showGuideImage ? "shown" : "hidden"}
            </div>
          ) : null}
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
            Duplicate
          </button>
        </Form>

        {!chart.isDefault ? (
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="chartId" value={chart.id} />
            <button
              type="submit"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d32f2f",
                background: "white",
                color: "#d32f2f",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Delete
            </button>
          </Form>
        ) : null}
      </div>
    </div>
  );
}

export default function SizeChartsPage() {
  const { shopDomain, charts } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorChart>(emptyEditor());

  const [search, setSearch] = useState("");
  const [onlyDefault, setOnlyDefault] = useState(false);
  const [onlyWithImage, setOnlyWithImage] = useState(false);
  const [unitFilter, setUnitFilter] = useState("all");

  const isSubmitting = navigation.state === "submitting";
  const sortedCharts = useMemo(() => charts ?? [], [charts]);

  useEffect(() => {
    if (actionData?.ok) {
      setEditorOpen(false);
    }
  }, [actionData]);

  function openCreate() {
    setEditor(emptyEditor());
    setEditorOpen(true);
  }

  function openEdit(chart: ChartLite) {
    setEditor(buildEditorFromChart(chart));
    setEditorOpen(true);
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
          return sortedCharts.filter((chart: ChartLite) => {
            const title = String(chart.title || "").trim().toLowerCase();
            const unit = String(chart.unit || "").trim().toLowerCase();
            const hasImage = !!String(chart.guideImage || "").trim();

            if (search && title !== search.trim().toLowerCase()) return false;
            if (onlyDefault && !chart.isDefault) return false;
            if (onlyWithImage && !hasImage) return false;
            if (unitFilter !== "all" && unit !== unitFilter) return false;

            return true;
          });
        }, [sortedCharts, search, onlyDefault, onlyWithImage, unitFilter]);

  const columnsJson = JSON.stringify(editor.columns);
  const rowsJson = JSON.stringify(
    editor.rows.map((row, idx) => ({
      label: row.label,
      sortOrder: idx + 1,
      values: row.values,
    })),
  );

  return (
    <s-page heading="Size tables">
      <s-section>
        <s-paragraph>
          <strong>Shop:</strong> {shopDomain}
        </s-paragraph>
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
            Create custom size tables, then assign them to products or collections from the Assignments page.
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
            Create new table
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
              gridTemplateColumns: "minmax(240px, 1.3fr) repeat(3, minmax(160px, .8fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
                      <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                    Table
                  </label>
                  <select
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">All tables</option>
                    {sortedCharts.map((chart: ChartLite) => (
                      <option key={chart.id} value={chart.title}>
                        {chart.title}
                      </option>
                    ))}
                  </select>
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
              }}
              style={secondaryBtnStyle}
            >
              Reset filters
            </button>
          </div>
        </div>

        {filteredCharts.length === 0 ? (
          <div
            style={{
              marginTop: 16,
              padding: 20,
              borderRadius: 16,
              border: "1px solid #eee",
              background: "#fafafa",
            }}
          >
            No tables match the selected filter.
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
            {filteredCharts.map((chart: ChartLite) => (
              <ChartCard key={chart.id} chart={chart} onEdit={openEdit} />
            ))}
          </div>
        )}
      </s-section>

      <ModalShell
        open={editorOpen}
        title={editor.id ? "Edit size table" : "Create size table"}
        onClose={() => setEditorOpen(false)}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
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
                  placeholder="cm / in / mm"
                  style={inputStyle}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={editor.isDefault}
                  onChange={(e) => setEditor((prev) => ({ ...prev, isDefault: e.target.checked }))}
                />
                <span style={{ fontSize: 13 }}>Set as default table</span>
              </label>

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