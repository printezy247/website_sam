import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { creditReferrer } from "@/lib/referral";
import { grantEntitlement, revokeEntitlement } from "@/lib/entitlements";
import { db } from "@/db";
import { orders, licenses, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TierKey } from "@/config/tiers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("not configured", { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await req.text(), sig, secret); }
  catch (e) { return new Response(`bad signature: ${(e as Error).message}`, { status: 400 }); }

  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object;
      const userId = cs.metadata?.userId ?? cs.client_reference_id;
      if (!userId) break;
      if (cs.mode === "payment" && cs.metadata?.productId) {
        await db.insert(orders).values({ userId, productId: cs.metadata.productId, provider: "stripe", externalId: cs.id, amountCents: cs.amount_total ?? 0, currency: cs.currency ?? "usd", status: "paid" }).onConflictDoNothing();
        const [p] = await db.select().from(products).where(eq(products.id, cs.metadata.productId));
        if (p?.type === "mt5_indicator") await db.insert(licenses).values({ userId, productId: p.id }).onConflictDoNothing();
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = sub.metadata?.userId; const tier = sub.metadata?.tier as TierKey | undefined;
      if (!userId || !tier) break;
      const active = ["active", "trialing", "past_due"].includes(sub.status);
      const periodEnd = sub.items.data[0]?.current_period_end;
      if (active) {
        await grantEntitlement({ userId, tierKey: tier, source: "stripe", externalId: sub.id, expiresAt: periodEnd ? new Date(periodEnd * 1000 + 3 * 864e5) : null });
        await creditReferrer(userId).catch((e) => console.error("[referral]", e));
      } else await revokeEntitlement(sub.id, "cancelled");
      break;
    }
    case "customer.subscription.deleted": {
      await revokeEntitlement(event.data.object.id, "cancelled");
      break;
    }
  }
  return Response.json({ received: true });
}
