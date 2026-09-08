"use client";
import { useEffect, useState } from "react";

/**
 * Progressive enhancements for an article page:
 * - reading progress bar
 * - checklists: list items under a heading containing "checklist"/"senarai semak" become checkboxes (saved per article in localStorage)
 * - copy-link button state
 */
export function ArticleEnhancer({ slug, labels }: { slug: string; labels: { copy: string; copied: string; done: string } }) {
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [doneCount, setDoneCount] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("article-body"); if (!el) return;
      const top = el.offsetTop, h = el.offsetHeight - window.innerHeight * 0.6;
      setProgress(Math.max(0, Math.min(1, (window.scrollY - top + window.innerHeight * 0.3) / Math.max(1, h))));
    };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const body = document.getElementById("article-body"); if (!body) return;
    const key = `sam_chk:${slug}`;
    let saved: Record<string, boolean> = {};
    try { saved = JSON.parse(localStorage.getItem(key) ?? "{}"); } catch { /* ignore */ }
    const heads = [...body.querySelectorAll("h2, h3")].filter((h) => /checklist|senarai|semak|takeaway|ringkasan|summary/i.test(h.textContent ?? ""));
    const items: HTMLLIElement[] = [];
    for (const h of heads) {
      let n = h.nextElementSibling;
      while (n && !/^H[23]$/.test(n.tagName)) { if (n.tagName === "UL" || n.tagName === "OL") items.push(...(n.querySelectorAll("li") as NodeListOf<HTMLLIElement>)); n = n.nextElementSibling; }
    }
    const update = () => { const done = items.filter((li) => li.dataset.done === "1").length; setDoneCount({ done, total: items.length }); };
    items.forEach((li, i) => {
      if (li.dataset.enhanced) return;
      li.dataset.enhanced = "1";
      const id = `${i}`;
      const box = document.createElement("input"); box.type = "checkbox"; box.className = "mr-2 accent-[#d4af37] align-middle cursor-pointer";
      box.checked = Boolean(saved[id]); li.dataset.done = box.checked ? "1" : "0";
      li.classList.add("cursor-pointer", "select-none", "transition-opacity");
      if (box.checked) li.classList.add("opacity-60", "line-through");
      box.addEventListener("change", () => {
        saved[id] = box.checked; li.dataset.done = box.checked ? "1" : "0";
        li.classList.toggle("opacity-60", box.checked); li.classList.toggle("line-through", box.checked);
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* ignore */ }
        update();
      });
      li.prepend(box);
    });
    if (items.length) update();
  }, [slug]);

  const copy = async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 h-0.5 bg-transparent pointer-events-none"><div className="h-full bg-gold transition-[width] duration-150" style={{ width: `${progress * 100}%` }} /></div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button onClick={copy} className="rounded-md border border-border px-3 py-1.5 hover:border-gold/50">{copied ? labels.copied : labels.copy}</button>
        {doneCount && doneCount.total > 0 && <span className="text-muted">{labels.done}: <span className="font-mono text-gold">{doneCount.done}/{doneCount.total}</span></span>}
      </div>
    </>
  );
}
