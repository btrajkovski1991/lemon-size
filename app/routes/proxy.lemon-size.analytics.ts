import prisma from "../db.server";
import { json } from "../untils/http";
import { verifyShopifyAppProxy } from "../untils/verifyAppProxy";

function normalize(value?: string | null) {
  return String(value || "").trim();
}

function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!secret) return json({ ok: false, error: "Missing SHOPIFY_API_SECRET" }, { status: 500 });

    const verification = verifyShopifyAppProxy(url, secret);
    if (!verification.ok) {
      return json({ ok: false, error: "Unauthorized", reason: verification.reason }, { status: 401 });
    }

    const shopDomain = normalize(url.searchParams.get("shop"));
    const eventType = normalize(url.searchParams.get("event")) || "open";
    const chartId = normalize(url.searchParams.get("chart_id")) || null;
    const productId = normalize(url.searchParams.get("product_id")) || null;
    const productHandle = normalize(url.searchParams.get("product_handle")) || null;
    const productTitle = normalize(url.searchParams.get("product_title")) || null;

    if (!shopDomain || !chartId || eventType !== "open") {
      return new Response(null, { status: 204 });
    }

    const shop = await prisma.shop.upsert({
      where: { shop: shopDomain },
      update: {},
      create: { shop: shopDomain },
    });

    await prisma.$executeRaw`
      INSERT INTO "SizeGuideViewEvent" (
        "id",
        "shopId",
        "chartId",
        "productId",
        "productHandle",
        "productTitle",
        "eventType",
        "createdAt"
      ) VALUES (
        ${randomId()},
        ${shop.id},
        ${chartId},
        ${productId},
        ${productHandle},
        ${productTitle},
        ${eventType},
        NOW()
      )
    `;

    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[proxy.lemon-size.analytics] error", error);
    return new Response(null, { status: 204 });
  }
}
