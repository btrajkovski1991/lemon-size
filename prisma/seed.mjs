import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP = process.env.SEED_SHOP || "kuze-web-test.myshopify.com";

type Template = {
  title: string;
  unit: string;
  columns: string[];
  guideTitle?: string;
  guideText?: string;
  guideImage?: string;
  tips?: string;
  disclaimer?: string;
  rows: { label: string; sortOrder: number; values: Record<string, any> }[];
};

const DISCLAIMER_DEFAULT = `Sizes may vary by 2–3 cm due to manual measurement.
1 inch = 2.54 cm.
The size shown on a label may differ from the one ordered.`;

const TEMPLATES: Template[] = [
  {
    title: "Tops (product)",
    unit: "cm",
    columns: ["SIZE", "CHEST", "LENGTH", "SHOULDER", "SLEEVE"],
    guideTitle: "How to measure a top",
    guideImage: "/size-guides/tops.png",
    guideText: `Neck to Shoulder
Measure from the middle of the neck to the end of shoulder (where the sleeve starts).

Sleeve length (A)
Measure from the center back of collar to the end of shoulder.

Sleeve length (B)
Measure from the shoulder to the wrist.

Shoulder to Shoulder
Measure from one shoulder to another.

Chest
Measure around the fullest part. Keep the tape close under the arms and flat across the back.

Front Length
Measure from the highest point of the shoulder to the desired hemline.

Hem
Measure from one side to another above the elastic area (if any).

Sleeve cuff
Measure wrist circumference above elastic area and allow room for watches/jewelry.`,
    disclaimer: DISCLAIMER_DEFAULT,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", LENGTH: "64", CHEST: "91", SHOULDER: "35", SLEEVE: "53" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", LENGTH: "66", CHEST: "94", SHOULDER: "35.5", SLEEVE: "56" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", LENGTH: "69", CHEST: "96", SHOULDER: "36.5", SLEEVE: "58" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", LENGTH: "71", CHEST: "98", SHOULDER: "38", SLEEVE: "60" } },
    ],
  },

  {
    title: "Tops (body)",
    unit: "cm",
    columns: ["SIZE", "CHEST", "WAIST"],
    guideTitle: "How to measure your body (top)",
    guideImage: "/size-guides/tops.png",
    guideText: `Chest
Measure around the fullest part, tape under the arms and level across the back.

Waist
Measure around the narrowest point of your waist (natural waist).`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure pants (product)",
    guideImage: "/size-guides/bottoms.png",
    guideText: `Waist
Measure straight across the waistband.

Hip
Measure across the widest part of the hip area.

Inseam
Measure from crotch seam to bottom hem along the inside leg.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure your body (bottom)",
    guideImage: "/size-guides/bottoms.png",
    guideText: `Waist
Measure around your natural waist.

Hip
Measure around the fullest part of your hips/seat.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure a blazer",
    guideImage: "/size-guides/tops.png",
    guideText: `Chest
Measure around the fullest part of chest.

Waist
Measure around natural waist.

Shoulder
Measure across back from shoulder seam to shoulder seam.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure a jacket",
    guideImage: "/size-guides/tops.png",
    guideText: `Chest
Measure around the fullest part (or armpit-to-armpit if measuring product flat).

Length
Highest shoulder point down to hem.

Sleeve
Shoulder seam to cuff.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure underwear",
    guideImage: "/size-guides/bottoms.png",
    guideText: `Waist
Measure where the waistband usually sits.

Hip
Measure around the fullest part of your hips/seat.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure swimwear",
    guideImage: "/size-guides/dress.png",
    guideText: `Bust
Measure around the fullest part of the bust.

Waist
Measure around natural waist.

Hip
Measure around the fullest part of hips/seat.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure for a dress",
    guideImage: "/size-guides/dress.png",
    guideText: `Bust
Measure around the fullest part of bust.

Waist
Measure around natural waist.

Hip
Measure around fullest part of hips/seat.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure bra size",
    guideImage: "/size-guides/bra.png",
    guideText: `Underbust
Measure snugly around ribcage directly under bust.

Bust
Measure around the fullest part of bust (tape level).`,
    tips: "If between sizes, choose the larger band for comfort.",
    disclaimer: DISCLAIMER_DEFAULT,
    rows: [
      { label: "S", sortOrder: 1, values: { SIZE: "S", UNDERBUST: "68-73", BUST: "82-88" } },
      { label: "M", sortOrder: 2, values: { SIZE: "M", UNDERBUST: "74-79", BUST: "89-95" } },
      { label: "L", sortOrder: 3, values: { SIZE: "L", UNDERBUST: "80-85", BUST: "96-102" } },
    ],
  },

  {
    title: "Shoes",
    unit: "cm",
    columns: ["SIZE US", "SIZE EUR", "FOOT LENGTH"],
    guideTitle: "How to measure your foot",
    guideImage: "/size-guides/shoes.png",
    guideText: `Take a piece of paper and a pen or pencil.
Stand with your heels against the wall.
Stand upright, placing your weight on both feet.
Get someone else to draw a line at the tip of your longest toe.
Measure the length from the wall to the line.
Add 3–5 mm to the measured length (toe space).
Compare the foot length with the size chart.`,
    tips: "If you are between sizes, choose the larger size.",
    disclaimer: "Sizing varies by brand/last. Always allow 3–5 mm toe space.",
    rows: [
      { label: "7", sortOrder: 1, values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "25" } },
      { label: "7.5", sortOrder: 2, values: { "SIZE US": "7.5", "SIZE EUR": "41", "FOOT LENGTH": "25.5" } },
      { label: "8", sortOrder: 3, values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "26" } },
      { label: "8.5", sortOrder: 4, values: { "SIZE US": "8.5", "SIZE EUR": "42", "FOOT LENGTH": "26.5" } },
      { label: "9", sortOrder: 5, values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "27" } },
      { label: "9.5", sortOrder: 6, values: { "SIZE US": "9.5", "SIZE EUR": "43", "FOOT LENGTH": "27.5" } },
      { label: "10", sortOrder: 7, values: { "SIZE US": "10", "SIZE EUR": "44", "FOOT LENGTH": "28" } },
    ],
  },

  {
    title: "Pet clothing",
    unit: "cm",
    columns: ["SIZE", "NECK", "CHEST", "BACK"],
    guideTitle: "How to measure pet clothing",
    guideImage: "/size-guides/pet-clothing.png",
    guideText: `Neck
Measure around base of neck where collar sits (leave 1–2 fingers space).

Chest
Measure around the widest part of chest behind front legs.

Back
Measure from base of neck to base of tail.`,
    disclaimer: "For comfort, do not tighten the tape. If between sizes, size up.",
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
    guideTitle: "How to measure pet collar",
    guideImage: "/size-guides/pet-collar.png",
    guideText: `Measure around the neck where the collar sits.
Leave 1–2 fingers of space for comfort.`,
    disclaimer: "If your pet is between sizes, choose the larger size.",
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
    guideTitle: "How to measure headwear",
    guideImage: "/size-guides/headwear.png",
    guideText: `Wrap the measuring tape around your head
above the ears and across the forehead, keeping it level.`,
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure bracelet size",
    guideImage: "/size-guides/bracelet.png",
    guideText: `Measure around the wrist bone with a tape.
Add 0.5–1.5 cm depending on desired fit.`,
    tips: "For a looser fit, add more length.",
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure ring size",
    guideImage: "/size-guides/ring.png",
    guideText: `Measure the inside diameter of a ring that fits.
Use millimeters for accuracy.`,
    tips: "Measure at the end of the day if fingers swell.",
    disclaimer: DISCLAIMER_DEFAULT,
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
    guideTitle: "How to measure necklace length",
    guideImage: "/size-guides/necklace.png",
    guideText: `Measure an existing necklace end-to-end (including clasp),
or use a string around your neck to the desired drop and measure it.`,
    disclaimer: DISCLAIMER_DEFAULT,
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

  // Clean existing charts for this shop
  await prisma.sizeChartRow.deleteMany({
    where: { chart: { shopId: shopRow.id } },
  });
  await prisma.sizeChart.deleteMany({
    where: { shopId: shopRow.id } },
  );

  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];

    await prisma.sizeChart.create({
      data: {
        shopId: shopRow.id,
        title: t.title,
        unit: t.unit,
        columns: t.columns,
        isDefault: i === 0,

        // NEW guide fields
        guideTitle: t.guideTitle ?? null,
        guideText: t.guideText ?? null,
        guideImage: t.guideImage ?? null,
        tips: t.tips ?? null,
        disclaimer: t.disclaimer ?? null,

        rows: { create: t.rows },
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