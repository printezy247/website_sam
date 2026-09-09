import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ebookOutline } from "@/lib/ebook-outline";
import { resolveProductFile } from "@/lib/files";
import { PREVIEW_PAGES } from "@/lib/pdf-preview";

export const dynamic = "force-dynamic";

/** Headings of the pages a guest does not get, so the preview can say what is behind the gate. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.active, true))).catch(() => []);
  if (!p || p.type !== "ebook" || p.ebookTier !== "free" || p.priceCents !== 0 || !p.filePath) return new Response("not found", { status: 404 });
  const f = resolveProductFile(p.filePath);
  if (f.kind !== "file") return new Response("not found", { status: 404 });
  const o = await ebookOutline(f.abs).catch((e) => { console.warn("[outline]", (e as Error).message); return null; });
  if (!o) return new Response("unreadable", { status: 404 });
  return Response.json({ points: o.points, rest: Math.max(o.pages - PREVIEW_PAGES, 0) }, { headers: { "cache-control": "public, max-age=3600" } });
}
