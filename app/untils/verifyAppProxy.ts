import crypto from "node:crypto";

export function verifyShopifyAppProxy(url: URL, secret: string) {
  const params = new URLSearchParams(url.search);

  const provided = params.get("signature") || params.get("hmac") || params.get("HMAC");
  if (!provided) return { ok: false as const, reason: "Missing signature/hmac" };

  params.delete("signature");
  params.delete("hmac");
  params.delete("HMAC");

  const keys = Array.from(new Set(Array.from(params.keys()))).sort();

  const message = keys
    .flatMap((k) => params.getAll(k).map((v) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`))
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return { ok: false as const, reason: "Bad signature length" };

  return crypto.timingSafeEqual(a, b)
    ? { ok: true as const }
    : { ok: false as const, reason: "Invalid signature" };
}