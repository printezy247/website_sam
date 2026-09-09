import { useTranslations } from "next-intl";
import { ebookTierOf } from "@/config/tiers";
import { cn } from "@/lib/utils";

const STYLE = { free: "border-border text-muted", standard: "border-chrome/40 text-chrome", premium: "border-gold/50 text-gold" } as const;

/** Small badge for the ebook tier (Free snippet / Standard / Premium). Renders nothing for non-ebooks. */
export function EbookTierBadge({ tier, withNote = false, className }: { tier: string | null | undefined; withNote?: boolean; className?: string }) {
  const t = useTranslations("products");
  const k = ebookTierOf(tier);
  if (!k) return null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("text-[11px] uppercase tracking-wide border rounded px-1.5 py-0.5", STYLE[k])}>{t(`ebook_${k}`)}</span>
      {withNote && <span className="text-xs text-muted">{t(`ebook_${k}_note`)}</span>}
    </span>
  );
}
