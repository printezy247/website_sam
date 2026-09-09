import { auth } from "@/auth";
import { canAccessProduct } from "@/lib/access";
import { fileResponse, resolveProductFile } from "@/lib/files";

export const dynamic = "force-dynamic";

/** Full ebook rendered in the reader. Same gate as the download route, served inline instead of as an attachment. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthenticated", { status: 401 });
  const { id } = await params;
  const { ok, product } = await canAccessProduct(session.user.id, id);
  if (!ok || !product) return new Response("forbidden", { status: 403 });
  if (!product.filePath) return new Response("no file", { status: 404 });
  const f = resolveProductFile(product.filePath);
  if (f.kind === "url") return Response.redirect(f.url, 302);
  if (f.kind !== "file") return new Response("not available", { status: 404 });
  return fileResponse(f.abs, { inline: true });
}
