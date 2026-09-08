import { cn } from "@/lib/utils";
/** SAMBANGGOLD wordmark in Anton: chrome "SAMBANG" + gold "GOLD". */
export function Wordmark({ className, size = "text-xl" }: { className?: string; size?: string }) {
  return (
    <span className={cn("wordmark inline-flex items-baseline", size, className)} aria-label="SAMBANGGOLD">
      <span className="text-chrome">SAMBANG</span><span className="text-goldgrad">GOLD</span>
    </span>
  );
}
