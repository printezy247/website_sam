"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

const EbookReader = dynamic(() => import("./EbookReader").then((m) => m.EbookReader), { ssr: false });

export type DeckItem = { id: string; slug: string; name: string; description: string | null; language: string | null };
type Lang = "ms" | "en";

/**
 * Free ebook deck: one cover at a time on a 3D roll, holographic prev/next, actions on the front cover.
 * One language per deck; the toggle swaps the whole deck and replays the roll.
 */
export function EbookDeck({ decks, signedIn }: { decks: Record<Lang, DeckItem[]>; signedIn: boolean }) {
  const t = useTranslations("ebooks");
  const locale = useLocale();
  const [lang, setLang] = useState<Lang>(locale === "en" ? "en" : "ms");
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<DeckItem | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const items = decks[lang] ?? [];
  const count = items.length;
  const active = items[index];
  const signup = `/${locale}/signin?callbackUrl=${encodeURIComponent(`/${locale}/account?claim=free`)}`;

  const go = useCallback((step: number) => { setIndex((i) => (count ? (i + step + count) % count : 0)); }, [count]);
  const switchLang = (next: Lang) => { setLang(next); setIndex(0); };

  // Arrow keys move the deck while the stage holds focus.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };

  // Horizontal swipe on touch.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current; touch.current = null; if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const slots = useMemo(() => items.map((b, i) => {
    // Signed distance from the active card, wrapped so the deck rolls the short way round.
    let off = i - index;
    if (count > 2) { if (off > count / 2) off -= count; if (off < -count / 2) off += count; }
    // Slot geometry is computed here rather than in CSS: calc() has no portable abs().
    const d = Math.min(Math.abs(off), 2);
    const style = {
      "--x": `${off * 58}%`, "--z": `${-170 * off * off}px`, "--ry": `${off * -34}deg`,
      "--s": String(1 - d * 0.12), "--o": String(1 - d * 0.35), "--b": `${d * 1.2}px`,
      zIndex: 10 - Math.min(Math.abs(off), 3),
      visibility: Math.abs(off) > 2 ? ("hidden" as const) : undefined,
    } as React.CSSProperties;
    return { book: b, off, style };
  }), [items, index, count]);

  if (!count) return null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted mt-2 max-w-xl">{t("subtitle")}</p>
        </div>
        <div className="inline-flex rounded-full border border-border p-1 text-xs" role="group" aria-label={t("lang_group")}>
          {(["ms", "en"] as const).map((l) => (
            <button key={l} type="button" onClick={() => switchLang(l)} aria-pressed={lang === l}
              className={`rounded-full px-3 py-1.5 transition-colors ${lang === l ? "bg-chrome/90 text-black font-semibold" : "text-muted hover:text-fg"}`}>
              {t(l === "ms" ? "lang_ms" : "lang_en")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 md:gap-6">
        <button type="button" onClick={() => go(-1)} className="holo-btn shrink-0" aria-label={t("prev")}>
          <span aria-hidden>‹</span>
        </button>

        <div ref={stage} className="deck-stage flex-1" tabIndex={0} onKeyDown={onKey} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          role="group" aria-roledescription="carousel" aria-label={t("title")}>
          {slots.map(({ book, off, style }) => {
            const front = off === 0;
            return (
              <article key={book.id} className="deck-card" data-front={front || undefined} aria-hidden={!front} style={style}>
                <button type="button" tabIndex={front ? 0 : -1} onClick={() => (front ? setOpen(book) : go(off > 0 ? 1 : -1))}
                  className="deck-cover" aria-label={front ? `${t("read")}: ${book.name}` : book.name}>
                  <Image src={`/ebooks/${book.slug}.png`} alt="" width={360} height={466} className="deck-img" priority={front} />
                  <span className="deck-spine" aria-hidden />
                </button>
                {front && (
                  <div className="deck-actions">
                    <button type="button" ref={opener} onClick={() => setOpen(book)} className="btn-gold rounded-md px-4 py-2 text-sm">{t("read")}</button>
                    {signedIn
                      ? <a href={`/api/downloads/${book.id}`} className="holo-btn holo-wide text-sm">{t("download")}</a>
                      : <a href={signup} className="holo-btn holo-wide text-sm">{t("claim")}</a>}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <button type="button" onClick={() => go(1)} className="holo-btn shrink-0" aria-label={t("next")}>
          <span aria-hidden>›</span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="font-semibold">{active?.name}</p>
        <p className="text-sm text-muted mt-1 max-w-xl mx-auto">{active?.description}</p>
        <div className="mt-4 flex justify-center gap-2">
          {items.map((b, i) => (
            <button key={b.id} type="button" onClick={() => setIndex(i)} aria-label={b.name} aria-current={i === index}
              className={`deck-dot ${i === index ? "deck-dot-on" : ""}`} />
          ))}
        </div>
      </div>

      {open && <EbookReader book={open} signedIn={signedIn} signupHref={signup} onClose={() => { setOpen(null); opener.current?.focus(); }} />}
    </div>
  );
}
