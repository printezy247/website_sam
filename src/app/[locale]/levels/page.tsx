import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "levels" });
  return pageMetadata({ locale, path: "/levels", title: t("page_title"), description: t("page_intro") });
}

/** What Sam Gold Levels draws, the bias rule, and setup on TradingView and MT5. */
export default async function LevelsGuide({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const t = await getTranslations("levels");
  const tv = [1, 2, 3].map((n) => ({ n, title: t(`tv${n}_t`), body: t(`tv${n}_b`) }));
  const mt5 = [1, 2, 3, 4, 5].map((n) => ({ n, title: t(`mt${n}_t`), body: t(`mt${n}_b`) }));
  const draws = ["pd", "open", "pw", "asia", "boxes", "bias"] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("page_title")}</h1>
      <p className="text-muted mt-2">{t("page_intro")}</p>

      <section className="mt-10 glass lux lux-gold rounded-2xl p-6">
        <p className="text-xs uppercase tracking-wide text-gold">{t("rule_k")}</p>
        <p className="mt-2 text-lg font-semibold">{t("rule_buy")}</p>
        <p className="mt-1 text-lg font-semibold">{t("rule_sell")}</p>
        <p className="mt-1 text-lg font-semibold text-muted">{t("rule_wait")}</p>
        <p className="mt-3 text-sm text-muted">{t("rule_note")}</p>
      </section>

      <h2 className="mt-12 text-2xl font-semibold">{t("draws_t")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {draws.map((k) => (
          <div key={k} className="glass lux rounded-2xl p-4">
            <p className="font-semibold">{t(`d_${k}_t`)}</p>
            <p className="text-sm text-muted mt-1">{t(`d_${k}_b`)}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold">TradingView</h2>
      <p className="text-muted mt-1 text-sm">{t("tv_intro")}</p>
      <ol className="mt-4 space-y-3">
        {tv.map((s) => (
          <li key={s.n} className="glass lux rounded-2xl p-5 flex gap-4">
            <span className="font-display text-3xl text-gold leading-none">{String(s.n).padStart(2, "0")}</span>
            <div><h3 className="font-semibold">{s.title}</h3><p className="text-sm text-muted mt-1">{s.body}</p></div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-2xl font-semibold">MetaTrader 5</h2>
      <p className="text-muted mt-1 text-sm">{t("mt_intro")}</p>
      <ol className="mt-4 space-y-3">
        {mt5.map((s) => (
          <li key={s.n} className="glass lux rounded-2xl p-5 flex gap-4">
            <span className="font-display text-3xl text-gold leading-none">{String(s.n).padStart(2, "0")}</span>
            <div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted mt-1">{s.body}</p>
              {s.n === 3 && <p className="mt-2 font-mono text-sm text-gold break-all">{BRAND.siteUrl}</p>}
            </div>
          </li>
        ))}
      </ol>

      <section className="glass rounded-2xl p-5 mt-8 border-loss/30">
        <h2 className="font-semibold">{t("risk_t")}</h2>
        <p className="text-sm text-muted mt-1">{t("risk_b")}</p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/account" className="btn-gold rounded-md px-5 py-2.5 inline-block text-sm">{t("cta_account")}</Link>
        <Link href="/products/sam-gold-levels-tv" className="holo-btn holo-wide text-sm">{t("cta_store")}</Link>
      </div>
    </div>
  );
}
