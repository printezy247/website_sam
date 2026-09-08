/** Brand glyph: rotating gold ring with tick marks and a candle at the core. Pure SVG + CSS. */
export function Glyph({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="glyph">
      <defs>
        <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5d76e" /><stop offset="1" stopColor="#a87d0f" /></linearGradient>
      </defs>
      <g className="glyph-ring">
        <circle cx="20" cy="20" r="17" fill="none" stroke="url(#g-gold)" strokeWidth="1.2" strokeDasharray="6 4 2 4 10 4" opacity=".9" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="20" y1="2.5" x2="20" y2={i % 3 === 0 ? "6" : "4.5"} stroke="#d4af37" strokeWidth={i % 3 === 0 ? 1.4 : 0.8} transform={`rotate(${i * 30} 20 20)`} opacity=".8" />
        ))}
      </g>
      <g className="glyph-core">
        <line x1="20" y1="9" x2="20" y2="31" stroke="#d4af37" strokeWidth="1.2" />
        <rect x="16.5" y="15" width="7" height="10" rx="1" fill="url(#g-gold)" />
        <circle cx="20" cy="20" r="2" fill="#050505" />
      </g>
    </svg>
  );
}
