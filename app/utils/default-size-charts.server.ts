import prisma from "../db.server";
import { invalidateShopSizeChartCache } from "./size-chart-cache.server";

type DefaultChartTemplate = {
  title: string;
  unit: string;
  isDefault?: boolean;
  guideTitle: string;
  guideText: string;
  guideImage?: string | null;
  tips?: string | null;
  disclaimer?: string | null;
  columns: string[];
  rows: Array<{
    label: string;
    sortOrder: number;
    values: Record<string, string>;
  }>;
};

type DefaultKeywordRule = {
  keyword: string;
  field: "ANY" | "TITLE" | "HANDLE" | "TYPE" | "VENDOR" | "TAG";
  chartTitle: string;
  priority: number;
};

const GLOBAL_DISCLAIMER =
  "Sizes can vary slightly depending on brand and measuring method. If you are between sizes, choose the larger size for comfort.";

const GLOBAL_TIPS =
  "Use a soft measuring tape and compare your measurements carefully with the chart.";

const STARTER_LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const DEFAULT_CHART_TEMPLATES: DefaultChartTemplate[] = [
  {
    title: "Tops (product)",
    unit: "cm",
    isDefault: true,
    guideTitle: "How to measure tops",
    guideText:
      "Measure chest flat from armpit to armpit and length from the highest shoulder point to the hem.",
    guideImage: "/images/size-guides/tops.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "CHEST", "LENGTH"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", CHEST: "84 cm", LENGTH: "66 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", CHEST: "92 cm", LENGTH: "68 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", CHEST: "100 cm", LENGTH: "70 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", CHEST: "108 cm", LENGTH: "72 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", CHEST: "116 cm", LENGTH: "74 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", CHEST: "124 cm", LENGTH: "76 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", CHEST: "132 cm", LENGTH: "78 cm" } },
    ],
  },
  {
    title: "Bottoms",
    unit: "cm",
    guideTitle: "How to measure bottoms",
    guideText:
      "Measure waist around the natural waist, hip around the fullest point, and inseam from crotch seam to hem.",
    guideImage: "/images/size-guides/bottoms.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "WAIST", "HIP", "INSEAM"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", WAIST: "70 cm", HIP: "88 cm", INSEAM: "77 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", WAIST: "76 cm", HIP: "92 cm", INSEAM: "78 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", WAIST: "82 cm", HIP: "98 cm", INSEAM: "79 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", WAIST: "88 cm", HIP: "104 cm", INSEAM: "80 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", WAIST: "94 cm", HIP: "110 cm", INSEAM: "81 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", WAIST: "100 cm", HIP: "116 cm", INSEAM: "82 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", WAIST: "106 cm", HIP: "122 cm", INSEAM: "83 cm" } },
    ],
  },
  {
    title: "Blazer",
    unit: "cm",
    guideTitle: "How to measure blazers",
    guideText:
      "Measure chest at the fullest point, waist at the natural waist, and shoulder width from seam to seam.",
    guideImage: "/images/size-guides/tops.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "CHEST", "WAIST", "SHOULDER"],
    rows: [
      { label: "44", sortOrder: 1, values: { SIZE: "44", CHEST: "88 cm", WAIST: "76 cm", SHOULDER: "41 cm" } },
      { label: "46", sortOrder: 2, values: { SIZE: "46", CHEST: "92 cm", WAIST: "80 cm", SHOULDER: "42 cm" } },
      { label: "48", sortOrder: 3, values: { SIZE: "48", CHEST: "96 cm", WAIST: "84 cm", SHOULDER: "44 cm" } },
      { label: "50", sortOrder: 4, values: { SIZE: "50", CHEST: "100 cm", WAIST: "88 cm", SHOULDER: "46 cm" } },
      { label: "52", sortOrder: 5, values: { SIZE: "52", CHEST: "104 cm", WAIST: "92 cm", SHOULDER: "47 cm" } },
      { label: "54", sortOrder: 6, values: { SIZE: "54", CHEST: "108 cm", WAIST: "96 cm", SHOULDER: "48 cm" } },
      { label: "56", sortOrder: 7, values: { SIZE: "56", CHEST: "112 cm", WAIST: "100 cm", SHOULDER: "49 cm" } },
    ],
  },
  {
    title: "Jacket",
    unit: "cm",
    guideTitle: "How to measure jackets",
    guideText:
      "Measure chest flat from armpit to armpit, jacket length from shoulder to hem, and sleeve from shoulder seam to cuff.",
    guideImage: "/images/size-guides/tops.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", CHEST: "88 cm", LENGTH: "64 cm", SLEEVE: "61 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", CHEST: "96 cm", LENGTH: "66 cm", SLEEVE: "62 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", CHEST: "104 cm", LENGTH: "68 cm", SLEEVE: "63 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", CHEST: "112 cm", LENGTH: "70 cm", SLEEVE: "64 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", CHEST: "120 cm", LENGTH: "72 cm", SLEEVE: "65 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", CHEST: "128 cm", LENGTH: "74 cm", SLEEVE: "66 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", CHEST: "136 cm", LENGTH: "76 cm", SLEEVE: "67 cm" } },
    ],
  },
  {
    title: "Dress",
    unit: "cm",
    guideTitle: "How to measure dresses",
    guideText:
      "Measure bust at the fullest point, waist at the natural waist, and hip at the fullest point.",
    guideImage: "/images/size-guides/dress.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "BUST", "WAIST", "HIP"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", BUST: "80 cm", WAIST: "62 cm", HIP: "90 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", BUST: "86 cm", WAIST: "68 cm", HIP: "94 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", BUST: "92 cm", WAIST: "74 cm", HIP: "100 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", BUST: "98 cm", WAIST: "80 cm", HIP: "106 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", BUST: "104 cm", WAIST: "86 cm", HIP: "112 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", BUST: "110 cm", WAIST: "92 cm", HIP: "118 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", BUST: "116 cm", WAIST: "98 cm", HIP: "124 cm" } },
    ],
  },
  {
    title: "Bikini",
    unit: "cm",
    guideTitle: "How to measure bikinis",
    guideText:
      "Measure bust at the fullest point, waist at the natural waist, and hip at the fullest point for the best swimwear fit.",
    guideImage: "/images/size-guides/dress.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "BUST", "WAIST", "HIP"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", BUST: "78-84 cm", WAIST: "60-66 cm", HIP: "84-90 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", BUST: "84-90 cm", WAIST: "66-72 cm", HIP: "90-96 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", BUST: "91-97 cm", WAIST: "73-79 cm", HIP: "97-103 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", BUST: "98-104 cm", WAIST: "80-86 cm", HIP: "104-110 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", BUST: "105-111 cm", WAIST: "87-93 cm", HIP: "111-117 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", BUST: "112-118 cm", WAIST: "94-100 cm", HIP: "118-124 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", BUST: "119-125 cm", WAIST: "101-107 cm", HIP: "125-131 cm" } },
    ],
  },
  {
    title: "Bra",
    unit: "cm",
    guideTitle: "How to measure bras",
    guideText:
      "Measure underbust snugly around the rib cage and bust around the fullest part of the chest.",
    guideImage: "/images/size-guides/bra.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "UNDERBUST", "BUST"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", UNDERBUST: "63-67 cm", BUST: "77-81 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", UNDERBUST: "68-73 cm", BUST: "82-88 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", UNDERBUST: "74-79 cm", BUST: "89-95 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", UNDERBUST: "80-85 cm", BUST: "96-102 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", UNDERBUST: "86-91 cm", BUST: "103-109 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", UNDERBUST: "92-97 cm", BUST: "110-116 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", UNDERBUST: "98-103 cm", BUST: "117-123 cm" } },
    ],
  },
  {
    title: "Brief",
    unit: "cm",
    guideTitle: "How to measure briefs",
    guideText:
      "Measure waist where the waistband sits and hip around the fullest point of the seat.",
    guideImage: "/images/size-guides/dress.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "WAIST", "HIP"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", WAIST: "66-72 cm", HIP: "84-90 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", WAIST: "72-78 cm", HIP: "90-96 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", WAIST: "79-85 cm", HIP: "97-103 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", WAIST: "86-92 cm", HIP: "104-110 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", WAIST: "93-99 cm", HIP: "111-117 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", WAIST: "100-106 cm", HIP: "118-124 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", WAIST: "107-113 cm", HIP: "125-131 cm" } },
    ],
  },
  {
    title: "Shoes",
    unit: "in",
    guideTitle: "How to measure shoes",
    guideText:
      "Measure foot length from heel to longest toe and compare it to the chart. If between sizes, size up.",
    guideImage: "/images/size-guides/shoes.png",
    tips: "Measure feet at the end of the day for the most accurate fit.",
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE US", "SIZE EUR", "FOOT LENGTH"],
    rows: [
      { label: "4", sortOrder: 1, values: { "SIZE US": "4", "SIZE EUR": "36", "FOOT LENGTH": "8.86 in" } },
      { label: "5", sortOrder: 2, values: { "SIZE US": "5", "SIZE EUR": "37", "FOOT LENGTH": "9.13 in" } },
      { label: "6", sortOrder: 3, values: { "SIZE US": "6", "SIZE EUR": "38", "FOOT LENGTH": "9.45 in" } },
      { label: "7", sortOrder: 4, values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "9.84 in" } },
      { label: "8", sortOrder: 5, values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "10.20 in" } },
      { label: "9", sortOrder: 6, values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "10.60 in" } },
      { label: "10", sortOrder: 7, values: { "SIZE US": "10", "SIZE EUR": "44", "FOOT LENGTH": "10.94 in" } },
      { label: "11", sortOrder: 8, values: { "SIZE US": "11", "SIZE EUR": "45", "FOOT LENGTH": "11.26 in" } },
      { label: "12", sortOrder: 9, values: { "SIZE US": "12", "SIZE EUR": "46", "FOOT LENGTH": "11.57 in" } },
      { label: "13", sortOrder: 10, values: { "SIZE US": "13", "SIZE EUR": "47", "FOOT LENGTH": "11.89 in" } },
      { label: "14", sortOrder: 11, values: { "SIZE US": "14", "SIZE EUR": "48", "FOOT LENGTH": "12.20 in" } },
    ],
  },
  {
    title: "Socks",
    unit: "cm",
    guideTitle: "How to size socks",
    guideText:
      "Use your usual shoe size to choose the best sock size range for fit and comfort.",
    guideImage: null,
    tips: "If you are between ranges, choose based on your usual shoe size and preferred fit.",
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SOCK SIZE", "FITS SHOE SIZE"],
    rows: [
      { label: "4-6", sortOrder: 1, values: { "SOCK SIZE": "4-6", "FITS SHOE SIZE": "US 4-6 / EU 36-38" } },
      { label: "6.5-9", sortOrder: 2, values: { "SOCK SIZE": "6.5-9", "FITS SHOE SIZE": "US 6.5-9 / EU 39-42" } },
      { label: "9.5-13", sortOrder: 3, values: { "SOCK SIZE": "9.5-13", "FITS SHOE SIZE": "US 9.5-13 / EU 43-47" } },
    ],
  },
  {
    title: "Headwear",
    unit: "cm",
    guideTitle: "How to measure headwear",
    guideText:
      "Wrap the measuring tape around the widest part of the head, just above the ears and across the forehead.",
    guideImage: "/images/size-guides/headwear.png",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["SIZE", "HEAD CIRCUMFERENCE"],
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", "HEAD CIRCUMFERENCE": "52-53 cm" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", "HEAD CIRCUMFERENCE": "54-55 cm" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", "HEAD CIRCUMFERENCE": "56-57 cm" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", "HEAD CIRCUMFERENCE": "58-59 cm" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", "HEAD CIRCUMFERENCE": "60-61 cm" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", "HEAD CIRCUMFERENCE": "62-63 cm" } },
      { label: "XXXL", sortOrder: 7, values: { SIZE: "XXXL", "HEAD CIRCUMFERENCE": "64-65 cm" } },
    ],
  },
  {
    title: "Ring Size",
    unit: "mm",
    guideTitle: "How to measure ring size",
    guideText:
      "Measure the inside diameter of a ring that fits or measure finger circumference and compare it to the chart.",
    guideImage: "/images/size-guides/ring.png",
    tips: "Measure fingers when they are at a normal temperature.",
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["RING SIZE", "DIAMETER", "CIRCUMFERENCE"],
    rows: [
      { label: "US 5", sortOrder: 1, values: { "RING SIZE": "US 5", DIAMETER: "15.7 mm", CIRCUMFERENCE: "49.3 mm" } },
      { label: "US 6", sortOrder: 2, values: { "RING SIZE": "US 6", DIAMETER: "16.5 mm", CIRCUMFERENCE: "51.9 mm" } },
      { label: "US 7", sortOrder: 3, values: { "RING SIZE": "US 7", DIAMETER: "17.3 mm", CIRCUMFERENCE: "54.4 mm" } },
    ],
  },
  {
    title: "Necklace Size",
    unit: "cm",
    guideTitle: "How to measure necklace size",
    guideText:
      "Measure around the neck where the necklace should sit and compare it with the chain length in the chart.",
    guideImage: "/images/size-guides/necklace.png",
    tips: "Chain length is the main fit field. Thickness is a secondary detail.",
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["STYLE", "NECKLACE LENGTH", "THICKNESS"],
    rows: [
      { label: "Choker", sortOrder: 1, values: { STYLE: "Choker", "NECKLACE LENGTH": "35 cm", THICKNESS: "2 mm" } },
      { label: "Princess", sortOrder: 2, values: { STYLE: "Princess", "NECKLACE LENGTH": "45 cm", THICKNESS: "2.5 mm" } },
      { label: "Matinee", sortOrder: 3, values: { STYLE: "Matinee", "NECKLACE LENGTH": "55 cm", THICKNESS: "3 mm" } },
    ],
  },
  {
    title: "Bracelet Size",
    unit: "cm",
    guideTitle: "How to measure bracelet size",
    guideText:
      "Measure wrist circumference snugly and compare it to bracelet length for the fit you want.",
    guideImage: "/images/size-guides/bracelet.png",
    tips: "Wrist and bracelet length are the main sizing fields. Width is optional product detail.",
    disclaimer: GLOBAL_DISCLAIMER,
    columns: ["FIT", "WRIST", "BRACELET LENGTH"],
    rows: [
      { label: "Small", sortOrder: 1, values: { FIT: "Small", WRIST: "14 cm", "BRACELET LENGTH": "16 cm" } },
      { label: "Medium", sortOrder: 2, values: { FIT: "Medium", WRIST: "16 cm", "BRACELET LENGTH": "18 cm" } },
      { label: "Large", sortOrder: 3, values: { FIT: "Large", WRIST: "18 cm", "BRACELET LENGTH": "20 cm" } },
    ],
  },
];

