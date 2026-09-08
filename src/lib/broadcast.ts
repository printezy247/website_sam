import { and, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, entitlements, users } from "@/db/schema";
import { getBot } from "@/lib/telegram";

/** Resolve recipients: telegram ids of users whose active tier is in `tiers` (or everyone linked when empty). */
export async function recipientsFor(segment: { tiers?: string[]; locales?: string[] }) {
  const now = new Date();
  const rows = await db.select({ tg: users.telegramId, locale: users.locale, tier: entitlements.tierKey }).from(users)
    .leftJoin(entitlements, and(eq(entitlements.userId, users.id), eq(entitlements.status, "active"), or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now))))
    .where(and(isNotNull(users.telegramId), segment.locales?.length ? inArray(users.locale, segment.locales) : undefined));
  const out = new Map<string, string>();
  for (const r of rows) {
    if (!r.tg) continue;
    if (segment.tiers?.length && !segment.tiers.includes(r.tier ?? "public")) continue;
    out.set(r.tg, r.locale ?? "ms");
  }
  return out;
}

export async function sendBroadcast(id: string) {
  const bot = getBot();
  const [b] = await db.select().from(broadcasts).where(eq(broadcasts.id, id));
  if (!b || !bot || b.sentAt) return 0;
  const rec = await recipientsFor(b.segment ?? {});
  let sent = 0;
  for (const [tg, locale] of rec) {
    try {
      await bot.api.sendMessage(tg, locale === "en" ? b.textEn : b.textMs, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
      sent++;
    } catch (e) { console.error("[broadcast]", tg, (e as Error).message); }
    await new Promise((r) => setTimeout(r, 60)); // ≤ ~16 msg/s
  }
  await db.update(broadcasts).set({ sentAt: new Date(), sentCount: sent }).where(eq(broadcasts.id, id));
  return sent;
}
