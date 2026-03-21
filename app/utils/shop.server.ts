import prisma from "../db.server";
import { ensureDefaultSizeChartsForShop } from "./default-size-charts.server";

export async function getOrCreateShopRow(shopDomain: string) {
  const shopRow = await prisma.shop.upsert({
    where: { shop: shopDomain },
    update: {},
    create: { shop: shopDomain },
  });

  await ensureDefaultSizeChartsForShop(shopRow.id);
  return shopRow;
}
