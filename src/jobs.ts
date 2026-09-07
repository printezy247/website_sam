// Cron entrypoint (Railway cron service: `npm run jobs`). Expires stale entitlements and soft-kicks from groups.
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, users } from "@/db/schema";
import { effectiveTier } from "@/lib/entitlements";
import { CHATS, getBot, sendHtml } from "@/lib/telegram";
import { tierByKey } from "@/config/tiers";

const GRACE_DAYS = 7;

async function main() {
  const cutoff = new Date(Date.now() - GRACE_DAYS * 864e5);
  const stale = await db.select().from(entitlements).where(and(eq(entitlements.status, "active"), lt(entitlements.expiresAt, cutoff)));
  console.log(`[jobs] expiring ${stale.length} entitlements`);
  const bot = getBot();
  for (const e of stale) {
    await db.update(entitlements).set({ status: "expired" }).where(eq(entitlements.id, e.id));
    const [u] = await db.select().from(users).where(eq(users.id, e.userId));
    if (!u?.telegramId || !bot) continue;
    const remaining = await effectiveTier(e.userId);
    const rr = tierByKey(remaining)?.rank ?? 0;
    for (const [tier, chat] of [["free", CHATS.free], ["pro", CHATS.pro], ["elite", CHATS.elite]] as const) {
      if (!chat) continue;
      if ((tierByKey(tier)?.rank ?? 0) > rr) {
        await bot.api.banChatMember(chat, Number(u.telegramId)).catch(() => {});
        await bot.api.unbanChatMember(chat, Number(u.telegramId)).catch(() => {});
      }
    }
    await sendHtml(u.telegramId, "⏳ Pelan anda tamat / Your plan expired. Deposit semula atau langgan untuk sambung akses: /plans").catch(() => {});
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
