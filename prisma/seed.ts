import prisma from "../app/db.server";

const SHOP = process.env.SEED_SHOP || "kuze-web-test.myshopify.com";

async function main() {
  const shopRow = await prisma.shop.upsert({
    where: { shop: SHOP },
    update: {},
    create: { shop: SHOP },
  });

  // Delete existing charts for clean re-seed (optional)
  await prisma.sizeChartRow.deleteMany({
    where: { chart: { shopId: shopRow.id } },
  });
  await prisma.sizeChart.deleteMany({
    where: { shopId: shopRow.id },
  });

  // Shoe chart
  const shoe = await prisma.sizeChart.create({
    data: {
      shopId: shopRow.id,
      title: "Shoes (EU)",
      unit: "cm",
      columns: ["Foot length", "EU"],
      isDefault: false,
      rows: {
        create: [
          { label: "40", sortOrder: 1, values: { "Foot length": 25.0, EU: 40 } },
          { label: "41", sortOrder: 2, values: { "Foot length": 25.7, EU: 41 } },
          { label: "42", sortOrder: 3, values: { "Foot length": 26.4, EU: 42 } },
        ],
      },
    },
  });

  // Suit chart
  const suit = await prisma.sizeChart.create({
    data: {
      shopId: shopRow.id,
      title: "Suits & Blazers",
      unit: "cm",
      columns: ["Chest", "Waist"],
      isDefault: false,
      rows: {
        create: [
          { label: "46", sortOrder: 1, values: { Chest: 92, Waist: 80 } },
          { label: "48", sortOrder: 2, values: { Chest: 96, Waist: 84 } },
          { label: "50", sortOrder: 3, values: { Chest: 100, Waist: 88 } },
        ],
      },
    },
  });

  console.log("Seeded charts for shop:", SHOP);
  console.log("Shoe:", shoe.id);
  console.log("Suit:", suit.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
