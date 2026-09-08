import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND } from "@/config/brand";

export const alt = `${BRAND.name} · XAUUSD`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COPY = {
  ms: { title: "Signal emas, telus sepenuhnya.", sub: "Rekod awam · Dua cara masuk · Pendidikan sahaja" },
  en: { title: "Gold signals with full transparency.", sub: "Public track record · Two ways in · Education only" },
};

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = COPY[locale as keyof typeof COPY] ?? COPY.ms;
  const anton = await readFile(join(process.cwd(), "src", "app", "fonts", "anton.ttf")).catch(() => null);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #050505 0%, #0b0e14 60%, #1a1607 100%)", color: "#f3f4f6", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, border: "4px solid #d4af37", background: "#050609", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, fontStyle: "italic", letterSpacing: -1 }}>
            <span style={{ color: "#e5e7eb" }}>SB</span><span style={{ color: "#d4af37" }}>G</span>
          </div>
          <div style={{ fontSize: 48, fontFamily: anton ? "Anton" : "sans-serif", fontStyle: "italic", display: "flex", letterSpacing: 2 }}><span style={{ color: "#e5e7eb" }}>SAMBANG</span><span style={{ color: "#d4af37" }}>GOLD</span></div>
          <div style={{ marginLeft: "auto", fontSize: 24, color: "#9aa3b2", letterSpacing: 4 }}>XAUUSD</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontFamily: anton ? "Anton" : "sans-serif", lineHeight: 1, maxWidth: 1000, textTransform: "uppercase" }}>{c.title}</div>
          <div style={{ fontSize: 30, color: "#d4af37" }}>{c.sub}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#9aa3b2" }}>
          <span>{BRAND.siteUrl.replace(/^https?:\/\//, "")}</span>
          <span>Since {BRAND.since} · HFM IB {BRAND.broker.refId}</span>
        </div>
      </div>
    ),
    { ...size, fonts: anton ? [{ name: "Anton", data: anton, style: "normal", weight: 400 }] : [] },
  );
}
