"use server";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { auth, requireAdmin } from "@/auth";
import { db } from "@/db";
import { ibAccounts, signals, signalEvents, tvAccessRequests, users } from "@/db/schema";
import { approveIbAccount, rejectIbAccount } from "@/lib/ib";
import { fanoutSignal, fanoutUpdate } from "@/lib/signals-fanout";
import { grantEntitlement } from "@/lib/entitlements";
import type { TierKey } from "@/config/tiers";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function submitIbVerification(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  const accountNo = str(fd, "accountNo");
  if (!/^\d{5,12}$/.test(accountNo)) throw new Error("invalid account number");
  const [u] = await db.select().from(users).where(eq(users.id, session.user.id));
  await db.insert(ibAccounts).values({
    userId: session.user.id, telegramId: u?.telegramId ?? undefined, region: str(fd, "region") || "my", accountNo,
    fullName: str(fd, "fullName"), balanceUsd: str(fd, "balance") || null, status: "pending",
  }).onConflictDoUpdate({ target: [ibAccounts.broker, ibAccounts.accountNo], set: { userId: session.user.id, fullName: str(fd, "fullName"), balanceUsd: str(fd, "balance") || null, status: "pending" } });
  revalidatePath("/account");
}

export async function requestTvAccess(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  await db.insert(tvAccessRequests).values({ userId: session.user.id, tvUsername: str(fd, "tvUsername") });
  revalidatePath("/account");
}

// ---- admin ----
export async function adminCreateSignal(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const [s] = await db.insert(signals).values({
    instrument: str(fd, "instrument") || "XAUUSD", side: str(fd, "side"), entry: str(fd, "entry"), sl: str(fd, "sl"),
    tp1: str(fd, "tp1") || null, tp2: str(fd, "tp2") || null, tp3: str(fd, "tp3") || null, note: str(fd, "note") || null,
    visibility: str(fd, "visibility") || "pro", newsLockout: fd.get("newsLockout") === "on",
  }).returning();
  await fanoutSignal(s.id).catch((e) => console.error(e));
  revalidatePath("/admin/signals");
}

export async function adminUpdateSignal(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const id = str(fd, "id"); const status = str(fd, "status");
  const resultR = str(fd, "resultR"); const resultPips = str(fd, "resultPips");
  const closing = ["tp1", "tp2", "tp3", "sl", "be", "closed"].includes(status);
  await db.update(signals).set({
    status, resultR: resultR || null, resultPips: resultPips || null, closedAt: closing ? new Date() : null,
  }).where(eq(signals.id, id));
  const text = str(fd, "text") || `📌 ${status.toUpperCase()}${resultR ? ` · ${Number(resultR) >= 0 ? "+" : ""}${resultR}R` : ""}`;
  await db.insert(signalEvents).values({ signalId: id, type: status, text });
  await fanoutUpdate(id, text).catch((e) => console.error(e));
  revalidatePath("/admin/signals"); revalidatePath("/results");
}

export async function adminApproveIb(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const dep = str(fd, "depositUsd");
  await approveIbAccount(str(fd, "id"), dep ? Number(dep) : undefined);
  revalidatePath("/admin/ib");
}
export async function adminRejectIb(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  await rejectIbAccount(str(fd, "id"), str(fd, "note") || undefined);
  revalidatePath("/admin/ib");
}
export async function adminGrant(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const days = Number(str(fd, "days") || 30);
  await grantEntitlement({ userId: str(fd, "userId"), tierKey: str(fd, "tier") as TierKey, source: "manual", expiresAt: new Date(Date.now() + days * 864e5) });
  revalidatePath("/admin/users");
}
export async function listPendingIb() {
  return db.select().from(ibAccounts).where(eq(ibAccounts.status, "pending")).orderBy(desc(ibAccounts.createdAt));
}
