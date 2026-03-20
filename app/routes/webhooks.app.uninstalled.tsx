import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { invalidateShopSizeChartCache } from "../utils/size-chart-cache.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);

  if (shop) {
    const shopRow = await db.shop.findUnique({
      where: { shop },
      select: { id: true },
    });

    if (shopRow) {
      invalidateShopSizeChartCache(shopRow.id);
      await db.shop.delete({
        where: { id: shopRow.id },
      });
    }

    await db.session.deleteMany({
      where: { shop },
    });
  }

  return new Response(null, { status: 200 });
};
