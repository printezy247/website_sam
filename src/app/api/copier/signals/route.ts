// The EA polls this: GET /api/copier/signals?key=<licence>&account=<login>.
// Returns what this terminal should do next, oldest first.
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { copierLinks, licenses } from "@/db/schema";
import { canAccessProduct } from "@/lib/access";
import { commandsFor } from "@/lib/copier";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim();
  const account = url.searchParams.get("account")?.replace(/\D/g, "");
  if (!key || !account) return Response.json({ ok: false, error: "key and account required" }, { status: 400 });

  const [l] = await db.select().from(licenses).where(eq(licenses.id, key)).catch(() => []);
  if (!l) return Response.json({ ok: false, error: "unknown key" }, { status: 404 });
  if (l.expiresAt && l.expiresAt < new Date()) return Response.json({ ok: false, error: "expired" }, { status: 403 });
  const { ok: entitled } = await canAccessProduct(l.userId, l.productId);
  if (!entitled) return Response.json({ ok: false, error: "rank no longer includes the copier" }, { status: 403 });

  const [link] = await db.select().from(copierLinks).where(and(eq(copierLinks.userId, l.userId), eq(copierLinks.mt5Account, account))).catch(() => []);
  if (!link) return Response.json({ ok: false, error: "terminal not linked, call hello first" }, { status: 404 });
  await db.update(copierLinks).set({ lastSeenAt: new Date() }).where(eq(copierLinks.id, link.id));
  if (!link.enabled) return Response.json({ ok: true, paused: true, commands: [] });

  return Response.json({ ok: true, paused: false, commands: await commandsFor(link) });
}
