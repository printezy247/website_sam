import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, signalFollows, signals, users } from "@/db/schema";
import { TIERS, tierByKey, type TierKey } from "@/config/tiers";
import { effectiveTier } from "@/lib/entitlements";
import { computeStats, type ClosedSignal } from "@/lib/stats";

/** Visibility levels a tier can read: its own rank and everything below. */
export function visibilitiesFor(tier: TierKey) {
  const rank = tierByKey(tier)?.rank ?? 0;
  return TIERS.filter((t) => t.rank <= rank).map((t) => t.key as string);
}

export async function memberSince(userId: string) {
  const [e] = await db.select({ at: sql<Date | null>`min(${entitlements.startsAt})` }).from(entitlements).where(eq(entitlements.userId, userId));
  if (e?.at) return new Date(e.at);
  const [u] = await db.select({ at: users.createdAt }).from(users).where(eq(users.id, userId));
  return u?.at ?? new Date();
}

export async function followedSignalIds(userId: string) {
  const rows = await db.select({ id: signalFollows.signalId }).from(signalFollows).where(eq(signalFollows.userId, userId));
  return new Set(rows.map((r) => r.id));
}

export async function toggleFollow(userId: string, signalId: string) {
  const tier = await effectiveTier(userId);
  const [s] = await db.select({ id: signals.id, visibility: signals.visibility }).from(signals).where(eq(signals.id, signalId));
  if (!s || !visibilitiesFor(tier).includes(s.visibility)) throw new Error("forbidden");
  const [f] = await db.select({ id: signalFollows.id }).from(signalFollows).where(and(eq(signalFollows.userId, userId), eq(signalFollows.signalId, signalId)));
  if (f) { await db.delete(signalFollows).where(eq(signalFollows.id, f.id)); return false; }
  await db.insert(signalFollows).values({ userId, signalId }).onConflictDoNothing();
  return true;
}

const toClosed = (r: typeof signals.$inferSelect): ClosedSignal => ({
  id: r.id, instrument: r.instrument, side: r.side, status: r.status,
  resultR: Number(r.resultR), resultPips: Number(r.resultPips ?? 0), closedAt: r.closedAt as Date,
});

export async function memberDashboard(userId: string) {
  const [tier, since, followed] = await Promise.all([effectiveTier(userId), memberSince(userId), followedSignalIds(userId)]);
  const vis = visibilitiesFor(tier);
  const recent = await db.select().from(signals).where(inArray(signals.visibility, vis)).orderBy(desc(signals.publishedAt)).limit(30);
  const closedAccessible = await db.select().from(signals)
    .where(and(inArray(signals.visibility, vis), isNotNull(signals.closedAt), isNotNull(signals.resultR), gte(signals.publishedAt, since)))
    .orderBy(signals.closedAt);
  const followedClosed = followed.size
    ? await db.select().from(signals).where(and(inArray(signals.id, [...followed]), isNotNull(signals.closedAt), isNotNull(signals.resultR))).orderBy(signals.closedAt)
    : [];
  const basis: "followed" | "accessible" = followed.size ? "followed" : "accessible";
  const rows = (basis === "followed" ? followedClosed : closedAccessible).map(toClosed);
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const stats = computeStats(rows);
  const monthR = rows.filter((r) => r.closedAt >= monthStart).reduce((s, r) => s + r.resultR, 0);
  const running = recent.filter((s) => s.status === "running").length;
  return { tier, since, vis, followed, recent, basis, stats, monthR, running, followedCount: followed.size };
}

export function maskName(name?: string | null, tg?: string | null) {
  if (tg) return `@${tg.slice(0, 2)}***`;
  const n = (name ?? "").trim();
  if (!n) return "Member";
  return `${n.slice(0, 2)}***`;
}

export type LeaderRow = { userId: string; label: string; activated: number; rank: number };

/** Referrers ranked by referred users who activated any non-referral entitlement (IB, Stripe, crypto). */
export async function referralLeaderboard(limit = 10, userId?: string) {
  const rows = await db.execute<{ user_id: string; name: string | null; tg_username: string | null; activated: string }>(sql`
    select r.id as user_id, r.name, r.tg_username, count(distinct u.id)::text as activated
    from "user" u
    join "user" r on r.id = u.referred_by
    where exists (select 1 from entitlements e where e.user_id = u.id and e.source in ('ib','stripe','crypto'))
    group by r.id, r.name, r.tg_username
    order by activated desc, r.created_at asc
  `);
  const list = [...rows].map((r, i) => ({ userId: r.user_id, label: maskName(r.name, r.tg_username), activated: Number(r.activated), rank: i + 1 }));
  const mine = userId ? list.find((r) => r.userId === userId) ?? null : null;
  return { top: list.slice(0, limit), mine, total: list.length };
}

export async function referralBonusDays(userId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(entitlements).where(and(eq(entitlements.userId, userId), sql`${entitlements.externalId} like 'ref:%'`));
  return (r?.n ?? 0) * 7;
}
