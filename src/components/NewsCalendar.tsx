import { getTranslations } from "next-intl/server";
import { fmtMyt, upcomingWithFlags } from "@/lib/news";

/** Next high-impact USD events (Forex Factory). Renders nothing when the feed is unreachable. */
export async function NewsCalendar({ limit = 6 }: { limit?: number }) {
  const t = await getTranslations("news");
  const events = await upcomingWithFlags(limit);
  if (!events.length) return null;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("title")}</h2>
        <span className="text-[11px] text-muted">{t("source")}</span>
      </div>
      <p className="text-xs text-muted mt-1">{t("hint")}</p>
      <ul className="mt-4 divide-y divide-border">
        {events.map((e, i) => {
          const soon = e.soon;
          return (
            <li key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`size-2 rounded-full shrink-0 ${soon ? "bg-loss animate-pulse" : "bg-loss/60"}`} />
                <span className="truncate">{e.title}</span>
                <span className="text-[10px] font-mono text-muted border border-border rounded px-1">{e.country}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-xs">{fmtMyt(e.date)} MYT</div>
                {(e.forecast || e.previous) && <div className="text-[11px] text-muted">{t("forecast")} {e.forecast || "—"} · {t("previous")} {e.previous || "—"}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
