import { setRequestLocale } from "next-intl/server";
import { auth, emailSenderVerified, googleConfigured, signIn, signOut } from "@/auth";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { TelegramLogin } from "@/components/TelegramLogin";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/signin", title: locale === "ms" ? "Log masuk" : "Sign in", description: "", noindex: true });
}
export default async function SignIn({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ sent?: string; callbackUrl?: string; error?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const { sent, callbackUrl, error } = await searchParams;
  const ms = locale === "ms";
  const emailOk = emailSenderVerified();
  const errorText = !error ? null
    : error === "Configuration" ? (ms ? "Log masuk emel belum tersedia buat masa ini. Guna Google atau Telegram di bawah." : "Email sign-in is not available yet. Use Google or Telegram below.")
    : error === "Verification" ? (ms ? "Link sudah tamat atau sudah digunakan. Minta link baharu." : "That link expired or was already used. Request a new one.")
    : error === "AccessDenied" ? (ms ? "Akses ditolak. Cuba akaun lain." : "Access denied. Try another account.")
    : (ms ? "Log masuk gagal. Cuba lagi." : "Sign-in failed. Try again.");
  const session = await auth().catch(() => null);
  const target = callbackUrl ?? `/${locale}/account`;
  if (session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <h1 className="text-3xl font-semibold tracking-tight">{ms ? "Anda sudah log masuk" : "You are signed in"}</h1>
        <p className="text-muted mt-2">{session.user.email ?? session.user.name}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account" className="rounded-md bg-gold text-black font-semibold px-5 py-2.5">{ms ? "Buka akaun" : "Open account"}</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: `/${locale}/signin` }); }}><button className="rounded-md border border-border px-5 py-2.5 hover:border-gold/50">{ms ? "Log keluar & tukar akaun" : "Sign out & switch account"}</button></form>
        </div>
        <p className="mt-6 text-xs text-muted">{ms ? "Nak guna akaun Telegram lain? Log keluar di sini dahulu, kemudian dalam app Telegram: Tetapan → Privasi & Keselamatan → Laman web (Websites) → putuskan sambungan laman ini. Selepas itu butang Telegram akan tanya akaun semula." : "Want another Telegram account? Sign out here first, then in the Telegram app: Settings → Privacy & Security → Websites → disconnect this site. The Telegram button will then ask which account to use."}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{ms ? "Log masuk" : "Sign in"}</h1>
      <p className="text-muted mt-2">{ms ? "Kami hantar link log masuk ke emel anda." : "We email you a magic link. No password."}</p>
      {errorText && <p className="mt-6 glass rounded-xl p-4 text-sm border-loss/40 text-loss">{errorText}</p>}
      {!emailOk && !errorText && <p className="mt-6 text-xs text-muted">{ms ? "Log masuk emel terhad sehingga domain penghantar kami disahkan. Google atau Telegram berfungsi sekarang." : "Email sign-in is limited until our sender domain is verified. Google or Telegram works now."}</p>}
      {sent ? (
        <p className="mt-6 glass rounded-xl p-4 text-win">{ms ? "Semak emel anda untuk link log masuk." : "Check your email for the sign-in link."}</p>
      ) : (
        <form className="mt-6 space-y-3" action={async (fd) => { "use server"; await signIn("resend", { email: String(fd.get("email")), redirectTo: callbackUrl ?? `/${locale}/account` }); }}>
          <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-md bg-surface border border-border px-3 py-2.5" />
          <button className="w-full rounded-md bg-gold text-black font-semibold py-2.5">{ms ? "Hantar link" : "Send link"}</button>
        </form>
      )}
      {googleConfigured() && (
        <form className="mt-4" action={async () => { "use server"; await signIn("google", { redirectTo: target }); }}>
          <button className="w-full rounded-md border border-border bg-surface py-2.5 font-medium hover:border-gold/50 flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
            {ms ? "Teruskan dengan Google" : "Continue with Google"}
          </button>
        </form>
      )}
      <div className="mt-8 border-t border-border pt-6">
        <p className="text-sm text-muted mb-3">{ms ? "Atau log masuk dengan Telegram:" : "Or sign in with Telegram:"}</p>
        <TelegramLogin botUsername={BRAND.telegram.botUsername} authUrl={`${BRAND.siteUrl}/api/auth/telegram?locale=${locale}`} />
        <p className="mt-3 text-[11px] text-muted">{ms ? "Butang ini ingat akaun Telegram terakhir. Untuk tukar: app Telegram → Tetapan → Privasi & Keselamatan → Laman web → putuskan sambungan laman ini." : "This button remembers the last Telegram account. To switch: Telegram app → Settings → Privacy & Security → Websites → disconnect this site."}</p>
      </div>
    </div>
  );
}
