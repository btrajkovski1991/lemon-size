import crypto from "node:crypto";

export function verifyShopifyAppProxy(url: URL, secret: string) {
  const params = new URLSearchParams(url.search);

  const signature = params.get("signature");
  if (!signature) {
    return { ok: false as const, reason: "Missing signature" };
  }

  // Remove signature before computing HMAC
  params.delete("signature");

  // Sort parameters alphabetically (key then value)
  const sorted = [...params.entries()].sort(([aK, aV], [bK, bV]) => {
    const k = aK.localeCompare(bK);
    return k !== 0 ? k : aV.localeCompare(bV);
  });

  // IMPORTANT: concatenate without separators
  const message = sorted.map(([k, v]) => `${k}=${v}`).join("");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");

  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) {
      return { ok: false as const, reason: "Bad signature length" };
    }

    return crypto.timingSafeEqual(a, b)
      ? { ok: true as const }
      : { ok: false as const, reason: "Invalid signature" };
  } catch {
    return { ok: false as const, reason: "Signature compare failed" };
  }
}