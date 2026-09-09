export type TierKey = "public" | "free" | "pro" | "elite";
export type FeatureKey =
  | "daily_bias" | "weekly_outlook" | "public_signal_delayed" | "free_signals_weekly"
  | "full_xauusd_signals" | "pro_group" | "monthly_report" | "tv_basic_indicator"
  | "all_instruments" | "mt5_suite" | "copier" | "live_analysis" | "priority_qa" | "ebook_free";

export type Tier = {
  key: TierKey;
  rank: number;
  priceMonthCents: number;
  priceYearCents: number;
  /** null = IB door not available; 0 = HFM account with no deposit. */
  ibMinDepositUsd: number | null;
  features: FeatureKey[];
  popular?: boolean;
};

export const TIERS: Tier[] = [
  { key: "public", rank: 0, priceMonthCents: 0, priceYearCents: 0, ibMinDepositUsd: null,
    features: ["public_signal_delayed", "daily_bias"] },
  { key: "free", rank: 1, priceMonthCents: 900, priceYearCents: 9000, ibMinDepositUsd: 0,
    features: ["public_signal_delayed", "daily_bias", "weekly_outlook", "ebook_free", "free_signals_weekly"] },
  { key: "pro", rank: 2, priceMonthCents: 4900, priceYearCents: 49000, ibMinDepositUsd: 100, popular: true,
    features: ["public_signal_delayed", "daily_bias", "weekly_outlook", "ebook_free", "free_signals_weekly",
      "full_xauusd_signals", "pro_group", "monthly_report", "tv_basic_indicator"] },
  { key: "elite", rank: 3, priceMonthCents: 12900, priceYearCents: 129000, ibMinDepositUsd: 500,
    features: ["public_signal_delayed", "daily_bias", "weekly_outlook", "ebook_free", "free_signals_weekly",
      "full_xauusd_signals", "pro_group", "monthly_report", "tv_basic_indicator",
      "all_instruments", "mt5_suite", "copier", "live_analysis", "priority_qa"] },
];

export const FEATURE_ROWS: FeatureKey[] = [
  "daily_bias", "weekly_outlook", "ebook_free", "free_signals_weekly", "full_xauusd_signals", "pro_group",
  "monthly_report", "tv_basic_indicator", "all_instruments", "mt5_suite", "copier", "live_analysis", "priority_qa",
];

/** Display names. Internal keys never change; only these labels do. */
export const TIER_LABELS: Record<TierKey, string> = { public: "Public", free: "General", pro: "A-Team", elite: "Rambo" };
export function tierLabel(key: string) {
  return TIER_LABELS[key as TierKey] ?? key.toUpperCase();
}
export function tierByKey(key: string) {
  return TIERS.find((t) => t.key === key);
}
export function tierHas(key: TierKey, feature: FeatureKey) {
  return tierByKey(key)?.features.includes(feature) ?? false;
}
/** Highest tier a verified HFM deposit unlocks. */
export function tierForDeposit(depositUsd: number): TierKey {
  const eligible = TIERS.filter((t) => t.ibMinDepositUsd !== null && depositUsd >= t.ibMinDepositUsd);
  return eligible.sort((a, b) => b.rank - a.rank)[0]?.key ?? "public";
}
export function higherTier(a: TierKey, b: TierKey): TierKey {
  return (tierByKey(a)?.rank ?? 0) >= (tierByKey(b)?.rank ?? 0) ? a : b;
}
export const fmtUsd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

/** Ebook tiers. Standard is included from General up, Premium from A-Team up. Prices are defaults for new ebooks. */
export type EbookTier = "free" | "standard" | "premium";
export const EBOOK_TIERS: Record<EbookTier, { label: string; includedIn: TierKey | null; defaultPriceCents: number }> = {
  free: { label: "Free", includedIn: null, defaultPriceCents: 0 },
  standard: { label: "Standard", includedIn: "free", defaultPriceCents: 1900 },
  premium: { label: "Premium", includedIn: "pro", defaultPriceCents: 4900 },
};
export const ebookTierOf = (v: string | null | undefined): EbookTier | null => (v === "free" || v === "standard" || v === "premium" ? v : null);
