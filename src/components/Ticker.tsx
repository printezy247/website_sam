// Mock quotes. Replace `getQuotes` with a real feed later (same shape).
type Quote = { s: string; p: number; c: number };
export async function getQuotes(): Promise<Quote[]> {
  return [
    { s: "XAUUSD", p: 2412.35, c: 0.42 }, { s: "XAGUSD", p: 31.18, c: -0.21 }, { s: "DXY", p: 103.42, c: -0.08 },
    { s: "US30", p: 40215, c: 0.31 }, { s: "NAS100", p: 19842, c: 0.55 }, { s: "BTCUSD", p: 68420, c: 1.12 },
  ];
}
export async function Ticker() {
  const q = await getQuotes();
  const items = [...q, ...q];
  return (
    <div className="overflow-hidden bg-black/60 border-b border-border text-xs font-mono">
      <div className="flex w-max animate-ticker gap-8 px-4 py-1">
        {items.map((x, i) => (
          <span key={i} className="whitespace-nowrap">
            <span className="text-muted">{x.s}</span> <span>{x.p.toLocaleString("en-US")}</span>{" "}
            <span className={x.c >= 0 ? "text-win" : "text-loss"}>{x.c >= 0 ? "+" : ""}{x.c.toFixed(2)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
