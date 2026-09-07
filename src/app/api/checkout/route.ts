import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStripe, priceIdFor } from "@/lib/stripe";
import { BRAND } from "@/config/brand";
import { tierByKey, type TierKey } from "@/config/tiers";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  const body = await req.json() as { tier?: TierKey; interval?: "month" | "year"; product?: string };
  const success = `${BRAND.siteUrl}/account?paid=1`;
  const cancel = `${BRAND.siteUrl}/pricing`;
  const email = session.user.email ?? undefined;

  if (body.tier && tierByKey(body.tier)) {
    const price = priceIdFor(body.tier, body.interval ?? "month");
    if (!price) return NextResponse.json({ error: "price not configured" }, { status: 503 });
    const cs = await stripe.checkout.sessions.create({
      mode: "subscription", line_items: [{ price, quantity: 1 }], customer_email: email,
      success_url: success, cancel_url: cancel, client_reference_id: session.user.id,
      metadata: { userId: session.user.id, tier: body.tier },
      subscription_data: { metadata: { userId: session.user.id, tier: body.tier } },
    });
    return NextResponse.json({ url: cs.url });
  }
  if (body.product) {
    const [p] = await db.select().from(products).where(eq(products.slug, body.product));
    if (!p) return NextResponse.json({ error: "product not found" }, { status: 404 });
    const cs = await stripe.checkout.sessions.create({
      mode: p.billing === "monthly" ? "subscription" : "payment",
      line_items: [p.stripePriceId ? { price: p.stripePriceId, quantity: 1 } : {
        price_data: { currency: "usd", unit_amount: p.priceCents, product_data: { name: p.name }, ...(p.billing === "monthly" ? { recurring: { interval: "month" } } : {}) }, quantity: 1,
      }],
      customer_email: email, success_url: success, cancel_url: cancel, client_reference_id: session.user.id,
      metadata: { userId: session.user.id, productId: p.id },
    });
    return NextResponse.json({ url: cs.url });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
