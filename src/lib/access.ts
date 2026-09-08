import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { effectiveTier } from "@/lib/entitlements";
import { tierByKey } from "@/config/tiers";

/** A user can access a product when their tier includes it or they paid for it. */
export async function canAccessProduct(userId: string, productId: string) {
  const [p] = await db.select().from(products).where(eq(products.id, productId));
  if (!p) return { ok: false as const, product: null };
  if (p.priceCents === 0) return { ok: true as const, product: p };
  if (p.tierIncluded) {
    const tier = await effectiveTier(userId);
    if ((tierByKey(tier)?.rank ?? 0) >= (tierByKey(p.tierIncluded as "free")?.rank ?? 99)) return { ok: true as const, product: p };
  }
  const [paid] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.userId, userId), eq(orders.productId, productId), eq(orders.status, "paid")));
  return { ok: Boolean(paid), product: p };
}

/** Products the user can download right now. */
export async function accessibleProducts(userId: string) {
  const all = await db.select().from(products).where(eq(products.active, true));
  const out = [];
  for (const p of all) { if ((await canAccessProduct(userId, p.id)).ok) out.push(p); }
  return out;
}