const DEFAULT_KEYWORD_RULES: DefaultKeywordRule[] = [
  { keyword: "top", field: "ANY", chartTitle: "Tops (product)", priority: 500 },
  { keyword: "tee", field: "ANY", chartTitle: "Tops (product)", priority: 500 },
  { keyword: "shirt", field: "ANY", chartTitle: "Tops (product)", priority: 500 },
  { keyword: "hoodie", field: "ANY", chartTitle: "Tops (product)", priority: 500 },
  { keyword: "hoodies", field: "ANY", chartTitle: "Tops (product)", priority: 500 },
  { keyword: "sweatshirt", field: "ANY", chartTitle: "Tops (product)", priority: 500 },
  { keyword: "sweater", field: "ANY", chartTitle: "Tops (product)", priority: 500 },
  { keyword: "blazer", field: "ANY", chartTitle: "Blazer", priority: 500 },
  { keyword: "jacket", field: "ANY", chartTitle: "Jacket", priority: 500 },
  { keyword: "dress", field: "ANY", chartTitle: "Dress", priority: 500 },
  { keyword: "gown", field: "ANY", chartTitle: "Dress", priority: 500 },
  { keyword: "bikini", field: "ANY", chartTitle: "Bikini", priority: 500 },
  { keyword: "bra", field: "ANY", chartTitle: "Bra", priority: 500 },
  { keyword: "brief", field: "ANY", chartTitle: "Brief", priority: 500 },
  { keyword: "underwear", field: "ANY", chartTitle: "Brief", priority: 500 },
  { keyword: "pant", field: "ANY", chartTitle: "Bottoms", priority: 500 },
  { keyword: "pants", field: "ANY", chartTitle: "Bottoms", priority: 500 },
  { keyword: "jean", field: "ANY", chartTitle: "Bottoms", priority: 500 },
  { keyword: "jeans", field: "ANY", chartTitle: "Bottoms", priority: 500 },
  { keyword: "short", field: "ANY", chartTitle: "Bottoms", priority: 500 },
  { keyword: "shorts", field: "ANY", chartTitle: "Bottoms", priority: 500 },
  { keyword: "skirt", field: "ANY", chartTitle: "Bottoms", priority: 500 },
  { keyword: "shoe", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "shoes", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "boot", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "boots", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "sneaker", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "sandal", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "sandals", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "sock", field: "ANY", chartTitle: "Socks", priority: 500 },
  { keyword: "socks", field: "ANY", chartTitle: "Socks", priority: 500 },
  { keyword: "no show sock", field: "ANY", chartTitle: "Socks", priority: 500 },
  { keyword: "crew sock", field: "ANY", chartTitle: "Socks", priority: 500 },
  { keyword: "ankle sock", field: "ANY", chartTitle: "Socks", priority: 500 },
  { keyword: "ring", field: "ANY", chartTitle: "Ring Size", priority: 500 },
  { keyword: "bracelet", field: "ANY", chartTitle: "Bracelet Size", priority: 500 },
  { keyword: "necklace", field: "ANY", chartTitle: "Necklace Size", priority: 500 },
  { keyword: "hat", field: "ANY", chartTitle: "Headwear", priority: 500 },
  { keyword: "cap", field: "ANY", chartTitle: "Headwear", priority: 500 },
];

