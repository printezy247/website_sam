import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ibAccounts, inviteLinks, telegramAccounts, users } from "@/db/schema";
import { tierForDeposit, tierLabel } from "@/config/tiers";
import { grantEntitlement } from "@/lib/entitlements";
import { chatForTier, createSingleUseInvite, sendHtml } from "@/lib/telegram";
import { attachReferrer, creditReferrer } from "@/lib/referral";

const IB_DAYS = 30;

/** Approve: set deposit band, grant entitlement (30d), DM invite link. Idempotent per ib_account. */
export async function approveIbAccount(id: string, depositUsd?: number): Promise<{ ok: true; tier: string } | { ok: false; error: string }> {
  const [ib] = await db.select().from(ibAccounts).where(eq(ibAccounts.id, id));
  if (!ib) return { ok: false, error: "not found" };
  const deposit = depositUsd ?? Number(ib.depositUsd ?? ib.balanceUsd ?? 0);
  const tier = tierForDeposit(deposit);

  // Ensure a user row exists for Telegram-only members.
  let userId = ib.userId;
  if (!userId && ib.telegramId) {
    const [existing] = await db.select().from(users).where(eq(users.telegramId, ib.telegramId));
    if (existing) userId = existing.id;
    else {
      const [tg] = await db.select().from(telegramAccounts).where(eq(telegramAccounts.telegramId, ib.telegramId));
      const [created] = await db.insert(users).values({ telegramId: ib.telegramId, tgUsername: tg?.username, name: ib.fullName }).returning();
      userId = created.id;
      await db.update(telegramAccounts).set({ userId }).where(eq(telegramAccounts.telegramId, ib.telegramId));
      if (tg?.campaign?.startsWith("ref_")) await attachReferrer(userId, tg.campaign.slice(4)).catch(() => {});
    }
  }
  if (!userId) return { ok: false, error: "no user" };

  await db.update(ibAccounts).set({ status: "verified", depositUsd: String(deposit), verifiedAt: new Date(), userId }).where(eq(ibAccounts.id, id));
  await grantEntitlement({ userId, tierKey: tier, source: "ib", externalId: `ib:${id}`, expiresAt: new Date(Date.now() + IB_DAYS * 864e5) });
  await creditReferrer(userId).catch((e) => console.error("[referral]", e));

  if (ib.telegramId) {
    const chat = chatForTier(tier);
    const inv = await createSingleUseInvite(chat).catch(() => null);
    if (inv && chat) await db.insert(inviteLinks).values({ telegramId: ib.telegramId, chatId: chat, link: inv.link, expiresAt: inv.expiresAt });
    await sendHtml(ib.telegramId,
      `✅ <b>Akaun disahkan / Account verified</b>\nPelan / Plan: <b>${tierLabel(tier)}</b> (deposit $${deposit})` +
      (inv ? `\n\nLink group (sekali guna, 24 jam / single-use, 24h):\n${inv.link}` : "\n\nAdmin akan hantar link group / Admin will send the group link."),
    ).catch(() => {});
  }
  return { ok: true, tier };
}

export async function rejectIbAccount(id: string, note?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [ib] = await db.select().from(ibAccounts).where(eq(ibAccounts.id, id));
  if (!ib) return { ok: false, error: "not found" };
  await db.update(ibAccounts).set({ status: "rejected", note }).where(eq(ibAccounts.id, id));
  if (ib.telegramId) await sendHtml(ib.telegramId, `❌ Pengesahan ditolak / Verification rejected.${note ? `\n${note}` : ""}\nCuba lagi dengan /verify atau hubungi sokongan.`).catch(() => {});
  return { ok: true };
}
