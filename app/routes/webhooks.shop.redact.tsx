import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("shop/redact payload:", payload);

  if (shop) {
    await db.session.deleteMany({
      where: { shop },
    });
  }

  // Later:
  // delete all stored shop-related Lemon Size data here

  return new Response(null, { status: 200 });
};