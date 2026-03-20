export type ChartRowValueMap = Record<string, string>;

export type ChartRowLite = {
  id?: string;
  label: string;
  sortOrder: number;
  values: ChartRowValueMap;
};

export type SizeChartLite = {
  id: string;
  title: string;
  isDefault: boolean;
  unit?: string | null;
  assignmentCount?: number;
  keywordRuleCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  columns?: string[] | null;
  guideTitle?: string | null;
  guideText?: string | null;
  guideImage?: string | null;
  showGuideImage?: boolean | null;
  tips?: string | null;
  disclaimer?: string | null;
  rows?: ChartRowLite[];
};

export type EditorChart = {
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

export function normalizeUnitValue(input: unknown): "cm" | "in" | "mm" | null {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (["cm", "cms", "centimeter", "centimeters"].includes(raw)) return "cm";
  if (["mm", "millimeter", "millimeters"].includes(raw)) return "mm";
  if (["in", "inch", "inches"].includes(raw)) return "in";
  return null;
}

export function buildDuplicateTitle(sourceTitle: string, existingTitles: string[]): string {
  const baseTitle = `${String(sourceTitle || "").trim() || "Untitled"} Copy`;
  if (!existingTitles.includes(baseTitle)) return baseTitle;

  let counter = 2;
  let candidate = `${baseTitle} ${counter}`;
  while (existingTitles.includes(candidate)) {
    counter += 1;
    candidate = `${baseTitle} ${counter}`;
  }

  return candidate;
}

export function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseTableText(input: string): { columns: string[]; rows: ChartRowLite[] } | null {
  const normalized = String(input || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const sample = lines[0];
  const delimiter = sample.includes("\t") ? "\t" : sample.includes(";") ? ";" : ",";

  const columns = parseDelimitedLine(lines[0], delimiter)
    .map((cell) => cell.trim())
    .filter(Boolean);

  if (columns.length === 0) return null;

  const sizeColumn =
    columns.find((column) => String(column).trim().toUpperCase().includes("SIZE")) || columns[0];

  const rows = lines.slice(1).map((line, index) => {
    const cells = parseDelimitedLine(line, delimiter);
    const values = Object.fromEntries(
      columns.map((column, cellIndex) => [column, String(cells[cellIndex] ?? "").trim()]),
    );

    return {
      label: String(values[sizeColumn] ?? cells[0] ?? `Row ${index + 1}`).trim() || `Row ${index + 1}`,
      sortOrder: index + 1,
      values,
    };
  });

  return { columns, rows };
}

export function normalizeChartColumns(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((value) => String(value || "").trim()).filter(Boolean);
}

export function normalizeChartRows(input: unknown, columns: string[]): ChartRowLite[] {
  if (!Array.isArray(input)) return [];

  return input.map((row: any, index) => {
    const values: Record<string, string> = {};
    const rawValues = row?.values && typeof row.values === "object" ? row.values : {};

    for (const column of columns) {
      values[column] = String(rawValues[column] ?? "");
    }

    return {
      id: row?.id ? String(row.id) : undefined,
      label: String(row?.label ?? ""),
      sortOrder: Number(row?.sortOrder ?? index + 1),
      values,
    };
  });
}

export function normalizeSizeChartLite(chart: any): SizeChartLite {
  const columns = normalizeChartColumns(chart?.columns);

  return {
    id: String(chart?.id ?? ""),
    title: String(chart?.title ?? ""),
    isDefault: Boolean(chart?.isDefault),
    unit: chart?.unit ? String(chart.unit) : null,
    assignmentCount: Number(chart?._count?.assigns ?? 0),
    keywordRuleCount: Number(chart?._count?.keywordAssignments ?? 0),
    createdAt: chart?.createdAt ? String(chart.createdAt) : null,
    updatedAt: chart?.updatedAt ? String(chart.updatedAt) : null,
    guideTitle: chart?.guideTitle ? String(chart.guideTitle) : null,
    guideText: chart?.guideText ? String(chart.guideText) : null,
    guideImage: chart?.guideImage ? String(chart.guideImage) : null,
    showGuideImage:
      typeof chart?.showGuideImage === "boolean" ? chart.showGuideImage : Boolean(chart?.showGuideImage),
    tips: chart?.tips ? String(chart.tips) : null,
    disclaimer: chart?.disclaimer ? String(chart.disclaimer) : null,
    columns,
    rows: normalizeChartRows(chart?.rows ?? [], columns),
  };
}

export function emptyEditor(): EditorChart {
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

export function buildEditorFromChart(chart?: SizeChartLite | null): EditorChart {
  if (!chart) return emptyEditor();

  const columns = normalizeChartColumns(chart.columns);
  const rows = normalizeChartRows(chart.rows ?? [], columns);

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
    columns: columns.length ? columns : ["SIZE", "VALUE"],
    rows:
      rows.length > 0
        ? rows
        : [
            {
              label: "Row 1",
              sortOrder: 1,
              values: Object.fromEntries((columns.length ? columns : ["SIZE", "VALUE"]).map((column) => [column, ""])),
            },
          ],
  };
}
