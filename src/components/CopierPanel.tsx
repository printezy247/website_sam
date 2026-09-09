import { useTranslations } from "next-intl";
import { saveCopierSettings } from "@/lib/actions";
import type { copierLinks, copierTrades } from "@/db/schema";

type Link = typeof copierLinks.$inferSelect;
type Trade = typeof copierTrades.$inferSelect;

const inp = "rounded-md bg-surface border border-border px-3 py-2 text-sm w-full";

/** Copier panel on the account page: the key, the terminals, their settings and the last trades. */
export function CopierPanel({ licenseKey, links, trades, guideHref, robotHref }: {
  licenseKey: string; links: (Link & { live: boolean })[]; trades: Trade[]; guideHref: string; robotHref: string;
}) {
  const t = useTranslations("copier");

  return (
    <section className="glass lux rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted mt-1 max-w-lg">{t("intro")}</p>
        </div>
        <a href={guideHref} className="holo-btn holo-wide text-sm">{t("guide")}</a>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{t("key")}</p>
          <code className="font-mono text-gold break-all text-sm">{licenseKey}</code>
        </div>
        <a href={robotHref} className="btn-gold rounded-md px-4 py-2 text-sm text-center">{t("download")}</a>
      </div>

      {links.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{t("no_terminal")}</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {links.map((l) => (
            <li key={l.id} className="rounded-xl border border-border/70 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`inline-block size-2 rounded-full ${l.live ? "bg-win" : "bg-loss"}`} aria-hidden />
                <span className="font-semibold">{l.mt5Account}</span>
                <span className="text-muted">{l.broker}</span>
                <span className="text-xs text-muted ml-auto">{l.live ? t("live") : t("offline")}</span>
              </div>
              {l.lastError && <p className="mt-2 text-xs text-loss">{l.lastError}</p>}
              <form action={saveCopierSettings} className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                <input type="hidden" name="id" value={l.id} />
                <label className="grid gap-1"><span className="text-xs text-muted">{t("mode")}</span>
                  <select name="riskMode" defaultValue={l.riskMode} className={inp}>
                    <option value="percent">{t("mode_percent")}</option>
                    <option value="fixed">{t("mode_fixed")}</option>
                  </select>
                </label>
                <label className="grid gap-1"><span className="text-xs text-muted">{t("risk_percent")}</span>
                  <input name="riskPercent" type="number" step="0.05" min="0.05" max="10" defaultValue={Number(l.riskPercent)} className={inp} />
                </label>
                <label className="grid gap-1"><span className="text-xs text-muted">{t("lot_fixed")}</span>
                  <input name="lotFixed" type="number" step="0.01" min="0.01" defaultValue={Number(l.lotFixed)} className={inp} />
                </label>
                <label className="grid gap-1"><span className="text-xs text-muted">{t("max_lot")}</span>
                  <input name="maxLot" type="number" step="0.01" min="0.01" defaultValue={Number(l.maxLot)} className={inp} />
                </label>
                <label className="grid gap-1"><span className="text-xs text-muted">{t("expiry")}</span>
                  <input name="expiryMinutes" type="number" step="15" min="15" max="1440" defaultValue={l.expiryMinutes} className={inp} />
                </label>
                <label className="grid gap-1"><span className="text-xs text-muted">{t("suffix")}</span>
                  <input name="symbolSuffix" defaultValue={l.symbolSuffix} placeholder=".m" className={inp} />
                </label>
                <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" name="enabled" defaultChecked={l.enabled} /> {t("enabled")}</label>
                <button className="btn-gold rounded-md px-4 py-2 text-sm">{t("save")}</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {trades.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted">{t("recent")}</p>
          <ul className="mt-2 space-y-1 text-xs font-mono">
            {trades.map((x) => (
              <li key={x.id} className="flex flex-wrap gap-2">
                <span className="text-muted">{new Date(x.createdAt).toISOString().slice(5, 16).replace("T", " ")}</span>
                <span>{x.action}</span>
                <span className={x.status === "rejected" ? "text-loss" : "text-win"}>{x.status}</span>
                {x.lots && <span>{Number(x.lots).toFixed(2)}</span>}
                {x.detail && <span className="text-muted truncate">{x.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
