import { createReadStream, existsSync, statSync } from "node:fs";
import { basename, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { auth } from "@/auth";
import { canAccessProduct } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthenticated", { status: 401 });
  const { id } = await params;
  const { ok, product } = await canAccessProduct(session.user.id, id);
  if (!ok || !product) return new Response("forbidden", { status: 403 });
  const fp = product.filePath;
  if (!fp) return new Response("no file", { status: 404 });
  if (/^https?:\/\//.test(fp)) return Response.redirect(fp, 302);
  if (fp.startsWith("tg:")) return new Response("Available via the Telegram bot: /ebook", { status: 409 });
  const dir = process.env.UPLOAD_DIR ?? "/data/uploads";
  const abs = normalize(join(dir, basename(fp)));
  if (!abs.startsWith(normalize(dir)) || !existsSync(abs)) return new Response("file missing", { status: 404 });
  const size = statSync(abs).size;
  return new Response(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
    headers: { "content-type": "application/octet-stream", "content-length": String(size), "content-disposition": `attachment; filename="${basename(fp)}"` },
  });
}
