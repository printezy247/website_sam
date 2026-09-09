// The EA reports back what it did: POST { key, account, signal, action, status, ticket?, lots?, price?, detail? }.
// One row per attempt, which is both the member's trade log and the guard against a repeat order.
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { copierLinks, copierTrades, licenses } from "@/db/schema";

export const dynamic = "force-dynamic";
const ACTIONS = new Set(["open", "close", "move_sl"]);
const STATUSES = new Set(["placed", "filled", "rejected", "closed", "skipped"]);

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, string | number | undefined> | null;
  const key = String(b?.key ?? "").trim();
  const account = String(b?.account ?? "").replace(/\D/g, "");
  const signal = String(b?.signal ?? "").trim();
  const action = String(b?.action ?? "");
  const status = String(b?.status ?? "");
  if (!key || !account || !signal || !ACTIONS.has(action) || !STATUSES.has(status)) {
    return Response.json({ ok: false, error: "key, account, signal, action and status required" }, { status: 400 });
  }
  const [l] = await db.select().from(licenses).where(eq(licenses.id, key)).catch(() => []);
  if (!l) return Response.json({ ok: false, error: "unknown key" }, { status: 404 });
  const [link] = await db.select().from(copierLinks).where(and(eq(copierLinks.userId, l.userId), eq(copierLinks.mt5Account, account))).catch(() => []);
  if (!link) return Response.json({ ok: false, error: "terminal not linked" }, { status: 404 });

  const detail = b?.detail ? String(b.detail).slice(0, 300) : null;
  await db.insert(copierTrades).values({
    linkId: link.id, signalId: signal, action, status,
    ticket: b?.ticket ? String(b.ticket).slice(0, 40) : null,
    lots: b?.lots != null ? String(b.lots) : null,
    price: b?.price != null ? String(b.price) : null,
    detail,
  });
  await db.update(copierLinks).set({ lastSeenAt: new Date(), lastError: status === "rejected" ? detail : null }).where(eq(copierLinks.id, link.id));
  return Response.json({ ok: true });
}
