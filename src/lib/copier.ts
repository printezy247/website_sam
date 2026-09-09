import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { copierLinks, copierTrades, licenses, products, signals } from "@/db/schema";
import { canAccessProduct } from "@/lib/access";
import { effectiveTier } from "@/lib/entitlements";
import { TIERS, tierByKey } from "@/config/tiers";

export const COPIER_SLUG = "telegram-mt5-copier";

/** The copier product row, or null when the store has no copier. */
export async function copierProduct() {
  const [p] = await db.select().from(products).where(eq(products.slug, COPIER_SLUG)).catch(() => []);
  return p ?? null;
}

/**
 * The member's copier licence, created on first ask when their rank includes the copier
 * or they have paid for it. The licence id is the key they paste into MT5.
 */
export async function ensureCopierLicense(userId: string) {
  const p = await copierProduct();
  if (!p) return null;
  const [existing] = await db.select().from(licenses).where(and(eq(licenses.userId, userId), eq(licenses.productId, p.id)));
  if (existing) return existing;
  const { ok } = await canAccessProduct(userId, p.id);
  if (!ok) return null;
  const [made] = await db.insert(licenses).values({ userId, productId: p.id, maxActivations: 2 }).returning();
  return made ?? null;
}

/** The member's terminal links, newest first. */
export async function copierLinksOf(userId: string) {
  return db.select().from(copierLinks).where(eq(copierLinks.userId, userId)).orderBy(desc(copierLinks.createdAt)).catch(() => []);
}

/** A terminal counts as connected when it called in within the last three minutes. */
export function isLive(lastSeenAt: Date | null) {
  return Boolean(lastSeenAt && Date.now() - lastSeenAt.getTime() < 3 * 60_000);
}

/** Signal visibilities a rank may copy: its own and everything below it. */
export function visibleTiersFor(tier: string) {
  const rank = tierByKey(tier)?.rank ?? 0;
  return ["public", ...TIERS.filter((t) => t.rank <= rank).map((t) => t.key)];
}

export type Command =
  | { id: string; action: "open"; signal: string; symbol: string; side: "buy" | "sell"; entry: number; sl: number; tps: number[]; type: string; published: string }
  | { id: string; action: "close"; signal: string; reason: string }
  | { id: string; action: "move_sl"; signal: string; sl: number };

/**
 * What a terminal should do next. Signals it has not opened yet become open commands;
 * signals it holds that we have since closed become close commands. Everything is keyed by
 * signal id, so a terminal that misses a poll catches up on the next one.
 */
export async function commandsFor(link: typeof copierLinks.$inferSelect): Promise<Command[]> {
  const tier = await effectiveTier(link.userId);
  const rows = await db
    .select()
    .from(signals)
    .where(and(inArray(signals.visibility, visibleTiersFor(tier)), gt(signals.publishedAt, link.createdAt)))
    .orderBy(desc(signals.publishedAt))
    .limit(40);
  if (!rows.length) return [];

  const seen = await db
    .select({ signalId: copierTrades.signalId, action: copierTrades.action, status: copierTrades.status })
    .from(copierTrades)
    .where(and(eq(copierTrades.linkId, link.id), inArray(copierTrades.signalId, rows.map((r) => r.id))));
  const opened = new Set(seen.filter((s) => s.action === "open" && s.status !== "rejected").map((s) => s.signalId));
  const closed = new Set(seen.filter((s) => s.action === "close").map((s) => s.signalId));

  const out: Command[] = [];
  for (const s of rows) {
    const done = s.status !== "running";
    if (!opened.has(s.id) && !done) {
      out.push({
        id: `open:${s.id}`, action: "open", signal: s.id,
        symbol: s.instrument, side: s.side === "sell" ? "sell" : "buy",
        entry: Number(s.entry), sl: Number(s.sl),
        tps: [s.tp1, s.tp2, s.tp3].filter(Boolean).map(Number),
        type: s.type, published: s.publishedAt.toISOString(),
      });
    } else if (opened.has(s.id) && done && !closed.has(s.id)) {
      out.push({ id: `close:${s.id}`, action: "close", signal: s.id, reason: s.status });
    }
  }
  return out.reverse(); // oldest first, so a terminal catching up places them in order
}
