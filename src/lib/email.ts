// Transactional email via Resend. No-ops (returns null) when RESEND_API_KEY is unset.
import { Resend } from "resend";
import { BRAND, botDeepLink } from "@/config/brand";

export function emailConfigured() { return Boolean(process.env.RESEND_API_KEY); }

export async function sendEmail(to: string, subject: string, html: string) {
  if (!emailConfigured()) return null;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.AUTH_EMAIL_FROM ?? "noreply@example.com";
  const r = await resend.emails.send({ from, to, subject, html: layout(html) });
  if (r.error) throw new Error(r.error.message);
  return r.data?.id ?? null;
}

function layout(inner: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#050505;color:#f3f4f6;padding:32px"><div style="max-width:560px;margin:0 auto;background:#0b0e14;border:1px solid #1e2330;border-radius:16px;padding:28px">
<div style="font-weight:700;font-size:20px">${BRAND.name}<span style="color:#d4af37">.</span></div>
<div style="margin-top:20px;line-height:1.6;font-size:15px;color:#d1d5db">${inner}</div>
<p style="margin-top:28px;font-size:11px;color:#6b7280;line-height:1.5">Trading gold, forex and CFDs on margin carries a high level of risk. 70–80% of retail accounts lose money. Education only, not financial advice. ${BRAND.name} is an HFM Introducing Broker partner.</p>
</div></div>`;
}

const btn = (href: string, label: string) => `<a href="${href}" style="display:inline-block;margin:8px 8px 8px 0;background:#d4af37;color:#000;font-weight:700;padding:10px 18px;border-radius:8px;text-decoration:none">${label}</a>`;
const link = (href: string, label: string) => `<a href="${href}" style="color:#d4af37">${label}</a>`;

export type Drip = { step: number; delayDays: number; subject: Record<"ms" | "en", string>; html: (o: { name: string; locale: "ms" | "en"; ebookUrl: string }) => string };

/** Step 0 is the welcome email (sent immediately); later steps run from the jobs cron. */
export const DRIP: Drip[] = [
  {
    step: 0, delayDays: 0,
    subject: { ms: "Ebook anda: Gold Trading Starter", en: "Your ebook: Gold Trading Starter" },
    html: ({ name, locale, ebookUrl }) => locale === "ms"
      ? `<p>Hai ${name},</p><p>Ebook anda di bawah. Baca bab risiko dulu. Itu bab paling penting.</p>${btn(ebookUrl, "Muat turun ebook")}${btn(botDeepLink("ebook_lead"), "Buka bot Telegram")}<p>Signal XAUUSD dihantar di channel awam setiap hari, tanpa yuran. ${link(BRAND.siteUrl, "Semak rekod")} sebelum buat keputusan.</p>`
      : `<p>Hi ${name},</p><p>Your ebook is below. Read the risk chapter first. It is the one that matters.</p>${btn(ebookUrl, "Download ebook")}${btn(botDeepLink("ebook_lead"), "Open Telegram bot")}<p>XAUUSD signals go out on the public channel daily, no fee. ${link(BRAND.siteUrl, "Check the record")} before you decide anything.</p>`,
  },
  {
    step: 1, delayDays: 2,
    subject: { ms: "Dua cara masuk. Satu tanpa yuran.", en: "Two ways in. One has no fee." },
    html: ({ name, locale }) => locale === "ms"
      ? `<p>${name}, soalan paling kerap: perlu bayar ke?</p><p>Tidak. Buka akaun HFM melalui link kami dan General terbuka tanpa deposit. $100 buka A-Team, $500 buka Rambo. Modal kekal dalam akaun anda sendiri.</p>${btn(BRAND.broker.links.my, "Daftar HFM (MY/SG/BN)")}${btn(`${BRAND.siteUrl}/pricing`, "Lihat semua pangkat")}<p>Sudah ada broker lain? Pangkat berbayar bermula $9/bulan.</p>`
      : `<p>${name}, the most common question: do I have to pay?</p><p>No. Open an HFM account under our link and General unlocks with no deposit. $100 unlocks A-Team, $500 unlocks Rambo. Your money stays in your own account.</p>${btn(BRAND.broker.links.my, "Open HFM account")}${btn(`${BRAND.siteUrl}/pricing`, "See all ranks")}<p>Already on another broker? Paid ranks start at $9/mo.</p>`,
  },
  {
    step: 2, delayDays: 5,
    subject: { ms: "Rekod kami, termasuk yang rugi", en: "Our record, losses included" },
    html: ({ name, locale }) => locale === "ms"
      ? `<p>${name}, setiap signal yang kami hantar dikira automatik di halaman rekod, termasuk yang kena SL.</p>${btn(`${BRAND.siteUrl}/results`, "Buka rekod prestasi")}<p>Tiada janji kadar menang. Yang kami janji: entry, SL dan TP yang jelas, setiap kali.</p><p>Bila sedia, ${link(`${BRAND.siteUrl}/pricing`, "pilih pangkat")} atau balas emel ini.</p>`
      : `<p>${name}, every signal we post is tallied automatically on the results page, SL hits included.</p>${btn(`${BRAND.siteUrl}/results`, "Open the track record")}<p>No win-rate promises. What we do promise: a clear entry, SL and TP, every time.</p><p>When you are ready, ${link(`${BRAND.siteUrl}/pricing`, "pick a rank")} or reply to this email.</p>`,
  },
];
