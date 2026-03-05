import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SHOP = process.env.SEED_SHOP || "kuze-web-test.myshopify.com";

// Put your real hosted URLs here later (Shopify Files / CDN / your app assets)
const GUIDE_BASE = "/images/size-guides";

type Template = {
  title: string;
  unit: string;
  columns: string[];
  rows: Array<{ label: string; sortOrder: number; values: Record<string, any> }>;
  guideTitle: string;
  guideText: string;
  guideSteps: string[];
  guideImageUrl: string;
  disclaimer: string;
};

const DISCLAIMER_DEFAULT =
  "Sizes can vary by 2–3 cm because they are measured by hand. 1 inch = 2.54 cm. The size on the label may differ from the one you ordered.";

const TEMPLATES: Template[] = [
  {
    title: "Tops (product)",
    unit: "cm",
    columns: ["SIZE", "CHEST", "LENGTH"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", CHEST: "92", LENGTH: "68" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", CHEST: "100", LENGTH: "70" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", CHEST: "108", LENGTH: "72" } },
    ],
    guideTitle: "How to measure (garment)",
    guideText: "Lay the garment flat on a table. Do not stretch the fabric.",
    guideSteps: [
      "Chest: measure across from armpit to armpit (flat).",
      "Length: measure from highest point of shoulder down to hem.",
      "Shoulder/Sleeve (optional): shoulder seam to seam; sleeve seam to cuff.",
    ],
    guideImageUrl: `${GUIDE_BASE}/tops.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Tops (body)",
    unit: "cm",
    columns: ["SIZE", "CHEST", "WAIST"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", CHEST: "90-95", WAIST: "78-82" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", CHEST: "96-101", WAIST: "83-87" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", CHEST: "102-107", WAIST: "88-92" } },
    ],
    guideTitle: "How to measure (body)",
    guideText: "Use a soft measuring tape. Keep it snug, not tight.",
    guideSteps: [
      "Chest: measure around the fullest part, tape under the arms and level across the back.",
      "Waist: measure around your natural waist (narrowest point).",
    ],
    guideImageUrl: `${GUIDE_BASE}/body-upper.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Bottoms (product)",
    unit: "cm",
    columns: ["SIZE", "WAIST", "HIP", "INSEAM"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", WAIST: "78", HIP: "94", INSEAM: "78" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", WAIST: "84", HIP: "100", INSEAM: "79" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", WAIST: "90", HIP: "106", INSEAM: "80" } },
    ],
    guideTitle: "How to measure (garment)",
    guideText: "Lay the pants flat. Measure straight lines; do not stretch.",
    guideSteps: [
      "Waist: measure across the waistband (flat).",
      "Hip: measure across the widest part below the zipper area (flat).",
      "Inseam: measure from crotch seam to bottom hem along inner leg.",
    ],
    guideImageUrl: `${GUIDE_BASE}/bottoms.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Bottoms (body)",
    unit: "cm",
    columns: ["SIZE", "WAIST", "HIP"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", WAIST: "76-81", HIP: "92-97" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", WAIST: "82-87", HIP: "98-103" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", WAIST: "88-93", HIP: "104-109" } },
    ],
    guideTitle: "How to measure (body)",
    guideText: "Stand relaxed with feet together.",
    guideSteps: [
      "Waist: measure around your natural waist (narrowest point).",
      "Hip: measure around the fullest part of hips/seat.",
    ],
    guideImageUrl: `${GUIDE_BASE}/body-lower.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Blazer",
    unit: "cm",
    columns: ["SIZE", "CHEST", "WAIST", "SHOULDER"],
    rows: [
      { label: "46", sortOrder: 1, values: { SIZE: "46", CHEST: "92", WAIST: "80", SHOULDER: "42" } },
      { label: "48", sortOrder: 2, values: { SIZE: "48", CHEST: "96", WAIST: "84", SHOULDER: "44" } },
      { label: "50", sortOrder: 3, values: { SIZE: "50", CHEST: "100", WAIST: "88", SHOULDER: "46" } },
    ],
    guideTitle: "How to measure (recommended)",
    guideText: "For blazers we recommend body measurements for best fit.",
    guideSteps: [
      "Chest: around the fullest part of chest.",
      "Waist: around natural waist.",
      "Shoulder: measure across back from shoulder point to shoulder point.",
    ],
    guideImageUrl: `${GUIDE_BASE}/tops.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Jacket",
    unit: "cm",
    columns: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", CHEST: "96", LENGTH: "66", SLEEVE: "62" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", CHEST: "104", LENGTH: "68", SLEEVE: "63" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", CHEST: "112", LENGTH: "70", SLEEVE: "64" } },
    ],
    guideTitle: "How to measure (garment)",
    guideText: "Lay the jacket flat for product measurements.",
    guideSteps: [
      "Chest: armpit to armpit (flat).",
      "Length: shoulder point to hem.",
      "Sleeve: shoulder seam to cuff (choose one method and keep it consistent).",
    ],
    guideImageUrl: `${GUIDE_BASE}/tops.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Brief",
    unit: "cm",
    columns: ["SIZE", "WAIST", "HIP"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", WAIST: "72-78", HIP: "90-96" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", WAIST: "79-85", HIP: "97-103" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", WAIST: "86-92", HIP: "104-110" } },
    ],
    guideTitle: "How to measure (body)",
    guideText: "Measure where the waistband normally sits.",
    guideSteps: [
      "Waist: measure around waistline where the brief sits.",
      "Hip: measure around the fullest part of hips/seat.",
    ],
    guideImageUrl: `${GUIDE_BASE}/underwear.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Bikini",
    unit: "cm",
    columns: ["SIZE", "BUST", "WAIST", "HIP"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", BUST: "84-90", WAIST: "66-72", HIP: "90-96" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", BUST: "91-97", WAIST: "73-79", HIP: "97-103" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", BUST: "98-104", WAIST: "80-86", HIP: "104-110" } },
    ],
    guideTitle: "How to measure (body)",
    guideText: "Tape should be level all around and not too tight.",
    guideSteps: [
      "Bust: around the fullest part of bust.",
      "Waist: around natural waist.",
      "Hip: around the fullest part of hips/seat.",
    ],
    guideImageUrl: `${GUIDE_BASE}/bikini.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Dress",
    unit: "cm",
    columns: ["SIZE", "BUST", "WAIST", "HIP"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", BUST: "84-90", WAIST: "66-72", HIP: "90-96" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", BUST: "91-97", WAIST: "73-79", HIP: "97-103" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", BUST: "98-104", WAIST: "80-86", HIP: "104-110" } },
    ],
    guideTitle: "How to measure (body)",
    guideText: "Use body measurements to pick the best dress size.",
    guideSteps: [
      "Bust: around fullest part.",
      "Waist: around narrowest point.",
      "Hip: around fullest part of hips/seat.",
    ],
    guideImageUrl: `${GUIDE_BASE}/dress.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Bra",
    unit: "cm",
    columns: ["SIZE", "UNDERBUST", "BUST"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", UNDERBUST: "68-73", BUST: "82-88" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", UNDERBUST: "74-79", BUST: "89-95" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", UNDERBUST: "80-85", BUST: "96-102" } },
    ],
    guideTitle: "How to measure a bra",
    guideText: "Measure with a non-padded bra for best accuracy.",
    guideSteps: [
      "Underbust: around ribcage directly under bust (snug).",
      "Bust: around fullest part of bust (level).",
      "If between sizes, choose the larger band for comfort.",
    ],
    guideImageUrl: `${GUIDE_BASE}/bra.png`,
    disclaimer: DISCLAIMER_DEFAULT,
  },
  {
    title: "Shoes",
    unit: "cm",
    columns: ["SIZE US", "SIZE EUR", "FOOT LENGTH"],
    rows: [
      { label: "7", sortOrder: 1, values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "25" } },
      { label: "7.5", sortOrder: 2, values: { "SIZE US": "7.5", "SIZE EUR": "41", "FOOT LENGTH": "25.5" } },
      { label: "8", sortOrder: 3, values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "26" } },
      { label: "8.5", sortOrder: 4, values: { "SIZE US": "8.5", "SIZE EUR": "42", "FOOT LENGTH": "26.5" } },
      { label: "9", sortOrder: 5, values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "27" } },
      { label: "9.5", sortOrder: 6, values: { "SIZE US": "9.5", "SIZE EUR": "43", "FOOT LENGTH": "27.5" } },
      { label: "10", sortOrder: 7, values: { "SIZE US": "10", "SIZE EUR": "44", "FOOT LENGTH": "28" } },
    ],
    guideTitle: "How to measure your feet",
    guideText: "Measure both feet. Use the longer one.",
    guideSteps: [
      "Place paper on floor against a wall. Stand with heel touching the wall.",
      "Mark the tip of your longest toe.",
      "Measure wall-to-mark distance.",
      "Add 3–5 mm for toe space, then match to the chart.",
    ],
    guideImageUrl: `${GUIDE_BASE}/shoes.png`,
    disclaimer:
      "Sizing may vary by brand/last. If between sizes, we recommend sizing up.",
  },
  {
    title: "Pet clothing",
    unit: "cm",
    columns: ["SIZE", "NECK", "CHEST", "BACK"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", NECK: "22", CHEST: "32", BACK: "25" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", NECK: "28", CHEST: "40", BACK: "30" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", NECK: "34", CHEST: "48", BACK: "35" } },
    ],
    guideTitle: "How to measure your pet",
    guideText: "Keep the tape comfortable (allow 1–2 fingers).",
    guideSteps: [
      "Neck: measure where the collar sits.",
      "Chest: measure widest part behind front legs.",
      "Back: base of neck to base of tail.",
    ],
    guideImageUrl: `${GUIDE_BASE}/pet-clothing.png`,
    disclaimer: "If between sizes, choose the larger size for comfort.",
  },
  {
    title: "Pet collar",
    unit: "cm",
    columns: ["SIZE", "NECK"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", NECK: "20-28" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", NECK: "28-36" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", NECK: "36-44" } },
    ],
    guideTitle: "How to measure a pet collar",
    guideText: "Measure where the collar sits.",
    guideSteps: [
      "Wrap tape around neck.",
      "Add room for 2 fingers (comfort fit).",
      "Match the range to the size.",
    ],
    guideImageUrl: `${GUIDE_BASE}/pet-collar.png`,
    disclaimer: "Do not choose a collar that is too tight.",
  },
  {
    title: "Headwear",
    unit: "cm",
    columns: ["SIZE", "HEAD CIRCUMFERENCE"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", "HEAD CIRCUMFERENCE": "54-56" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", "HEAD CIRCUMFERENCE": "56-58" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", "HEAD CIRCUMFERENCE": "58-60" } },
    ],
    guideTitle: "How to measure headwear",
    guideText: "Measure around your head where the hat sits.",
    guideSteps: [
      "Tape around forehead and above ears.",
      "Keep it level all around.",
      "Match cm to the chart.",
    ],
    guideImageUrl: `${GUIDE_BASE}/headwear.png`,
    disclaimer: "If between sizes, choose the larger size for comfort.",
  },
  {
    title: "Bracelet",
    unit: "cm",
    columns: ["SIZE", "WRIST CIRCUMFERENCE"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", "WRIST CIRCUMFERENCE": "15-16" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", "WRIST CIRCUMFERENCE": "16-17" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", "WRIST CIRCUMFERENCE": "17-18" } },
    ],
    guideTitle: "How to measure a bracelet",
    guideText: "Measure around the wrist bone area.",
    guideSteps: [
      "Wrap tape around wrist.",
      "Add 0.5–1.5 cm depending on desired fit (tight vs loose).",
    ],
    guideImageUrl: `${GUIDE_BASE}/bracelet.png`,
    disclaimer: "If you prefer a loose fit, size up.",
  },
  {
    title: "Ring",
    unit: "mm",
    columns: ["SIZE", "INNER DIAMETER"],
    rows: [
      { label: "6", sortOrder: 1, values: { SIZE: "6", "INNER DIAMETER": "16.5" } },
      { label: "7", sortOrder: 2, values: { SIZE: "7", "INNER DIAMETER": "17.3" } },
      { label: "8", sortOrder: 3, values: { SIZE: "8", "INNER DIAMETER": "18.1" } },
    ],
    guideTitle: "How to measure a ring",
    guideText: "Use a ring that already fits you well.",
    guideSteps: [
      "Measure the inner diameter in millimeters.",
      "If hands swell, measure at end of day.",
    ],
    guideImageUrl: `${GUIDE_BASE}/ring.png`,
    disclaimer: "If between sizes, choose the larger size.",
  },
  {
    title: "Necklace",
    unit: "cm",
    columns: ["SIZE", "LENGTH"],
    rows: [
      { label: "Short", sortOrder: 1, values: { SIZE: "Short", LENGTH: "40" } },
      { label: "Mid", sortOrder: 2, values: { SIZE: "Mid", LENGTH: "45" } },
      { label: "Long", sortOrder: 3, values: { SIZE: "Long", LENGTH: "50" } },
    ],
    guideTitle: "How to measure a necklace",
    guideText: "Measure an existing necklace or use a string.",
    guideSteps: [
      "Measure end-to-end including clasp, OR",
      "Wrap a string around your neck to preferred drop and measure the string length.",
    ],
    guideImageUrl: `${GUIDE_BASE}/necklace.png`,
    disclaimer: "Length preference depends on styling; choose what feels best.",
  },
];

async function main() {
  const shopRow = await prisma.shop.upsert({
    where: { shop: SHOP },
    update: {},
    create: { shop: SHOP },
  });

  // Clean existing charts for this shop
  await prisma.sizeChartRow.deleteMany({
    where: { chart: { shopId: shopRow.id } },
  });
  await prisma.sizeChart.deleteMany({
    where: { shopId: shopRow.id },
  });

  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];

    await prisma.sizeChart.create({
      data: {
        shopId: shopRow.id,
        title: t.title,
        unit: t.unit,
        columns: t.columns,
        isDefault: i === 0,

        guideTitle: t.guideTitle,
        guideText: t.guideText,
        guideSteps: t.guideSteps,
        guideImageUrl: t.guideImageUrl,
        disclaimer: t.disclaimer,

        rows: { create: t.rows },
      },
    });
  }

  console.log("✅ Seeded", TEMPLATES.length, "charts (+ guides) for:", SHOP);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });