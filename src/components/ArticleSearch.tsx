"use client";
import { useEffect, useState } from "react";
/** Filters article cards on the page by title/excerpt text (client-only, no server round-trip). */
export function ArticleSearch({ placeholder }: { placeholder: string }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-article]");
    const needle = q.trim().toLowerCase();
    cards.forEach((c) => { c.hidden = Boolean(needle) && !(c.dataset.article ?? "").includes(needle); });
  }, [q]);
  return <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="w-full sm:w-72 rounded-md bg-surface border border-border px-3 py-2 text-sm" aria-label={placeholder} />;
}
