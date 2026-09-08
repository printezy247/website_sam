import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND, botDeepLink } from "@/config/brand";
import { StatTile } from "@/components/StatTile";
import { HeroField } from "@/components/HeroField";
import { LiveSignalCard } from "@/components/LiveSignalCard";
import { evaluateRunningSignals } from "@/lib/evaluate";
import { SignalCard } from "@/components/SignalCard";
import { TierCards } from "@/components/TierCards";
import { closedSignals, computeStats, latestSignals, recent } from "@/lib/stats";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fmtPct } from "@/lib/utils";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  await evaluateRunningSignals().catch((e) => console.error("[evaluate]", e));
  const [closed, latest, prods] = await Promise.all([
    closedSignals().catch(() => []), latestSignals(["public"], 6).catch(() => []),
    db.select().from(products).where(eq(products.active, true)).limit(6).catch(() => []),
  ]);
  const stats = computeStats(recent(closed, 90));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <HeroField />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <span className="inline-block text-xs text-gold border border-gold/30 rounded-full px-3 py-1">{t("hero.badge", { since: BRAND.since })}</span>
            <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              {t("hero.title")} <span className="text-gold">{t("hero.title2")}</span>
            </h1>
            <p className="mt-5 text-muted text-lg max-w-xl">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={botDeepLink("site_hero")} className="btn-gold rounded-md font-semibold px-6 py-3">{t("hero.cta_primary")}</a>
              <Link href="/pricing" className="rounded-md border border-border px-6 py-3 hover:border-gold/50">{t("hero.cta_secondary")}</Link>
            </div>
          </div>
          <LiveSignalCard />
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 -mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label={t("stats.winrate")} value={stats.n ? fmtPct(stats.winRate) : "—"} sub={`${stats.n} ${t("results.total").toLowerCase()}`} />
        <StatTile label={t("stats.avg_r")} value={stats.n ? `${stats.avgR.toFixed(2)}R` : "—"} />
        <StatTile label={t("stats.signals_month")} value={String(recent(closed, 30).length)} />
        <StatTile label={t("stats.since")} value={String(BRAND.since)} />
      </section>

      {/* Two doors */}
      <section className="mx-auto max-w-6xl px-4 mt-24">
        <h2 className="text-3xl font-semibold tracking-tight">{t("doors.title")}</h2>
        <p className="text-muted mt-2">{t("doors.subtitle")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="glass rounded-2xl p-6 glow-gold">
            <div className="text-xs text-gold uppercase tracking-wide">A</div>
            <h3 className="mt-1 text-xl font-semibold">{t("doors.a_title")}</h3>
            <p className="mt-2 text-muted">{t("doors.a_body")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={BRAND.broker.links.my} target="_blank" rel="noopener" className="rounded-md bg-gold text-black font-semibold px-4 py-2">{t("doors.a_cta")} · MY/SG/BN</a>
              <a href={BRAND.broker.links.id} target="_blank" rel="noopener" className="rounded-md border border-border px-4 py-2">ID</a>
              <a href={BRAND.telegram.registerGuide} target="_blank" rel="noopener" className="text-sm text-muted underline self-center">{t("doors.guide")}</a>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-xs text-muted uppercase tracking-wide">B</div>
            <h3 className="mt-1 text-xl font-semibold">{t("doors.b_title")}</h3>
            <p className="mt-2 text-muted">{t("doors.b_body")}</p>
            <Link href="/pricing" className="mt-5 inline-block rounded-md border border-border px-4 py-2 hover:border-gold/50">{t("doors.b_cta")}</Link>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-6xl px-4 mt-24">
        <TierCards />
      </section>

      {/* Latest signals */}
      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 mt-24">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">{t("signals.latest")}</h2>
            <Link href="/results" className="text-sm text-gold">{t("signals.view_all")} →</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {latest.map((s) => <SignalCard key={s.id} compact s={{ ...s, publishedAt: s.publishedAt }} />)}
          </div>
        </section>
      )}

      {/* Products */}
      {prods.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 mt-24">
          <h2 className="text-3xl font-semibold tracking-tight">{t("products.title")}</h2>
          <p className="text-muted mt-2">{t("products.subtitle")}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {prods.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="glass rounded-xl p-5 hover:border-gold/40">
                <div className="text-xs uppercase text-muted">{p.type.replace("_", " ")}</div>
                <div className="mt-1 font-semibold">{p.name}</div>
                <div className="mt-2 text-sm text-muted line-clamp-2">{p.description}</div>
                <div className="mt-3 font-mono">{p.priceCents ? `$${p.priceCents / 100}` : "Free"}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 mt-24">
        <h2 className="text-3xl font-semibold tracking-tight">{t("faq.title")}</h2>
        <div className="mt-6 divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <details key={i} className="py-4 group">
              <summary className="cursor-pointer font-medium list-none flex justify-between">{t(`faq.q${i}`)}<span className="text-gold group-open:rotate-45 transition">+</span></summary>
              <p className="mt-2 text-muted">{t(`faq.a${i}`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
