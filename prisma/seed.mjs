import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP = process.env.SEED_SHOP || "kuze-web-test.myshopify.com";

async function main() {
  const shopRow = await prisma.shop.upsert({
    where: { shop: SHOP },
    update: {},
    create: { shop: SHOP },
  });

  // Clean old charts for this shop (optional)
  await prisma.sizeChartRow.deleteMany({
    where: { chart: { shopId: shopRow.id } },
  });
  await prisma.sizeChart.deleteMany({
    where: { shopId: shopRow.id },
  });

  const shoe = await prisma.sizeChart.create({
    data: {
      shopId: shopRow.id,
      title: "Shoes (US/EU/Foot length)",
      unit: "in",
      columns: ["SIZE US", "SIZE EUR", "FOOT LENGTH"],
      isDefault: false,
      rows: {
        create: [
          { label: "7", sortOrder: 1, values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "9.84" } },
          { label: "7.5", sortOrder: 2, values: { "SIZE US": "7.5", "SIZE EUR": "41", "FOOT LENGTH": "10" } },
          { label: "8", sortOrder: 3, values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "10.2" } },
          { label: "8.5", sortOrder: 4, values: { "SIZE US": "8.5", "SIZE EUR": "42", "FOOT LENGTH": "10.4" } },
          { label: "9", sortOrder: 5, values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "10.6" } },
          { label: "9.5", sortOrder: 6, values: { "SIZE US": "9.5", "SIZE EUR": "43", "FOOT LENGTH": "10.8" } },
          { label: "10", sortOrder: 7, values: { "SIZE US": "10", "SIZE EUR": "44", "FOOT LENGTH": "11" } },
        ],
      },
    },
  });

  const suit = await prisma.sizeChart.create({
    data: {
      shopId: shopRow.id,
      title: "Suits & Blazers (Chest/Waist)",
      unit: "cm",
      columns: ["CHEST", "WAIST"],
      isDefault: true,
      rows: {
        create: [
          { label: "46", sortOrder: 1, values: { CHEST: "92", WAIST: "80" } },
          { label: "48", sortOrder: 2, values: { CHEST: "96", WAIST: "84" } },
          { label: "50", sortOrder: 3, values: { CHEST: "100", WAIST: "88" } },
          { label: "52", sortOrder: 4, values: { CHEST: "104", WAIST: "92" } },
        ],
      },
    },
  });

  console.log("✅ Seeded charts for:", SHOP);
  console.log("  Shoe chartId:", shoe.id);
  console.log("  Suit chartId:", suit.id);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });