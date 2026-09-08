import { eq } from "drizzle-orm";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { CHATS, getBot } from "@/lib/telegram";

type Sig = typeof signals.$inferSelect;

export function formatFull(s: Sig) {
  const tps = [s.tp1, s.tp2, s.tp3].filter(Boolean).map((v, i) => `TP${i + 1}: <code>${v}</code>`).join("\n");
  return `<b>${s.instrument} ${s.side.toUpperCase()}</b> · ${s.type}${s.newsLockout ? " ⚠️ news" : ""}\n\nEntry: <code>${s.entry}</code>\nSL: <code>${s.sl}</code>\n${tps}\n\n${s.note ? s.note + "\n\n" : ""}<i>Risk max 1% per setup. Education only.</i>`;
}
export function formatTeaser(s: Sig) {
  return `<b>${s.instrument} ${s.side.toUpperCase()}</b> · ${s.type} setup posted to members.\nEntry zone: <code>${s.entry}</code>\n\nFull SL/TP in the private group. /start the bot to join.`;
}

/** Post a new signal to the right chats; store message ids for later edits. */
export async function fanoutSignal(id: string) {
  const bot = getBot();
  const [s] = await db.select().from(signals).where(eq(signals.id, id));
  if (!bot || !s) return;
  const targets: [string | undefined, string][] = [];
  if (s.visibility === "public") targets.push([CHATS.public, formatFull(s)]);
  else targets.push([CHATS.public, formatTeaser(s)]);
  if (["free"].includes(s.visibility)) targets.push([CHATS.free, formatFull(s)]);
  if (["free", "pro", "elite"].includes(s.visibility)) targets.push([CHATS.pro, formatFull(s)]);
  if (["free", "pro", "elite"].includes(s.visibility)) targets.push([CHATS.elite, formatFull(s)]);
  const ids: Record<string, number> = { ...(s.telegramMessageIds ?? {}) };
  for (const [chat, text] of targets) {
    if (!chat || ids[chat]) continue;
    try {
      const m = await bot.api.sendMessage(chat, text, { parse_mode: "HTML" });
      ids[chat] = m.message_id;
    } catch (e) { console.error("[fanout]", chat, e); }
  }
  await db.update(signals).set({ telegramMessageIds: ids }).where(eq(signals.id, id));
}

/** Reply under the original message in every chat with a status update. */
export async function fanoutUpdate(id: string, text: string) {
  const bot = getBot();
  const [s] = await db.select().from(signals).where(eq(signals.id, id));
  if (!bot || !s?.telegramMessageIds) return;
  for (const [chat, mid] of Object.entries(s.telegramMessageIds)) {
    await bot.api.sendMessage(chat, text, { parse_mode: "HTML", reply_parameters: { message_id: mid } }).catch((e) => console.error("[fanout-update]", e));
  }
}
