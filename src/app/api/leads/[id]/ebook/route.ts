import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { leadEbook } from "@/lib/ebooks";
import { botDeepLink } from "@/config/brand";
import { fileResponse, resolveProductFile } from "@/lib/files";

export const dynamic = "force-dynamic";

/** Free ebook for a captured lead (lead id acts as the token). Falls back to the bot when no file is available. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l] = await db.select({ id: leads.id, locale: leads.locale }).from(leads).where(eq(leads.id, id));
  if (!l) return new Response("not found", { status: 404 });
  const p = await leadEbook(l.locale);
  const f = p?.filePath ? resolveProductFile(p.filePath) : { kind: "missing" as const };
  if (f.kind === "url") return Response.redirect(f.url, 302);
  if (f.kind === "file") return fileResponse(f.abs);
  return Response.redirect(botDeepLink("ebook_lead"), 302);
}
