"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TIERS, FEATURE_ROWS, fmtUsd, type FeatureKey } from "@/config/tiers";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

export function TierCards({ showMatrix = false }: { showMatrix?: boolean }) {
  const t = useTranslations("tiers");
  const tf = useTranslations("features");
  const [door, setDoor] = useState<"ib" | "pay">("ib");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const tiers = TIERS.filter((x) => x.key !== "public");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <Seg value={door} onChange={setDoor} opts={[["ib", t("toggle_ib")], ["pay", t("toggle_pay")]]} />
        {door === "pay" && <Seg value={interval} onChange={setInterval} opts={[["month", t("monthly")], ["year", t("annual")]]} />}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <div key={tier.key} className={cn("glass lux rounded-2xl p-6 flex flex-col relative", tier.popular && "lux-gold")}>
            {tier.popular && <span className="absolute -top-3 left-6 text-[11px] uppercase tracking-wide bg-gold text-black px-2 py-0.5 rounded">{t("popular")}</span>}
            <div className="text-lg font-semibold">{t(tier.key)}</div>
            <div className="mt-3 min-h-16">
              {door === "ib" ? (
                <div>
                  <div className="text-3xl font-semibold font-mono">$0</div>
                  <div className="text-sm text-muted">{tier.ibMinDepositUsd ? t("ib_deposit", { n: tier.ibMinDepositUsd }) : t("ib_none")}</div>
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-semibold font-mono">{fmtUsd(interval === "month" ? tier.priceMonthCents : tier.priceYearCents)}<span className="text-sm text-muted font-sans">{interval === "month" ? t("mo") : t("yr")}</span></div>
                  <div className="text-sm text-muted">{t("or")} {tier.ibMinDepositUsd ? t("ib_deposit", { n: tier.ibMinDepositUsd }) : t("ib_none")}</div>
                </div>
              )}
            </div>
            {tier.key === "pro" && <div className="mt-2 text-xs text-gold">{t("founding", { n: BRAND.foundingMemberCap })}</div>}
            <ul className="mt-4 space-y-1.5 text-sm text-muted flex-1">
              {tier.features.filter((f) => f !== "public_signal_delayed").map((f) => (
                <li key={f} className="flex gap-2"><span className="text-gold">✓</span>{tf(f)}</li>
              ))}
            </ul>
            {door === "ib" ? (
              <a href={BRAND.broker.links.my} target="_blank" rel="noopener" className={cn("mt-6 rounded-md text-center text-sm font-semibold px-4 py-2.5", tier.popular ? "bg-gold text-black hover:bg-gold-2" : "border border-border hover:border-gold/50")}>{t("choose", { tier: t(tier.key) })}</a>
            ) : (
              <Link href={`/account?checkout=${tier.key}&interval=${interval}`} className={cn("mt-6 rounded-md text-center text-sm font-semibold px-4 py-2.5", tier.popular ? "bg-gold text-black hover:bg-gold-2" : "border border-border hover:border-gold/50")}>{t("choose", { tier: t(tier.key) })}</Link>
            )}
          </div>
        ))}
      </div>
      {showMatrix && (
        <div className="mt-12 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-muted"><th className="py-2 pr-4 font-normal"></th>{tiers.map((x) => <th key={x.key} className="py-2 px-3 font-semibold text-fg">{t(x.key)}</th>)}</tr></thead>
            <tbody>
              {FEATURE_ROWS.map((f: FeatureKey) => (
                <tr key={f} className="border-t border-border">
                  <td className="py-2 pr-4 text-muted">{tf(f)}</td>
                  {tiers.map((x) => <td key={x.key} className="py-2 px-3">{x.features.includes(f) ? <span className="text-gold">✓</span> : <span className="text-muted/40">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
      {opts.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={cn("px-3 py-1.5 rounded-md", value === v ? "bg-gold text-black font-semibold" : "text-muted hover:text-fg")}>{label}</button>
      ))}
    </div>
  );
}
