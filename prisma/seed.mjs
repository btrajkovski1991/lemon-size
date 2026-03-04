import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP = process.env.SEED_SHOP || "kuze-web-test.myshopify.com";

/**
 * 17 template charts (titles match your UI).
 * You can tune columns/units anytime.
 */
const TEMPLATES = [
  {
    title: "Tops (product)",
    unit: "cm",
    columns: ["SIZE", "CHEST", "LENGTH"],
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", CHEST: "92", LENGTH: "68" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", CHEST: "100", LENGTH: "70" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", CHEST: "108", LENGTH: "72" } },
    ],
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
  },
  {
    title: "Shoes",
    unit: "in",
    columns: ["SIZE US", "SIZE EUR", "FOOT LENGTH"],
    rows: [
      { label: "7", sortOrder: 1, values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "9.84" } },
      { label: "8", sortOrder: 2, values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "10.2" } },
      { label: "9", sortOrder: 3, values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "10.6" } },
    ],
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
  },
];

async function main() {
  const shopRow = await prisma.shop.upsert({
    where: { shop: SHOP },
    update: {},
    create: { shop: SHOP },
  });

  // OPTIONAL: clean existing charts for this shop
  await prisma.sizeChartRow.deleteMany({
    where: { chart: { shopId: shopRow.id } },
  });
  await prisma.sizeChart.deleteMany({
    where: { shopId: shopRow.id },
  });

  // Create charts
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];
    await prisma.sizeChart.create({
      data: {
        shopId: shopRow.id,
        title: t.title,
        unit: t.unit,
        columns: t.columns,
        isDefault: i === 0, // first one default (you can choose which)
        rows: {
          create: t.rows,
        },
      },
    });
  }

  console.log("✅ Seeded", TEMPLATES.length, "charts for:", SHOP);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });