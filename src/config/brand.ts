// Single source of truth for brand strings. "Sam" is a placeholder name.
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Sam",
  tagline: "Gold signals with full transparency. Two ways in.",
  privateGroupName: "Sam Flip Seribu",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  telegram: {
    publicChannel: process.env.NEXT_PUBLIC_TG_PUBLIC_CHANNEL ?? "https://t.me/",
    botUsername: process.env.NEXT_PUBLIC_TG_BOT_USERNAME ?? "SamTradingBot",
    registerGuide: "https://t.me/stepsregistersam",
    support: process.env.NEXT_PUBLIC_TG_SUPPORT ?? "https://t.me/",
  },
  broker: {
    name: "HFM",
    refId: "30548341",
    links: {
      my: process.env.HFM_LINK_MY ?? "https://www.hfmmalaysia.com/sv/en/?refid=30548341",
      id: process.env.HFM_LINK_ID ?? "https://www.hfmtrade-ind.com/sv/en/?refid=30548341",
    },
  },
  /** Scarcity cap shown on landing; real cap enforced in admin approvals. */
  foundingMemberCap: 50,
  since: 2022,
  myfxbookWidgetUrl: process.env.NEXT_PUBLIC_MYFXBOOK_WIDGET ?? "",
} as const;

export function botDeepLink(payload?: string) {
  const base = `https://t.me/${BRAND.telegram.botUsername}`;
  return payload ? `${base}?start=${encodeURIComponent(payload)}` : base;
}
