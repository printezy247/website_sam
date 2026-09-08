import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { BRAND } from "@/config/brand";
import { StatTile } from "@/components/StatTile";
import { EquityCurve } from "@/components/EquityCurve";
import { SignalCard } from "@/components/SignalCard";
import { ShareReferral } from "@/components/ShareReferral";
import { memberDashboard, referralBonusDays, referralLeaderboard } from "@/lib/dashboard";
import { evaluateRunningSignals } from "@/lib/evaluate";
import { toggleFollowSignal } from "@/lib/actions";
import { pageMetadata } from "@/lib/seo";
import { fmtPct, fmtR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({ locale, path: "/dashboard", title: t("dashboard_title"), description: t("default_description"), noindex: true });
}

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/signin?callbackUrl=/${locale}/dashboard`);
  const uid = session.user.id;
  const t = await getTranslations("dashboard");
  const tt = await getTranslations("tiers");
  await evaluateRunningSignals().catch((e) => console.error("[evaluate]", e));
  const [d, lb, bonus, [u]] = await Promise.all([
    memberDashboard(uid), referralLeaderboard(10, uid), referralBonusDays(uid),
    db.select({ code: users.referralCode }).from(users).where(eq(users.id, uid)),
  ]);
  const refUrl = `${BRAND.siteUrl}/?ref=${u?.code ?? ""}`;
  const s = d.stats;
  const equity = s.equity.length ? [{ t: Math.min(Math.floor(d.since.getTime() / 1000), s.equity[0].t - 86400), v: 0 }, ...s.equity] : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted mt-2">{t("subtitle")}</p>
        </div>
        <div className="glass rounded-xl px-4 py-3 text-sm">
          <div className="text-xs uppercase text-muted">{t("tier")}</div>
          <div className="text-xl font-semibold">{tt(d.tier)}</div>
          <div className="text-xs text-muted">{t("member_since")} {d.since.toISOString().slice(0, 10)} · {t("access")}: {d.vis.map((v) => tt(v as "free")).join(" · ")}</div>
          {d.tier !== "elite" && <Link href="/pricing" className="text-xs text-gold underline">{t("upgrade")}</Link>}
        </div>
      </div>

      <section>
        <p className="text-sm text-muted mb-3">{d.basis === "followed" ? t("followed_hint") : t("fallback_hint")}</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatTile label={t("closed")} value={String(s.n)} sub={d.basis === "followed" ? `${t("followed")}: ${d.followedCount}` : undefined} />
          <StatTile label={t("winrate")} value={s.n ? fmtPct(s.winRate) : "—"} />
          <StatTile label={t("avg_r")} value={s.n ? s.avgR.toFixed(2) : "—"} />
          <StatTile label={t("total_r")} value={s.n ? fmtR(s.totalR) : "—"} />
          <StatTile label={t("this_month")} value={s.n ? fmtR(d.monthR) : "—"} />
          <StatTile label={t("running")} value={String(d.running)} />
        </div>
        <div className="mt-4 glass rounded-2xl p-5">
          <h2 className="font-semibold mb-3">{t("equity")}</h2>
          {equity.length ? <EquityCurve data={equity} /> : <p className="text-sm text-muted">{t("empty")}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">{t("recent")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {d.recent.map((sig) => {
            const taken = d.followed.has(sig.id);
            return (
              <div key={sig.id} className={taken ? "rounded-xl ring-1 ring-gold/50" : ""}>
                <SignalCard compact live={sig.status === "running"} s={{ ...sig, publishedAt: sig.publishedAt }} />
                <form action={toggleFollowSignal} className="-mt-2 px-4 pb-3 glass rounded-b-xl border-t-0">
                  <input type="hidden" name="signalId" value={sig.id} />
                  <button className={`w-full text-xs rounded-md py-1.5 ${taken ? "border border-gold text-gold" : "bg-gold text-black font-semibold"}`}>{taken ? `${t("taken")} ✓ · ${t("unfollow")}` : t("follow")}</button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold">{t("leaderboard")}</h2>
          <p className="text-xs text-muted mt-1">{t("leaderboard_sub")}</p>
          {lb.top.length ? (
            <table className="mt-4 w-full text-sm">
              <thead><tr className="text-muted text-left text-xs uppercase"><th className="py-1">{t("rank")}</th><th>{t("member")}</th><th className="text-right">{t("activated")}</th></tr></thead>
              <tbody>
                {lb.top.map((r) => (
                  <tr key={r.userId} className={`border-t border-border ${r.userId === uid ? "text-gold" : ""}`}>
                    <td className="py-2 font-mono">{r.rank}</td>
                    <td>{r.label}{r.userId === uid ? ` (${t("you")})` : ""}</td>
                    <td className="text-right font-mono">{r.activated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="mt-4 text-sm text-muted">{t("no_rank")}</p>}
          <p className="mt-4 text-sm">{lb.mine ? t("your_rank", { rank: lb.mine.rank, total: lb.total }) : t("no_rank")}</p>
          <p className="text-xs text-muted">{t("bonus_days")}: <span className="font-mono text-fg">{bonus}</span></p>
        </div>
        <div className="glass rounded-2xl p-6 glow-gold">
          <h2 className="font-semibold">{t("share")}</h2>
          <p className="text-xs text-muted mt-1 mb-4">{t("share_hint")}</p>
          <ShareReferral url={refUrl} text={t("share_text", { brand: BRAND.name })} labels={{ copy: t("copy"), copied: t("copied"), tg: t("share_tg"), wa: t("share_wa") }} />
        </div>
      </section>
    </div>
  );
}
