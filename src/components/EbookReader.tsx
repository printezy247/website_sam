"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DeckItem } from "./EbookDeck";

type Doc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};

/**
 * Reader overlay. Guests get the open preview (first pages, served pre-sliced) and a sign-up gate;
 * members get the whole book inline. Pages render to canvas and snap as you scroll, like an ebook.
 */
export function EbookReader({ book, signedIn, signupHref, onClose }: { book: DeckItem; signedIn: boolean; signupHref: string; onClose: () => void }) {
  const t = useTranslations("ebooks");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [pages, setPages] = useState(0);
  const [current, setCurrent] = useState(1);
  const [error, setError] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  // Escape closes; the page behind stays put while the overlay is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    frame.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Load the PDF and render every page to its own canvas.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const url = signedIn ? `/api/ebooks/${book.id}/inline` : `/api/ebooks/${book.id}/preview`;
        const loaded = (await pdfjs.getDocument({ url }).promise) as unknown as Doc;
        if (cancelled) return;
        setDoc(loaded);
        setPages(loaded.numPages);
      } catch { if (!cancelled) setError(true); }
    })();
    return () => { cancelled = true; };
  }, [book.id, signedIn]);

  // Counter follows whichever page sits closest to the middle of the frame. A page can be taller
  // than the frame, so visibility ratios are not a reliable signal here.
  useEffect(() => {
    const root = scroller.current;
    if (!root || !pages) return;
    let queued = false;
    const update = () => {
      queued = false;
      const mid = root.getBoundingClientRect().top + root.clientHeight / 2;
      let best = 1, dist = Infinity;
      root.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.top + r.height / 2) - mid);
        if (d < dist) { dist = d; best = Number(el.dataset.page); }
      });
      setCurrent(best);
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [pages]);

  return (
    <div className="reader-overlay" onClick={onClose} role="presentation">
      <div ref={frame} className="reader-frame" role="dialog" aria-modal="true" aria-label={book.name} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <header className="reader-head">
          <div className="min-w-0">
            <p className="font-semibold truncate">{book.name}</p>
            <p className="text-xs text-muted">{pages ? t("page_of", { n: current, total: pages }) : t("loading")}</p>
          </div>
          <button type="button" onClick={onClose} className="holo-btn shrink-0" aria-label={t("close")}><span aria-hidden>✕</span></button>
        </header>

        <div ref={scroller} className="reader-scroll">
          {error && <p className="p-8 text-center text-loss">{t("error")}</p>}
          {Array.from({ length: pages }, (_, i) => (
            <PageCanvas key={i} doc={doc} n={i + 1} />
          ))}
          {pages > 0 && (
            <div className="reader-page reader-gate">
              <div className="text-center max-w-sm">
                <p className="text-xl font-semibold">{signedIn ? t("end_title") : t("gate_title")}</p>
                <p className="text-sm text-muted mt-2">{signedIn ? t("end_body") : t("gate_body")}</p>
                {signedIn
                  ? <a href={`/api/downloads/${book.id}`} className="btn-gold rounded-md px-5 py-2.5 inline-block mt-5 text-sm">{t("download")}</a>
                  : <a href={signupHref} className="btn-gold rounded-md px-5 py-2.5 inline-block mt-5 text-sm">{t("gate_cta")}</a>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One page, rendered at device pixel ratio the first time it comes near the viewport. */
function PageCanvas({ doc, n }: { doc: Doc | null; n: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el || !doc) return;
    const render = async () => {
      if (done.current || !canvas.current) return;
      done.current = true;
      const page = await doc.getPage(n);
      const width = Math.min(el.clientWidth || 720, 900);
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.round(viewport.width); c.height = Math.round(viewport.height);
      c.style.width = "100%"; c.style.height = "auto";
      const ctx = c.getContext("2d");
      if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
    };
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { void render(); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [doc, n]);

  return (
    <div ref={wrap} className="reader-page" data-page={n}>
      <canvas ref={canvas} className="reader-canvas" aria-label={`page ${n}`} />
    </div>
  );
}
