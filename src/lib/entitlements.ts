import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { entitlements } from "@/db/schema";
import { higherTier, tierHas, type FeatureKey, type TierKey } from "@/config/tiers";

export type GrantInput = {
  userId: string;
  tierKey: TierKey;
  source: "ib" | "stripe" | "crypto" | "manual";
  externalId?: string;
  expiresAt?: Date | null;
};

/** Idempotent on externalId: re-running for the same id updates instead of duplicating. */
export async function grantEntitlement(input: GrantInput) {
  const row = {
    userId: input.userId,
    tierKey: input.tierKey,
    source: input.source,
    externalId: input.externalId ?? null,
    expiresAt: input.expiresAt ?? null,
    status: "active",
  };
  if (input.externalId) {
    const [r] = await db.insert(entitlements).values(row)
      .onConflictDoUpdate({ target: entitlements.externalId, set: { tierKey: row.tierKey, expiresAt: row.expiresAt, status: "active" } })
      .returning();
    return r;
  }
  const [r] = await db.insert(entitlements).values(row).returning();
  return r;
}

export async function revokeEntitlement(externalId: string, status: "expired" | "cancelled" = "cancelled") {
  await db.update(entitlements).set({ status }).where(eq(entitlements.externalId, externalId));
}

export async function activeEntitlements(userId: string) {
  const now = new Date();
  return db.select().from(entitlements).where(and(
    eq(entitlements.userId, userId), eq(entitlements.status, "active"),
    or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
  ));
}

/** Effective tier = highest active entitlement. */
export async function effectiveTier(userId: string): Promise<TierKey> {
  const rows = await activeEntitlements(userId);
  return rows.reduce<TierKey>((acc, r) => higherTier(acc, r.tierKey as TierKey), "public");
}

export async function userHasFeature(userId: string, feature: FeatureKey) {
  return tierHas(await effectiveTier(userId), feature);
}
