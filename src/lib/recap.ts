// Weekly recap of closed signals, posted to the public channel every Monday (jobs cron) or on demand from admin.
import { and, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { recaps, signals } from "@/db/schema";
import { BRAND, botDeepLink } from "@/config/brand";
import { CHATS, escapeHtml, sendHtml } from "@/lib/telegram";
import { generateJson, llmConfigured } from "@/lib/llm";

export type RecapStats = { weekStart: string; weekEnd: string; n: number; wins: number; losses: number; be: number; winRate: number; totalR: number; totalPips: number; best: number; worst: number; byType: Record<string, { n: number; r: number }>; running: number };

/** Monday 00:00 UTC of the week containing `d` minus `weeksAgo`. */
export function weekStartOf(d = new Date(), weeksAgo = 1) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - dow - 7 * weeksAgo);
  return x;
}

export async function weekStats(start: Date): Promise<RecapStats> {
  const end = new Date(start.getTime() + 7 * 864e5);
  const rows = await db.select().from(signals).where(and(isNotNull(signals.closedAt), isNotNull(signals.resultR), gte(signals.closedAt, start), lt(signals.closedAt, end)));
  const rs = rows.map((r) => Number(r.resultR));
  const wins = rs.filter((r) => r > 0).length, losses = rs.filter((r) => r < 0).length, be = rs.filter((r) => r === 0).length;
  const byType: RecapStats["byType"] = {};
  for (const r of rows) { const t = byType[r.type] ?? { n: 0, r: 0 }; t.n++; t.r += Number(r.resultR); byType[r.type] = t; }
  const [{ running }] = await db.select({ running: signals.id }).from(signals).where(eq(signals.status, "running")).then((x) => [{ running: x.length }]);
  return {
    weekStart: start.toISOString().slice(0, 10), weekEnd: new Date(end.getTime() - 1).toISOString().slice(0, 10),
    n: rows.length, wins, losses, be, winRate: rows.length ? wins / rows.length : 0,
    totalR: rs.reduce((s, r) => s + r, 0), totalPips: rows.reduce((s, r) => s + Number(r.resultPips ?? 0), 0),
    best: rs.length ? Math.max(...rs) : 0, worst: rs.length ? Math.min(...rs) : 0, byType, running,
  };
}

const R = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Deterministic bilingual recap (fallback and factual base for the LLM). */
export function templateRecap(s: RecapStats) {
  const types = Object.entries(s.byType).map(([k, v]) => `${k} ${v.n} (${R(v.r)})`).join(", ");
  const ms = s.n
    ? `Minggu ${s.weekStart} hingga ${s.weekEnd}: ${s.n} signal XAUUSD ditutup. ${s.wins} menang, ${s.losses} rugi${s.be ? `, ${s.be} BE` : ""}. Kadar menang ${pct(s.winRate)}, jumlah ${R(s.totalR)} (${s.totalPips.toFixed(0)} pip). Terbaik ${R(s.best)}, terburuk ${R(s.worst)}. Ikut jenis: ${types || "-"}. ${s.running} setup masih berjalan.`
    : `Minggu ${s.weekStart} hingga ${s.weekEnd}: tiada signal ditutup. ${s.running} setup masih berjalan.`;
  const en = s.n
    ? `Week ${s.weekStart} to ${s.weekEnd}: ${s.n} XAUUSD signals closed. ${s.wins} wins, ${s.losses} losses${s.be ? `, ${s.be} BE` : ""}. Win rate ${pct(s.winRate)}, total ${R(s.totalR)} (${s.totalPips.toFixed(0)} pips). Best ${R(s.best)}, worst ${R(s.worst)}. By type: ${types || "-"}. ${s.running} setups still running.`
    : `Week ${s.weekStart} to ${s.weekEnd}: no signals closed. ${s.running} setups still running.`;
  return { ms, en };
}

const SCHEMA = { type: "object", properties: { ms: { type: "string" }, en: { type: "string" } }, required: ["ms", "en"] };
const SYSTEM = `You write the weekly performance recap for ${BRAND.name}, a Gold (XAUUSD) signal and education channel for Malaysia, Singapore, Brunei and Indonesia.
Rules: use ONLY the numbers given, never invent or round them differently. Two short paragraphs per language (max 90 words each): what happened, one lesson for members.
Tone: calm, honest, no hype, no promises. Mention losses plainly. End with "Pendidikan sahaja, bukan nasihat kewangan." (ms) / "Education only, not financial advice." (en).
Bahasa Melayu text must sound natural for Malaysian traders (not Indonesian). Return JSON {"ms": "...", "en": "..."} with plain text, no markdown.`;

/** Build (or fetch) the recap for a week. Uses the LLM when configured, else the template. */
export async function buildRecap(start = weekStartOf(), force = false) {
  const key = start.toISOString().slice(0, 10);
  const [existing] = await db.select().from(recaps).where(eq(recaps.weekStart, key));
  if (existing && !force) return existing;
  const stats = await weekStats(start);
  const base = templateRecap(stats);
  let text = base, model: string | null = null;
  if (llmConfigured() && stats.n > 0) {
    try {
      const r = await generateJson<{ ms: string; en: string }>({ system: SYSTEM, schema: SCHEMA, maxTokens: 1200, user: `Facts (must match exactly):\n${JSON.stringify(stats, null, 1)}\n\nPlain-language base text:\nMS: ${base.ms}\nEN: ${base.en}` });
      if (r.json.ms && r.json.en) { text = { ms: r.json.ms, en: r.json.en }; model = r.model; }
    } catch (e) { console.error("[recap] llm", e); }
  }
  const values = { weekStart: key, textMs: text.ms, textEn: text.en, stats, model };
  const [row] = existing
    ? await db.update(recaps).set(values).where(eq(recaps.id, existing.id)).returning()
    : await db.insert(recaps).values(values).returning();
  return row;
}

export function formatRecapHtml(r: typeof recaps.$inferSelect) {
  const s = r.stats as RecapStats | null;
  const head = s ? `<b>Recap minggu ${s.weekStart} → ${s.weekEnd}</b>\n${s.n} ditutup · ${pct(s.winRate)} menang · <b>${R(s.totalR)}</b>` : "<b>Recap mingguan</b>";
  return `${head}\n\n${escapeHtml(r.textMs)}\n\n<i>${escapeHtml(r.textEn)}</i>\n\nRekod: ${BRAND.siteUrl}/results\nBot: ${botDeepLink("recap")}`;
}

/** Post to the public channel once per week. Returns the recap row (postedAt set when sent). */
export async function postRecap(id: string) {
  const [r] = await db.select().from(recaps).where(eq(recaps.id, id));
  if (!r) throw new Error("recap not found");
  if (!CHATS.public) return r;
  await sendHtml(CHATS.public, formatRecapHtml(r));
  const [row] = await db.update(recaps).set({ postedAt: new Date() }).where(eq(recaps.id, id)).returning();
  return row;
}

/** Cron: on Mondays build + post last week's recap if not posted yet. */
export async function ensureWeeklyRecap(now = new Date()) {
  if (now.getUTCDay() !== 1) return null;
  const r = await buildRecap(weekStartOf(now));
  if (r.postedAt) return r;
  return postRecap(r.id).catch((e) => { console.error("[recap] post", e); return r; });
}

export async function latestRecap() {
  const [r] = await db.select().from(recaps).orderBy(desc(recaps.weekStart)).limit(1);
  return r ?? null;
}
