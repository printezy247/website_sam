import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { StatTile } from "@/components/StatTile";
import { EquityCurve } from "@/components/EquityCurve";
import { GoldChart } from "@/components/GoldChart";
import { NewsCalendar } from "@/components/NewsCalendar";
import { closedSignals, computeStats, monthlyBreakdown } from "@/lib/stats";
import { BRAND } from "@/config/brand";
import { fmtPct } from "@/lib/utils";
import { evaluateRunningSignals } from "@/lib/evaluate";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({ locale, path: "/results", title: t("results_title"), description: t("results_description") });
}

export default async function Results({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ instrument?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const { instrument } = await searchParams;
  const t = await getTranslations("results");
  const tc = await getTranslations("chart");
  await evaluateRunningSignals().catch((e) => console.error("[evaluate]", e));
  const rows = await closedSignals(instrument).catch(() => []);
  const s = computeStats(rows);
  const months = monthlyBreakdown(rows);
  const instruments = [...new Set(rows.map((r) => r.instrument))];
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted mt-2">{t("subtitle")}</p>
      {instruments.length > 1 && (
        <div className="mt-4 flex gap-2 text-sm">
          <a href="?" className="px-3 py-1 rounded border border-border">All</a>
          {instruments.map((i) => <a key={i} href={`?instrument=${i}`} className="px-3 py-1 rounded border border-border">{i}</a>)}
        </div>
      )}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label={t("total")} value={String(s.n)} />
        <StatTile label={t("winrate")} value={s.n ? fmtPct(s.winRate) : "—"} />
        <StatTile label={t("avg_r")} value={s.n ? s.avgR.toFixed(2) : "—"} />
        <StatTile label={t("expectancy")} value={s.n ? s.expectancy.toFixed(2) : "—"} />
        <StatTile label={t("max_dd")} value={s.n ? `-${s.maxDdR.toFixed(2)}` : "—"} />
      </div>
      <div className="mt-10 grid gap-4 lg:grid-cols-[2fr_1fr]"><GoldChart labels={{ title: tc("title"), entry: tc("entry"), sl: tc("sl"), tp: tc("tp"), empty: tc("empty"), asOf: tc("asOf") }} /><NewsCalendar /></div>
      <div className="mt-10 glass rounded-2xl p-5">
        <h2 className="font-semibold mb-3">{t("equity")}</h2>
        <EquityCurve data={s.equity} />
      </div>
      <div className="mt-10">
        <h2 className="font-semibold mb-3">{t("monthly")}</h2>
        <div className="overflow-x-auto glass rounded-2xl">
          <table className="w-full text-sm font-mono">
            <thead><tr className="text-muted text-left"><th className="p-3">{t("month")}</th><th className="p-3">{t("trades")}</th><th className="p-3">{t("winrate")}</th><th className="p-3">{t("pips")}</th><th className="p-3">{t("r")}</th></tr></thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-t border-border">
                  <td className="p-3">{m.month}</td><td className="p-3">{m.trades}</td><td className="p-3">{fmtPct(m.wins / m.trades)}</td>
                  <td className={`p-3 ${m.pips >= 0 ? "text-win" : "text-loss"}`}>{m.pips.toFixed(0)}</td>
                  <td className={`p-3 ${m.r >= 0 ? "text-win" : "text-loss"}`}>{m.r >= 0 ? "+" : ""}{m.r.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-10 glass rounded-2xl p-5">
        <h2 className="font-semibold mb-3">{t("verified")}</h2>
        {BRAND.myfxbookWidgetUrl ? <iframe src={BRAND.myfxbookWidgetUrl} className="w-full h-72 rounded" /> : <p className="text-sm text-muted">{t("no_widget")}</p>}
      </div>
    </div>
  );
}
