"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const KEY = "sam_ebook_seen";

/** Floating ebook button + claim modal. Auto-opens once per browser after 20s or on exit intent. */
export function EbookClaim({ botLink, source = "site_modal" }: { botLink: string; source?: string }) {
  const t = useTranslations("lead");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [leadId, setLeadId] = useState<string | null>(null);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch { /* private mode */ }
    if (seen) return;
    const mark = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
    const timer = setTimeout(() => { setOpen(true); mark(); }, 20000);
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) { setOpen(true); mark(); clearTimeout(timer); } };
    document.addEventListener("mouseout", onLeave);
    return () => { clearTimeout(timer); document.removeEventListener("mouseout", onLeave); };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setState("busy");
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), name: fd.get("name"), website: fd.get("website"), locale, source }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { setLeadId(j.id); setState("done"); } else setState("error");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-20 md:bottom-6 left-4 z-40 rounded-full glass border-gold/40 px-4 py-2 text-sm font-semibold hover:border-gold flex items-center gap-2 shadow-lg">
        <span aria-hidden>📘</span>{t("fab")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="glass rounded-2xl p-6 w-full max-w-md glow-gold" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gold uppercase tracking-wide">{t("badge")}</div>
                <h3 className="mt-1 text-xl font-semibold">{t("title")}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-fg text-xl leading-none" aria-label="close">×</button>
            </div>
            {state === "done" ? (
              <div className="mt-4 space-y-3">
                <p className="text-win text-sm">{t("done")}</p>
                <div className="flex flex-wrap gap-2">
                  {leadId && <a href={`/api/leads/${leadId}/ebook`} className="rounded-md bg-gold text-black font-semibold px-4 py-2 text-sm">{t("download")}</a>}
                  <a href={botLink} target="_blank" rel="noopener" className="rounded-md border border-border px-4 py-2 text-sm hover:border-gold/50">{t("bot")}</a>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <p className="text-sm text-muted">{t("body")}</p>
                <input name="name" placeholder={t("name")} className="w-full rounded-md bg-surface border border-border px-3 py-2.5" />
                <input name="email" type="email" required placeholder={t("email")} className="w-full rounded-md bg-surface border border-border px-3 py-2.5" />
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <button disabled={state === "busy"} className="w-full rounded-md bg-gold text-black font-semibold py-2.5 disabled:opacity-50">{state === "busy" ? "…" : t("cta")}</button>
                {state === "error" && <p className="text-xs text-loss">{t("error")}</p>}
                <p className="text-[11px] text-muted">{t("fine")}</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
