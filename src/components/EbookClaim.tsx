"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const KEY = "sam_ebook_seen";
export type FreeEbook = { id: string; name: string; description: string | null; filePath: string | null; language?: string | null };

/**
 * Free ebook claim: floating button + 3D glass modal.
 * Signed-out visitors are sent to sign-up; signed-in members download straight from the modal.
 * Auto-opens once per browser after 20s or on exit intent.
 */
export function EbookClaim({ botLink, ebooks, signedIn }: { botLink: string; ebooks: FreeEbook[]; signedIn: boolean }) {
  const t = useTranslations("lead");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch { /* private mode */ }
    if (new URLSearchParams(location.search).get("claim") === "free") { const t = setTimeout(() => setOpen(true), 0); return () => clearTimeout(t); } // bot "Claim free" button
    if (seen) return;
    const mark = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
    const timer = setTimeout(() => { setOpen(true); mark(); }, 20000);
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) { setOpen(true); mark(); clearTimeout(timer); } };
    document.addEventListener("mouseout", onLeave);
    return () => { clearTimeout(timer); document.removeEventListener("mouseout", onLeave); };
  }, []);

  // Pointer tilt. Reduced-motion users get a static card.
  function tilt(e: React.PointerEvent<HTMLDivElement>) {
    const el = card.current; if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg)`;
    el.style.setProperty("--mx", `${(x + 0.5) * 100}%`); el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  }
  function reset() { const el = card.current; if (el) el.style.transform = ""; }

  const signup = `/${locale}/signin?callbackUrl=${encodeURIComponent(`/${locale}/account?claim=free`)}`;
  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-20 md:bottom-6 left-4 z-40 rounded-full glass border-gold/40 px-4 py-2 text-sm font-semibold hover:border-gold flex items-center gap-2 shadow-lg">
        <span className="inline-block w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]" aria-hidden />{t("fab")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="claim-stage w-full max-w-lg" onPointerMove={tilt} onPointerLeave={reset} onClick={(e) => e.stopPropagation()}>
            <div ref={card} className="claim-card rounded-3xl p-6 sm:p-8" role="dialog" aria-modal="true" aria-label={t("title")}>
              <div className="claim-sheen" aria-hidden />
              <button onClick={() => setOpen(false)} className="absolute right-4 top-3 text-muted hover:text-fg text-2xl leading-none z-10" aria-label="close">×</button>
              <div className="relative grid gap-5 sm:grid-cols-[1fr_150px] items-center">
                <div>
                  <div className="text-[11px] text-gold uppercase tracking-[.18em]">{t("badge")}</div>
                  <h3 className="mt-2 font-display uppercase text-3xl leading-[0.95]"><span className="text-chrome">{t("title")}</span></h3>
                  <p className="mt-3 text-sm text-muted">{signedIn ? t("body_member") : t("body")}</p>
                </div>
                <div className="claim-mascot hidden sm:block" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/mascot-raise.png" alt="" width={150} height={150} className="w-[150px] h-auto drop-shadow-[0_18px_30px_rgba(212,175,55,.35)]" />
                </div>
              </div>
              <ul className="relative mt-5 space-y-2">
                {ebooks.length === 0 && <li className="text-sm text-muted">{t("none")}</li>}
                {ebooks.map((b, i) => (
                  <li key={b.id} className="claim-book flex items-center gap-3 rounded-xl border border-border/70 bg-black/30 px-3 py-2.5" style={{ "--i": i } as React.CSSProperties}>
                    <span className="claim-cover" aria-hidden><span /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{b.name}{b.language && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted border border-border rounded px-1 py-px align-middle">{b.language}</span>}</span>
                      {b.description && <span className="block text-xs text-muted truncate">{b.description}</span>}
                    </span>
                    {signedIn ? (
                      b.filePath && !b.filePath.startsWith("tg:")
                        ? <a href={`/api/downloads/${b.id}`} className="shrink-0 rounded-md btn-gold text-xs font-semibold px-3 py-1.5">{t("download")}</a>
                        : <a href={botLink} target="_blank" rel="noopener" className="shrink-0 rounded-md border border-border text-xs px-3 py-1.5 hover:border-gold/50">{t("bot_short")}</a>
                    ) : <span className="shrink-0 text-[11px] uppercase tracking-wide text-gold border border-gold/40 rounded px-2 py-1">{t("locked")}</span>}
                  </li>
                ))}
              </ul>
              <div className="relative mt-6 flex flex-wrap gap-2">
                {signedIn
                  ? <a href={`/${locale}/account`} className="rounded-md btn-gold font-semibold px-5 py-2.5 text-sm">{t("account")}</a>
                  : <a href={signup} className="rounded-md btn-gold font-semibold px-5 py-2.5 text-sm">{t("cta")}</a>}
                <a href={botLink} target="_blank" rel="noopener" className="rounded-md border border-border px-4 py-2.5 text-sm hover:border-gold/50">{t("bot")}</a>
              </div>
              {!signedIn && <p className="relative mt-3 text-[11px] text-muted">{t("fine")}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
