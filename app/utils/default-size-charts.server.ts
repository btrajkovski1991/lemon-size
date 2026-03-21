import prisma from "../db.server";

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

const GLOBAL_DISCLAIMER =
  "Sizes can vary slightly depending on brand and measuring method. If you are between sizes, choose the larger size for comfort.";

const GLOBAL_TIPS =
  "Use a soft measuring tape and compare your measurements carefully with the chart.";

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
      { label: "S", sortOrder: 1, values: { SIZE: "S", CHEST: "92 cm", LENGTH: "68 cm" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", CHEST: "100 cm", LENGTH: "70 cm" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", CHEST: "108 cm", LENGTH: "72 cm" } },
      { label: "XL", sortOrder: 4, values: { SIZE: "XL", CHEST: "116 cm", LENGTH: "74 cm" } },
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
      { label: "S", sortOrder: 1, values: { SIZE: "S", WAIST: "76 cm", HIP: "92 cm", INSEAM: "78 cm" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", WAIST: "82 cm", HIP: "98 cm", INSEAM: "79 cm" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", WAIST: "88 cm", HIP: "104 cm", INSEAM: "80 cm" } },
      { label: "XL", sortOrder: 4, values: { SIZE: "XL", WAIST: "94 cm", HIP: "110 cm", INSEAM: "81 cm" } },
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
      { label: "S", sortOrder: 1, values: { SIZE: "S", BUST: "86 cm", WAIST: "68 cm", HIP: "94 cm" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", BUST: "92 cm", WAIST: "74 cm", HIP: "100 cm" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", BUST: "98 cm", WAIST: "80 cm", HIP: "106 cm" } },
      { label: "XL", sortOrder: 4, values: { SIZE: "XL", BUST: "104 cm", WAIST: "86 cm", HIP: "112 cm" } },
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
      { label: "S", sortOrder: 1, values: { SIZE: "S", UNDERBUST: "68-73 cm", BUST: "82-88 cm" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", UNDERBUST: "74-79 cm", BUST: "89-95 cm" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", UNDERBUST: "80-85 cm", BUST: "96-102 cm" } },
      { label: "XL", sortOrder: 4, values: { SIZE: "XL", UNDERBUST: "86-91 cm", BUST: "103-109 cm" } },
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
      { label: "6", sortOrder: 1, values: { "SIZE US": "6", "SIZE EUR": "38", "FOOT LENGTH": "9.45 in" } },
      { label: "7", sortOrder: 2, values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "9.84 in" } },
      { label: "8", sortOrder: 3, values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "10.20 in" } },
      { label: "9", sortOrder: 4, values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "10.60 in" } },
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
      { label: "S", sortOrder: 1, values: { SIZE: "S", "HEAD CIRCUMFERENCE": "54-55 cm" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", "HEAD CIRCUMFERENCE": "56-57 cm" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", "HEAD CIRCUMFERENCE": "58-59 cm" } },
      { label: "XL", sortOrder: 4, values: { SIZE: "XL", "HEAD CIRCUMFERENCE": "60-61 cm" } },
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

export async function ensureDefaultSizeChartsForShop(shopId: string) {
  const existingCount = await prisma.sizeChart.count({
    where: { shopId },
  });

  if (existingCount > 0) return;

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
}
