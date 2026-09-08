import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type SignalView = { instrument: string; type?: string; side: string; entry: string; sl: string; tp1?: string | null; tp2?: string | null; tp3?: string | null; status: string; resultR?: string | null; publishedAt?: Date; sample?: boolean };

export function SignalCard({ s, compact, live }: { s: SignalView; compact?: boolean; live?: boolean }) {
  const t = useTranslations("signals");
  const th = useTranslations("hero");
  const win = s.resultR != null && Number(s.resultR) > 0;
  const closed = s.resultR != null;
  return (
    <div className={cn("glass rounded-xl p-4", !compact && "p-5")}>
      <div className="flex items-center justify-between">
        <div className="font-semibold flex items-center gap-2">{s.instrument}{s.type && <span className="text-[10px] uppercase tracking-wide rounded bg-surface-2 border border-border text-muted px-1.5 py-0.5">{t(`type_${s.type}` as "type_intraday")}</span>}</div>
        <div className="flex items-center gap-2">
          {live && <span className="text-[10px] uppercase tracking-wide rounded border border-win/40 text-win px-1.5 py-0.5 flex items-center gap-1"><span className="size-1.5 rounded-full bg-win animate-pulse" />LIVE</span>}
          {s.sample && <span className="text-[10px] uppercase tracking-wide rounded border border-gold/40 text-gold px-1.5 py-0.5">{th("sample")}</span>}
          <span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded", s.side === "buy" ? "bg-win/15 text-win" : "bg-loss/15 text-loss")}>
            {s.side === "buy" ? t("buy") : t("sell")}
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-sm">
        <div><div className="text-[10px] text-muted uppercase">{t("entry")}</div><div>{s.entry}</div></div>
        <div><div className="text-[10px] text-muted uppercase">{t("sl")}</div><div className="text-loss">{s.sl}</div></div>
        <div><div className="text-[10px] text-muted uppercase">{t("tp")}1–3</div><div className="text-win">{[s.tp1, s.tp2, s.tp3].filter(Boolean).join(" · ")}</div></div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{t("status")}: <span className="uppercase text-fg">{s.status}</span></span>
        {closed && <span className={win ? "text-win" : "text-loss"}>{Number(s.resultR) >= 0 ? "+" : ""}{Number(s.resultR).toFixed(1)}R</span>}
        {s.publishedAt && <span>{s.publishedAt.toISOString().slice(0, 10)}</span>}
      </div>
    </div>
  );
}
