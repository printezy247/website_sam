import { readFileSync, statSync } from "node:fs";

type Line = { y: number; h: number; text: string };
type Item = { str: string; transform: number[] };

const cache = new Map<string, { points: string[]; pages: number }>();

/** Group text items into lines, keeping the largest glyph height seen on each line. */
function lines(items: Item[]): Line[] {
  const out: Line[] = [];
  let last: Line | null = null;
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    const h = Math.abs(it.transform[3]) || 0;
    if (last && Math.abs(last.y - y) < 3) { last.text += it.str; last.h = Math.max(last.h, h); }
    else { last = { y, h, text: it.str }; out.push(last); }
  }
  return out;
}

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const KEEP = new Set(["XAUUSD", "HFM", "MYT", "CFD", "US", "TP", "SL", "SOP", "NFP", "CPI", "FOMC", "AI"]);
const SMALL = new Set(["and", "or", "the", "a", "an", "of", "to", "on", "in", "for", "with", "that", "dan", "atau", "di", "ke", "pada", "yang", "untuk"]);
/** Turn a shouted PDF heading into a readable line: drop its section number, keep acronyms. */
function headline(raw: string) {
  const words = raw.replace(/^\d{1,2}[.)]?\s+/, "").split(" ").filter(Boolean);
  return words
    .map((w, i) => {
      const bare = w.replace(/[^\p{L}\p{N}]/gu, "");
      if (KEEP.has(bare.toUpperCase()) && bare.length <= 6 && w === w.toUpperCase()) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * What the rest of an ebook covers: the headline of every page after the first.
 * A heading is the biggest type on its page, so pick by glyph height rather than by wording.
 * Cached per file and mtime; the PDFs only change on deploy.
 */
export async function ebookOutline(abs: string): Promise<{ points: string[]; pages: number }> {
  const key = `${abs}:${statSync(abs).mtimeMs}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(abs)), useSystemFonts: false, isEvalSupported: false }).promise;
  const points: string[] = [];
  for (let n = 2; n <= doc.numPages && points.length < 8; n++) {
    const content = await doc.getPage(n).then((p) => p.getTextContent());
    const ls = lines(content.items as Item[]).map((l) => ({ ...l, text: tidy(l.text) })).filter((l) => l.text.length >= 6 && l.text.length <= 70);
    if (!ls.length) continue;
    const max = Math.max(...ls.map((l) => l.h));
    const at = ls.findIndex((l) => l.h >= Math.max(18, max * 0.8) && l.text.split(" ").length >= 2);
    if (at < 0) continue;
    // A heading that wraps in the PDF arrives as several lines of the same size, stacked
    // one line-height apart. Join them so the point reads as one phrase.
    let text = ls[at].text;
    for (let k = at + 1; k < ls.length; k++) {
      const prev = ls[k - 1], cur = ls[k];
      const sameSize = Math.abs(cur.h - prev.h) <= prev.h * 0.1;
      const nextLine = prev.y - cur.y > 0 && prev.y - cur.y < prev.h * 1.8;
      if (!sameSize || !nextLine) break;
      text += " " + cur.text;
    }
    points.push(headline(text));
  }
  const result = { points: [...new Set(points)], pages: doc.numPages };
  cache.set(key, result);
  return result;
}
