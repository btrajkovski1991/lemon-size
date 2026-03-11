import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const currentScopes = Array.isArray(payload.current) ? payload.current.join(",") : "";

  if (session) {
    await db.session.update({
      where: { id: session.id },
      data: {
        scope: currentScopes,
      },
    });
  }

  return new Response(null, { status: 200 });
};