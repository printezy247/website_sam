// The daily jobs. Run by `npm run jobs` (a cron service) or by GET /api/cron/jobs (cron-job.org on Vercel).
import { and, eq, lt } from "drizzle-orm";
import { db, dbUrl } from "@/db";
import { entitlements, users } from "@/db/schema";
import { effectiveTier } from "@/lib/entitlements";
import { CHATS, getBot, sendHtml } from "@/lib/telegram";
import { tierByKey } from "@/config/tiers";
import { broadcasts } from "@/db/schema";
import { sendBroadcast } from "@/lib/broadcast";
import { ensureDailyArticle } from "@/lib/articles";
import { llmConfigured } from "@/lib/llm";
import { evaluateRunningSignals } from "@/lib/evaluate";
import { ensureAutoSignal } from "@/lib/auto-signal";
import { runDrip } from "@/lib/leads";
import { ensureWeeklyRecap } from "@/lib/recap";
import { isNull, lte } from "drizzle-orm";

const GRACE_DAYS = 7;

/** The daily run: expiry, broadcasts, recap, drip, article. Returns a short log for the caller. */
export async function runJobs() {
  const out: string[] = [];
  const log = (...m: unknown[]) => { console.log(...m); out.push(m.map(String).join(" ")); };
  try { log(`[jobs] db host: ${new URL(dbUrl).hostname}`); } catch { log("[jobs] db url unparsable"); }
  log("[jobs] evaluate", JSON.stringify(await evaluateRunningSignals({ force: true }).catch((e) => String(e))));
  const auto = await ensureAutoSignal(true).catch((e) => ({ error: String(e) }));
  log("[jobs] auto-signal", auto && "id" in auto ? `${auto.side} ${auto.type} @ ${auto.entry} (${auto.status})` : auto && "error" in auto ? auto.error : "none (gap/news/closed market)");
  const cutoff = new Date(Date.now() - GRACE_DAYS * 864e5);
  const stale = await db.select().from(entitlements).where(and(eq(entitlements.status, "active"), lt(entitlements.expiresAt, cutoff)));
  log(`[jobs] expiring ${stale.length} entitlements`);
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
  const due = await db.select({ id: broadcasts.id }).from(broadcasts).where(and(isNull(broadcasts.sentAt), lte(broadcasts.scheduledAt, new Date())));
  for (const b of due) log(`[jobs] broadcast ${b.id} sent to ${await sendBroadcast(b.id)}`);
  const recap = await ensureWeeklyRecap().catch((e) => { console.error("[jobs] recap", e); return null; });
  log(recap ? `[jobs] weekly recap ${recap.weekStart} posted=${Boolean(recap.postedAt)}` : "[jobs] recap: not Monday");
  log("[jobs] drip emails sent", await runDrip().catch((e) => String(e)));
  if (llmConfigured()) {
    const a = await ensureDailyArticle(process.env.ARTICLE_FORCE === "1").catch((e) => { console.error("[jobs] article", e); return null; });
    log(a ? `[jobs] article published: ${a.slug}` : "[jobs] article: nothing to do");
  }
  return out;
}
