import { createHmac } from "node:crypto";

const API = "https://api.nowpayments.io/v1";

export function npConfigured() {
  return Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET);
}

export async function createInvoice(args: { priceUsd: number; orderId: string; description: string; successUrl: string; cancelUrl: string; ipnUrl: string }) {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPayments not configured");
  const r = await fetch(`${API}/invoice`, {
    method: "POST", headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      price_amount: args.priceUsd, price_currency: "usd", pay_currency: "usdttrc20",
      order_id: args.orderId, order_description: args.description,
      ipn_callback_url: args.ipnUrl, success_url: args.successUrl, cancel_url: args.cancelUrl,
    }),
  });
  const j = (await r.json()) as { id?: string; invoice_url?: string; message?: string };
  if (!r.ok || !j.invoice_url) throw new Error(j.message ?? `NOWPayments ${r.status}`);
  return { id: String(j.id), url: j.invoice_url };
}

/** IPN signature = HMAC-SHA512(secret, JSON with keys sorted recursively). */
export function verifyIpn(rawBody: string, signature: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;
  const sorted = JSON.stringify(sortKeys(JSON.parse(rawBody)));
  const expected = createHmac("sha512", secret).update(sorted).digest("hex");
  return expected.length === signature.length && timingSafeEq(expected, signature);
}
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  return v;
}
function timingSafeEq(a: string, b: string) { let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
