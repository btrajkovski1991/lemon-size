import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Lemon Size currently stores shop configuration, product-level matching context,
  // and aggregated storefront analytics. It does not store customer profiles,
  // customer contact details, addresses, or order-linked personal data that would
  // require customer-specific deletion here.
  await authenticate.webhook(request);

  return new Response(null, { status: 200 });
};
