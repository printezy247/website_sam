import { Bot, type InlineKeyboard } from "grammy";
import type { InlineKeyboardButton } from "grammy/types";

let bot: Bot | null = null;
export function getBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (!bot) bot = new Bot(token);
  return bot;
}

export function escapeHtml(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const CHATS = {
  admin: process.env.TELEGRAM_ADMIN_CHAT_ID,
  public: process.env.TELEGRAM_PUBLIC_CHANNEL_ID,
  free: process.env.TELEGRAM_FREE_GROUP_ID,
  pro: process.env.TELEGRAM_PRO_GROUP_ID,
  elite: process.env.TELEGRAM_ELITE_GROUP_ID,
} as const;

export function chatForTier(tier: string) {
  return tier === "elite" ? CHATS.elite : tier === "pro" ? CHATS.pro : tier === "free" ? CHATS.free : undefined;
}

/** Single-use invite link valid for 24h. Returns null when bot/chat unset. */
export async function createSingleUseInvite(chatId: string | undefined) {
  const b = getBot();
  if (!b || !chatId) return null;
  const expire = Math.floor(Date.now() / 1000) + 24 * 3600;
  const link = await b.api.createChatInviteLink(chatId, { member_limit: 1, expire_date: expire });
  return { link: link.invite_link, expiresAt: new Date(expire * 1000) };
}

export async function sendHtml(chatId: string | number, html: string, keyboard?: InlineKeyboardButton[][] | InlineKeyboard) {
  const b = getBot();
  if (!b) return null;
  return b.api.sendMessage(chatId, html, {
    parse_mode: "HTML", link_preview_options: { is_disabled: true },
    reply_markup: keyboard ? (Array.isArray(keyboard) ? { inline_keyboard: keyboard } : keyboard) : undefined,
  });
}
