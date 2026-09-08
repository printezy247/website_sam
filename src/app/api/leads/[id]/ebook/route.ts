import { createReadStream, existsSync, statSync } from "node:fs";
import { basename, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, products } from "@/db/schema";
import { botDeepLink } from "@/config/brand";

export const dynamic = "force-dynamic";

/** Free ebook for a captured lead (lead id acts as the token). Falls back to the bot when no file is uploaded. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, id));
  if (!l) return new Response("not found", { status: 404 });
  const [p] = await db.select().from(products).where(eq(products.slug, "ebook-gold-starter"));
  const fp = p?.filePath;
  if (!fp || fp.startsWith("tg:")) return Response.redirect(botDeepLink("ebook_lead"), 302);
  if (/^https?:\/\//.test(fp)) return Response.redirect(fp, 302);
  const dir = process.env.UPLOAD_DIR ?? "/data/uploads";
  const abs = normalize(join(dir, basename(fp)));
  if (!abs.startsWith(normalize(dir)) || !existsSync(abs)) return Response.redirect(botDeepLink("ebook_lead"), 302);
  return new Response(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
    headers: { "content-type": "application/octet-stream", "content-length": String(statSync(abs).size), "content-disposition": `attachment; filename="${basename(fp)}"` },
  });
}
