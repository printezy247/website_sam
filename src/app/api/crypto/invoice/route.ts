import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { BRAND } from "@/config/brand";
import { tierByKey, type TierKey } from "@/config/tiers";
import { createInvoice, npConfigured } from "@/lib/nowpayments";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!npConfigured()) return NextResponse.json({ error: "crypto payments not configured" }, { status: 503 });
  const body = (await req.json()) as { tier?: TierKey; interval?: "month" | "year"; product?: string };
  let amountCents = 0, description = "", productId: string | null = null, tierKey: string | null = null;
  const interval = body.interval ?? "month";
  if (body.tier && tierByKey(body.tier)) {
    const t = tierByKey(body.tier)!;
    amountCents = interval === "year" ? t.priceYearCents : t.priceMonthCents;
    description = `${BRAND.name} ${t.key.toUpperCase()} (${interval})`; tierKey = t.key;
  } else if (body.product) {
    const [p] = await db.select().from(products).where(eq(products.slug, body.product));
    if (!p) return NextResponse.json({ error: "product not found" }, { status: 404 });
    amountCents = p.priceCents; description = p.name; productId = p.id;
  } else return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (amountCents <= 0) return NextResponse.json({ error: "free item" }, { status: 400 });

  const [order] = await db.insert(orders).values({
    userId: session.user.id, productId, tierKey, provider: "crypto", amountCents, status: "pending",
    meta: { interval },
  }).returning();
  try {
    const inv = await createInvoice({
      priceUsd: amountCents / 100, orderId: order.id, description,
      successUrl: `${BRAND.siteUrl}/account?paid=1`, cancelUrl: `${BRAND.siteUrl}/pricing`,
      ipnUrl: `${BRAND.siteUrl}/api/crypto/ipn`,
    });
    await db.update(orders).set({ externalId: `np:${inv.id}` }).where(eq(orders.id, order.id));
    return NextResponse.json({ url: inv.url });
  } catch (e) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
