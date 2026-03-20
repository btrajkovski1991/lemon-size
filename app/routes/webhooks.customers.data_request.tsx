import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Lemon Size currently does not store customer personal data such as names,
  // emails, addresses, phone numbers, or order-linked customer profiles.
  // The app stores merchant configuration plus product/chart usage analytics only,
  // so there is no customer-specific dataset to export here.
  await authenticate.webhook(request);

  return new Response(null, { status: 200 });
};
