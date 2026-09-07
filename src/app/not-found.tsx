import Link from "next/link";
export default function NotFound() {
  return <html lang="en"><body style={{ background: "#050505", color: "#f3f4f6", fontFamily: "system-ui", padding: 40 }}><h1>404</h1><Link href="/" style={{ color: "#d4af37" }}>Home</Link></body></html>;
}
