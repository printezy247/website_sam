import { marked } from "marked";
import { slugify } from "@/lib/articles";

/** Render our own markdown. Adds ids to H2/H3 (for the table of contents), strips script/iframe/on* attributes defensively. */
export function renderMarkdown(md: string) {
  let html = marked.parse(md, { async: false }) as string;
  const seen = new Map<string, number>();
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, lvl, inner) => {
    const base = slugify(inner.replace(/<[^>]+>/g, "")) || "section";
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    return `<h${lvl} id="${n > 1 ? `${base}-${n}` : base}">${inner}</h${lvl}>`;
  });
  return html.replace(/<\/?(script|iframe|object|embed|style)[^>]*>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
}

/** Headings for a TOC without rendering twice. */
export function extractHeadings(md: string) {
  const seen = new Map<string, number>();
  return [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1].replace(/[*_`]/g, "").trim();
    const base = slugify(text) || "section";
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    return { id: n > 1 ? `${base}-${n}` : base, text };
  });
}
