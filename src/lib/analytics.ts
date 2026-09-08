import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, leads, telegramAccounts, users, visits } from "@/db/schema";

export const DIRECT = "(direct)";
const day = (d = new Date()) => d.toISOString().slice(0, 10);

export async function recordVisit(input: { campaign?: string | null; path: string }) {
  const campaign = (input.campaign || DIRECT).slice(0, 48);
  const path = input.path.replace(/^\/(en|ms)(?=\/|$)/, "").slice(0, 120) || "/";
  await db.insert(visits).values({ day: day(), campaign, path, hits: 1 })
    .onConflictDoUpdate({ target: [visits.day, visits.campaign, visits.path], set: { hits: sql`${visits.hits} + 1` } });
}

/** Attach first-touch campaign to a user once (from the `camp` cookie). */
export async function attachCampaign(userId: string, camp: string | null | undefined) {
  if (!camp) return;
  await db.update(users).set({ campaign: camp }).where(and(eq(users.id, userId), sql`${users.campaign} is null`));
}

export type CampaignRow = { campaign: string; visits: number; leads: number; tgStarts: number; signups: number; activations: number };

/** Funnel per campaign over the last `days` days (visits) with all-time downstream counts. */
export async function campaignFunnel(days = 30): Promise<CampaignRow[]> {
  const since = day(new Date(Date.now() - days * 864e5));
  const [v, l, tg, su, act] = await Promise.all([
    db.select({ campaign: visits.campaign, n: sql<number>`sum(${visits.hits})::int` }).from(visits).where(gte(visits.day, since)).groupBy(visits.campaign),
    db.select({ campaign: leads.source, n: sql<number>`count(*)::int` }).from(leads).groupBy(leads.source),
    db.select({ campaign: telegramAccounts.campaign, n: sql<number>`count(*)::int` }).from(telegramAccounts).groupBy(telegramAccounts.campaign),
    db.select({ campaign: users.campaign, n: sql<number>`count(*)::int` }).from(users).groupBy(users.campaign),
    db.select({ campaign: users.campaign, n: sql<number>`count(distinct ${users.id})::int` }).from(users)
      .innerJoin(entitlements, eq(entitlements.userId, users.id)).where(inArray(entitlements.source, ["ib", "stripe", "crypto"])).groupBy(users.campaign),
  ]);
  const m = new Map<string, CampaignRow>();
  const row = (c: string | null) => { const k = c || DIRECT; if (!m.has(k)) m.set(k, { campaign: k, visits: 0, leads: 0, tgStarts: 0, signups: 0, activations: 0 }); return m.get(k)!; };
  for (const r of v) row(r.campaign).visits += r.n;
  for (const r of l) row(r.campaign).leads += r.n;
  for (const r of tg) row(r.campaign).tgStarts += r.n;
  for (const r of su) row(r.campaign).signups += r.n;
  for (const r of act) row(r.campaign).activations += r.n;
  return [...m.values()].sort((a, b) => b.visits - a.visits || b.activations - a.activations);
}

export async function dailyVisits(days = 14) {
  const since = day(new Date(Date.now() - days * 864e5));
  const rows = await db.select({ day: visits.day, n: sql<number>`sum(${visits.hits})::int` }).from(visits).where(gte(visits.day, since)).groupBy(visits.day).orderBy(visits.day);
  const out: { day: string; n: number }[] = [];
  for (let i = days; i >= 0; i--) { const d = day(new Date(Date.now() - i * 864e5)); out.push({ day: d, n: rows.find((r) => r.day === d)?.n ?? 0 }); }
  return out;
}

export async function topPaths(days = 30, limit = 10) {
  const since = day(new Date(Date.now() - days * 864e5));
  return db.select({ path: visits.path, n: sql<number>`sum(${visits.hits})::int` }).from(visits).where(gte(visits.day, since)).groupBy(visits.path).orderBy(desc(sql`sum(${visits.hits})`)).limit(limit);
}
