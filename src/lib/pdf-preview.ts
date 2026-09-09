import { readFileSync, statSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

/** How many pages an anonymous visitor may read before the sign-up gate. */
export const PREVIEW_PAGES = 3;

const cache = new Map<string, Uint8Array>();

/**
 * First `pages` pages of a PDF as a standalone document. This is the server-side gate:
 * a guest never receives the bytes of the rest of the book. Cached per file and mtime.
 */
export async function previewPdf(abs: string, pages = PREVIEW_PAGES): Promise<Uint8Array> {
  const key = `${abs}:${statSync(abs).mtimeMs}:${pages}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const src = await PDFDocument.load(readFileSync(abs), { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const take = Math.min(pages, src.getPageCount());
  const copied = await out.copyPages(src, Array.from({ length: take }, (_, i) => i));
  for (const page of copied) out.addPage(page);
  const bytes = await out.save();
  cache.set(key, bytes);
  return bytes;
}