const STARTER_LEGACY_ROW_LABELS = new Map<string, string[]>([
  ["Tops (product)", ["S", "M", "L", "XL"]],
  ["Bottoms", ["S", "M", "L", "XL"]],
  ["Blazer", ["46", "48", "50", "52"]],
  ["Jacket", ["S", "M", "L", "XL"]],
  ["Dress", ["S", "M", "L", "XL"]],
  ["Bikini", ["S", "M", "L", "XL"]],
  ["Bra", ["S", "M", "L", "XL"]],
  ["Brief", ["S", "M", "L", "XL"]],
  ["Shoes", ["6", "7", "8", "9"]],
  ["Headwear", ["S", "M", "L", "XL"]],
]);

async function upgradeLegacyStarterCharts(shopId: string) {
  const starterCharts = await prisma.sizeChart.findMany({
    where: {
      shopId,
      title: {
        in: Array.from(STARTER_LEGACY_ROW_LABELS.keys()),
      },
    },
    include: {
      rows: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  let upgradedAny = false;

  for (const chart of starterCharts) {
    const expectedLegacyLabels = STARTER_LEGACY_ROW_LABELS.get(chart.title);
    if (!expectedLegacyLabels) continue;

    const legacyLabels = chart.rows.map((row) => String(row.label || "").trim());
    const isLegacyStarterChart =
      legacyLabels.length === expectedLegacyLabels.length &&
      legacyLabels.every((label, index) => expectedLegacyLabels[index] === label);

    if (!isLegacyStarterChart) continue;

    const template = DEFAULT_CHART_TEMPLATES.find((item) => item.title === chart.title);
    if (!template) continue;

    await prisma.sizeChart.update({
      where: { id: chart.id },
      data: {
        unit: template.unit,
        guideTitle: template.guideTitle,
        guideText: template.guideText,
        guideImage: template.guideImage || null,
        tips: template.tips || null,
        disclaimer: template.disclaimer || null,
        columns: template.columns,
      },
    });

    await prisma.sizeChartRow.deleteMany({
      where: { chartId: chart.id },
    });

    await prisma.sizeChartRow.createMany({
      data: template.rows.map((row) => ({
        chartId: chart.id,
        label: row.label,
        sortOrder: row.sortOrder,
        values: row.values,
      })),
    });

    upgradedAny = true;
  }

  if (upgradedAny) {
    invalidateShopSizeChartCache(shopId);
  }
}

export async function ensureDefaultSizeChartsForShop(shopId: string) {
  let chartsChanged = false;
  const existingCount = await prisma.sizeChart.count({
    where: { shopId },
  });

  if (existingCount === 0) {
    for (const template of DEFAULT_CHART_TEMPLATES) {
      await prisma.sizeChart.create({
        data: {
          shopId,
          title: template.title,
          unit: template.unit,
          isDefault: Boolean(template.isDefault),
          guideTitle: template.guideTitle,
          guideText: template.guideText,
          guideImage: template.guideImage || null,
          showGuideImage: true,
          tips: template.tips || null,
          disclaimer: template.disclaimer || null,
          columns: template.columns,
          rows: {
            create: template.rows.map((row) => ({
              label: row.label,
              sortOrder: row.sortOrder,
              values: row.values,
            })),
          },
        },
      });
    }

    chartsChanged = true;
  }

  const existingKeywordRuleCount = await prisma.sizeKeywordRule.count({
    where: { shopId },
  });

  if (existingKeywordRuleCount === 0) {
    const charts = await prisma.sizeChart.findMany({
      where: { shopId },
      select: { id: true, title: true },
    });
    const chartByTitle = new Map(charts.map((chart) => [chart.title, chart.id]));

    for (const rule of DEFAULT_KEYWORD_RULES) {
      const chartId = chartByTitle.get(rule.chartTitle);
      if (!chartId) continue;

      await prisma.sizeKeywordRule.create({
        data: {
          shopId,
          chartId,
          keyword: rule.keyword,
          field: rule.field,
          priority: rule.priority,
          enabled: true,
        },
      });
    }

    chartsChanged = true;
  }

  await upgradeLegacyStarterCharts(shopId);

  if (chartsChanged) {
    invalidateShopSizeChartCache(shopId);
  }
}
