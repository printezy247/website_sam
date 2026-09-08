/** Brand glyph: SBG monogram in a rotating gold ring. Pure SVG + CSS. */
export function Glyph({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="glyph">
      <defs>
        <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5d76e" /><stop offset="1" stopColor="#a87d0f" /></linearGradient>
        <linearGradient id="g-chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#8f99a8" /></linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18.5" fill="#050609" />
      <g className="glyph-ring">
        <circle cx="20" cy="20" r="17" fill="none" stroke="url(#g-gold)" strokeWidth="1.6" strokeDasharray="30 6 8 6 40 6" opacity=".95" />
      </g>
      <text x="20" y="25" textAnchor="middle" fontSize="14" fontStyle="italic" style={{ fontFamily: "var(--font-display)" }}>
        <tspan fill="url(#g-chrome)">SB</tspan><tspan fill="url(#g-gold)">G</tspan>
      </text>
    </svg>
  );
}
