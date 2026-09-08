import { AnimatedNumber } from "@/components/AnimatedNumber";
export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-2xl font-semibold font-mono tracking-tight"><AnimatedNumber value={value} /></div>
      <div className="text-xs text-muted mt-1">{label}</div>
      {sub && <div className="text-[11px] text-muted/70 mt-0.5">{sub}</div>}
    </div>
  );
}
