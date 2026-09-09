// The EA calls this on start and every few minutes: POST { key, account, broker, currency }.
// Validates the licence, binds the terminal, returns the member's risk settings.
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { copierLinks, licenses } from "@/db/schema";
import { canAccessProduct } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { key?: string; account?: string; broker?: string; currency?: string } | null;
  const key = body?.key?.trim();
  const account = body?.account?.replace(/\D/g, "");
  if (!key || !account) return Response.json({ ok: false, error: "key and account required" }, { status: 400 });

  const [l] = await db.select().from(licenses).where(eq(licenses.id, key)).catch(() => []);
  if (!l) return Response.json({ ok: false, error: "unknown key" }, { status: 404 });
  if (l.expiresAt && l.expiresAt < new Date()) return Response.json({ ok: false, error: "expired" }, { status: 403 });
  const { ok: entitled } = await canAccessProduct(l.userId, l.productId);
  if (!entitled) return Response.json({ ok: false, error: "rank no longer includes the copier" }, { status: 403 });

  // Bind the terminal, honouring the licence activation limit.
  const bound = (l.mt5Account ?? "").split(",").filter(Boolean);
  if (!bound.includes(account)) {
    if (bound.length >= l.maxActivations) return Response.json({ ok: false, error: "activation limit reached" }, { status: 403 });
    bound.push(account);
    await db.update(licenses).set({ mt5Account: bound.join(","), activations: bound.length }).where(eq(licenses.id, l.id));
  }

  let [link] = await db.select().from(copierLinks).where(and(eq(copierLinks.userId, l.userId), eq(copierLinks.mt5Account, account))).catch(() => []);
  if (!link) {
    [link] = await db.insert(copierLinks).values({
      userId: l.userId, licenseId: l.id, mt5Account: account,
      broker: body?.broker?.slice(0, 80) ?? null, currency: body?.currency?.slice(0, 8) ?? null,
      lastSeenAt: new Date(),
    }).returning();
  } else {
    await db.update(copierLinks).set({ lastSeenAt: new Date(), broker: body?.broker?.slice(0, 80) ?? link.broker, currency: body?.currency?.slice(0, 8) ?? link.currency }).where(eq(copierLinks.id, link.id));
  }
  if (!link) return Response.json({ ok: false, error: "link failed" }, { status: 500 });

  return Response.json({
    ok: true, link: link.id, enabled: link.enabled,
    risk_mode: link.riskMode, lot_fixed: Number(link.lotFixed), risk_percent: Number(link.riskPercent),
    max_lot: Number(link.maxLot), expiry_minutes: link.expiryMinutes, symbol_suffix: link.symbolSuffix,
    poll_seconds: 15, server_time: new Date().toISOString(),
  });
}
