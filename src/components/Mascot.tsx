import { existsSync } from "node:fs";
import { join } from "node:path";
import { cn } from "@/lib/utils";

/**
 * Brand mascot: chrome robot hammering a gold bar.
 * Uses the animated SVG replica; if real renders exist at public/brand/mascot-raise.png + mascot-strike.png
 * (transparent PNGs), they are shown instead with a two-frame hammer animation.
 */
export function Mascot({ className, size = 320, priority = false }: { className?: string; size?: number; priority?: boolean }) {
  const dir = join(process.cwd(), "public", "brand");
  const hasPng = existsSync(join(dir, "mascot-raise.png")) && existsSync(join(dir, "mascot-strike.png"));
  if (hasPng) {
    return (
      <div className={cn("mascot-frames relative", className)} style={{ width: size, height: size }} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mascot-raise.png" alt="" width={size} height={size} className="mascot-raise absolute inset-0" loading={priority ? "eager" : "lazy"} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mascot-strike.png" alt="" width={size} height={size} className="mascot-strike absolute inset-0" loading={priority ? "eager" : "lazy"} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mascot.svg" alt="" width={size} height={Math.round(size * 380 / 420)} className={cn("select-none", className)} loading={priority ? "eager" : "lazy"} aria-hidden />;
}
