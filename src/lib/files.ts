import { createReadStream, existsSync, statSync } from "node:fs";
import { basename, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";

/**
 * Resolve a product file path to something we can serve.
 * - "https://…" → redirect target
 * - "tg:<file_id>" → Telegram document (served by the bot)
 * - anything else → first match of UPLOAD_DIR/<path> (Railway volume) or <repo>/assets/<path> (bundled ebooks).
 *   Relative paths with subfolders are allowed; ".." is rejected.
 */
export function resolveProductFile(fp: string): { kind: "url"; url: string } | { kind: "telegram"; fileId: string } | { kind: "file"; abs: string } | { kind: "missing" } {
  if (/^https?:\/\//.test(fp)) return { kind: "url", url: fp };
  if (fp.startsWith("tg:")) return { kind: "telegram", fileId: fp.slice(3) };
  const rel = normalize(fp).replace(/^([/\\])+/, "");
  if (rel.split(/[/\\]/).includes("..")) return { kind: "missing" };
  const roots = [process.env.UPLOAD_DIR ?? "/data/uploads", join(process.cwd(), "assets")];
  for (const root of roots) {
    const abs = resolve(root, rel);
    if (abs.startsWith(resolve(root)) && existsSync(abs)) return { kind: "file", abs };
  }
  return { kind: "missing" };
}

/** Stream a local file. Downloads by default; `inline` lets the browser render it (used by the ebook reader). */
export function fileResponse(abs: string, opts: { inline?: boolean } = {}) {
  const name = basename(abs);
  const type = /\.pdf$/i.test(name) ? "application/pdf" : "application/octet-stream";
  const disposition = opts.inline ? "inline" : "attachment";
  return new Response(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
    headers: {
      "content-type": type, "content-length": String(statSync(abs).size),
      "content-disposition": `${disposition}; filename="${name}"`,
      ...(opts.inline ? { "accept-ranges": "bytes" } : {}),
    },
  });
}
