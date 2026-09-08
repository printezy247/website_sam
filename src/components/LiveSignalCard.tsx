import { getTranslations } from "next-intl/server";
import { SignalCard } from "@/components/SignalCard";
import { getQuote } from "@/lib/quotes";

/**
 * Illustrative signal built from the live XAUUSD price: entry at market, 0.35% stop,
 * TPs at 1R/2R/3R, direction from today's change. Clearly labelled as a sample.
 */
export async function LiveSignalCard() {
  const t = await getTranslations("hero");
  const q = await getQuote("XAUUSD");
  const entry = q?.price ?? 2412.5;
  const side = (q?.changePct ?? 0.1) >= 0 ? "buy" : "sell";
  const risk = Number((entry * 0.0035).toFixed(2));
  const dir = side === "buy" ? 1 : -1;
  const f = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <SignalCard s={{ instrument: "XAUUSD", side, entry: f(entry), sl: f(entry - dir * risk), tp1: f(entry + dir * risk), tp2: f(entry + dir * 2 * risk), tp3: f(entry + dir * 3 * risk), status: q ? "live" : "running", sample: true }} />
      <p className="mt-2 text-xs text-muted">{t("sample_note")}{q ? ` · ${q.source} ${new Date(q.ts).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })} MYT` : ""}</p>
    </div>
  );
}
