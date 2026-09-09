import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { resolveProductFile } from "@/lib/files";
import { PREVIEW_PAGES, previewPdf } from "@/lib/pdf-preview";

export const dynamic = "force-dynamic";

/** Open preview of a Free ebook: the first pages only, no account needed. Everything else is 404. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.active, true))).catch(() => []);
  if (!p || p.type !== "ebook" || p.ebookTier !== "free" || p.priceCents !== 0 || !p.filePath) return new Response("not found", { status: 404 });
  const f = resolveProductFile(p.filePath);
  if (f.kind !== "file") return new Response("not found", { status: 404 });
  const bytes = await previewPdf(f.abs, PREVIEW_PAGES).catch(() => null);
  if (!bytes) return new Response("unreadable", { status: 404 });
  return new Response(bytes as BodyInit, {
    headers: {
      "content-type": "application/pdf", "content-length": String(bytes.byteLength),
      "content-disposition": "inline", "cache-control": "public, max-age=3600",
    },
  });
}
