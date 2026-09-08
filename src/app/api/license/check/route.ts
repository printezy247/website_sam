// Called by the MT5 indicator/EA on init: POST { license: "<licence id>", account: "<MT5 login>" }.
// Binds the licence to the first accounts used (max activations), rejects others, reports expiry.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { licenses, products } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { license?: string; account?: string } | null;
  const license = body?.license?.trim(); const account = body?.account?.replace(/\D/g, "");
  if (!license || !account) return NextResponse.json({ ok: false, error: "license and account required" }, { status: 400 });
  const [l] = await db.select().from(licenses).where(eq(licenses.id, license));
  if (!l) return NextResponse.json({ ok: false, error: "unknown license" }, { status: 404 });
  if (l.expiresAt && l.expiresAt < new Date()) return NextResponse.json({ ok: false, error: "expired", expires_at: l.expiresAt });
  const bound = (l.mt5Account ?? "").split(",").filter(Boolean);
  if (!bound.includes(account)) {
    if (bound.length >= l.maxActivations) return NextResponse.json({ ok: false, error: "activation limit reached", activations: bound.length, max: l.maxActivations });
    bound.push(account);
    await db.update(licenses).set({ mt5Account: bound.join(","), activations: bound.length }).where(eq(licenses.id, l.id));
  }
  const [p] = await db.select({ slug: products.slug, name: products.name }).from(products).where(eq(products.id, l.productId));
  return NextResponse.json({ ok: true, product: p?.slug, name: p?.name, expires_at: l.expiresAt, activations: bound.length, max: l.maxActivations });
}
