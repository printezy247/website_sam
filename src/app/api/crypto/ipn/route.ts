import { eq } from "drizzle-orm";
import { db } from "@/db";
import { licenses, orders, products } from "@/db/schema";
import { verifyIpn } from "@/lib/nowpayments";
import { creditReferrer } from "@/lib/referral";
import { grantEntitlement } from "@/lib/entitlements";
import type { TierKey } from "@/config/tiers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyIpn(raw, req.headers.get("x-nowpayments-sig"))) return new Response("bad signature", { status: 401 });
  const p = JSON.parse(raw) as { payment_id: number | string; payment_status: string; order_id: string };
  const [order] = await db.select().from(orders).where(eq(orders.id, p.order_id));
  if (!order) return new Response("unknown order", { status: 404 });
  if (p.payment_status !== "finished") {
    if (["failed", "expired", "refunded"].includes(p.payment_status)) await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return Response.json({ ok: true });
  }
  if (order.status === "paid") return Response.json({ ok: true }); // idempotent
  await db.update(orders).set({ status: "paid", externalId: `np:${p.payment_id}` }).where(eq(orders.id, order.id));
  if (order.tierKey && order.userId) {
    const interval = (order.meta as { interval?: string } | null)?.interval ?? "month";
    const days = interval === "year" ? 365 : 30;
    await grantEntitlement({ userId: order.userId, tierKey: order.tierKey as TierKey, source: "crypto", externalId: `np:${p.payment_id}`, expiresAt: new Date(Date.now() + days * 864e5) });
    await creditReferrer(order.userId).catch((e) => console.error("[referral]", e));
  } else if (order.productId && order.userId) {
    const [prod] = await db.select().from(products).where(eq(products.id, order.productId));
    if (prod?.type === "mt5_indicator") await db.insert(licenses).values({ userId: order.userId, productId: prod.id }).onConflictDoNothing();
  }
  return Response.json({ ok: true });
}
