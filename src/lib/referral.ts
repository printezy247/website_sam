import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, users } from "@/db/schema";
import { effectiveTier, grantEntitlement } from "@/lib/entitlements";

const CREDIT_DAYS = 7;

/** Attach referrer once (never self, never overwrite). */
export async function attachReferrer(userId: string, code: string | null | undefined) {
  if (!code) return;
  const [ref] = await db.select({ id: users.id }).from(users).where(and(eq(users.referralCode, code), ne(users.id, userId)));
  if (!ref) return;
  await db.update(users).set({ referredBy: ref.id }).where(and(eq(users.id, userId), isNull(users.referredBy)));
}

/** Called when `userId` gains a paid/IB entitlement: credit referrer once per referred user. */
export async function creditReferrer(userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u?.referredBy) return;
  const externalId = `ref:${userId}`;
  const [exists] = await db.select({ id: entitlements.id }).from(entitlements).where(eq(entitlements.externalId, externalId));
  if (exists) return;
  const tier = await effectiveTier(u.referredBy);
  if (tier === "public") return;
  await grantEntitlement({ userId: u.referredBy, tierKey: tier, source: "manual", externalId, expiresAt: new Date(Date.now() + CREDIT_DAYS * 864e5) });
}
