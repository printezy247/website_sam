// Cron entrypoint (Railway cron service: `npm run jobs`). Expires stale entitlements and soft-kicks from groups.
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

async function main() {
  const dbKeys = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|^PG/i.test(k));
  const raw = process.env.DATABASE_URL;
  const anyUrl = [raw, process.env.DATABASE_PRIVATE_URL, process.env.DATABASE_PUBLIC_URL].find((v) => v && v.trim());
  if (!anyUrl) {
    console.error(`[jobs] DATABASE_URL is ${raw === undefined ? "undefined" : "an empty string"} on this service. DB-related env names present: ${dbKeys.join(", ") || "(none)"}.`);
    console.error("[jobs] Fix: Railway → jobs service → Variables → DATABASE_URL. Paste the literal value from the Postgres service (Variables → DATABASE_URL), or a reference like ${{Postgres.DATABASE_URL}} with the exact Postgres service name. Then Deploy.");
    process.exit(1);
  }
  try { console.log(`[jobs] db host: ${new URL(dbUrl).hostname}`); } catch { console.log("[jobs] db url unparsable"); }
  console.log("[jobs] evaluate", await evaluateRunningSignals({ force: true }).catch((e) => String(e)));
  const auto = await ensureAutoSignal(true).catch((e) => ({ error: String(e) }));
  console.log("[jobs] auto-signal", auto && "id" in auto ? `${auto.side} ${auto.type} @ ${auto.entry} (${auto.status})` : auto && "error" in auto ? auto.error : "none (gap/news/closed market)");
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
  const due = await db.select({ id: broadcasts.id }).from(broadcasts).where(and(isNull(broadcasts.sentAt), lte(broadcasts.scheduledAt, new Date())));
  for (const b of due) console.log(`[jobs] broadcast ${b.id} sent to ${await sendBroadcast(b.id)}`);
  const recap = await ensureWeeklyRecap().catch((e) => { console.error("[jobs] recap", e); return null; });
  console.log(recap ? `[jobs] weekly recap ${recap.weekStart} posted=${Boolean(recap.postedAt)}` : "[jobs] recap: not Monday");
  console.log("[jobs] drip emails sent", await runDrip().catch((e) => String(e)));
  if (llmConfigured()) {
    const a = await ensureDailyArticle(process.env.ARTICLE_FORCE === "1").catch((e) => { console.error("[jobs] article", e); return null; });
    console.log(a ? `[jobs] article published: ${a.slug}` : "[jobs] article: nothing to do");
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
