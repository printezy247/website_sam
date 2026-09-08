import Link from "next/link";
export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#050609", color: "#f3f4f6", fontFamily: "system-ui", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mascot.svg" alt="" width={280} style={{ maxWidth: "70vw" }} />
          <h1 style={{ fontSize: 56, margin: "8px 0 4px", letterSpacing: -1 }}>404</h1>
          <p style={{ color: "#9aa3b2", margin: 0 }}>Page not found · Halaman tidak dijumpai</p>
          <Link href="/" style={{ display: "inline-block", marginTop: 20, background: "#d4af37", color: "#000", fontWeight: 700, padding: "10px 22px", borderRadius: 8, textDecoration: "none" }}>SAMBANGGOLD home</Link>
        </div>
      </body>
    </html>
  );
}
