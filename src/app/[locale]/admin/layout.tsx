import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { Link } from "@/i18n/navigation";
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await requireAdmin())) redirect(`/${locale}/signin?callbackUrl=/${locale}/admin`);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="flex gap-4 text-sm mb-8 border-b border-border pb-3">
        <Link href="/admin" className="hover:text-gold">Dashboard</Link>
        <Link href="/admin/signals" className="hover:text-gold">Signals</Link>
        <Link href="/admin/ib" className="hover:text-gold">IB approvals</Link>
        <Link href="/admin/ib/import" className="hover:text-gold">CSV import</Link>
        <Link href="/admin/broadcasts" className="hover:text-gold">Broadcasts</Link>
        <Link href="/admin/tv" className="hover:text-gold">TradingView</Link>
        <Link href="/admin/products" className="hover:text-gold">Products</Link>
        <Link href="/admin/users" className="hover:text-gold">Users</Link>
      </nav>
      {children}
    </div>
  );
}
