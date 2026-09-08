import { setRequestLocale } from "next-intl/server";
import { signIn } from "@/auth";
import { BRAND } from "@/config/brand";
import { TelegramLogin } from "@/components/TelegramLogin";
export default async function SignIn({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ sent?: string; callbackUrl?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const { sent, callbackUrl } = await searchParams;
  const ms = locale === "ms";
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{ms ? "Log masuk" : "Sign in"}</h1>
      <p className="text-muted mt-2">{ms ? "Kami hantar link log masuk ke emel anda." : "We email you a magic link. No password."}</p>
      {sent ? (
        <p className="mt-6 glass rounded-xl p-4 text-win">{ms ? "Semak emel anda untuk link log masuk." : "Check your email for the sign-in link."}</p>
      ) : (
        <form className="mt-6 space-y-3" action={async (fd) => { "use server"; await signIn("resend", { email: String(fd.get("email")), redirectTo: callbackUrl ?? `/${locale}/account` }); }}>
          <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-md bg-surface border border-border px-3 py-2.5" />
          <button className="w-full rounded-md bg-gold text-black font-semibold py-2.5">{ms ? "Hantar link" : "Send link"}</button>
        </form>
      )}
      <div className="mt-8 border-t border-border pt-6">
        <p className="text-sm text-muted mb-3">{ms ? "Atau log masuk dengan Telegram:" : "Or sign in with Telegram:"}</p>
        <TelegramLogin botUsername={BRAND.telegram.botUsername} authUrl={`${BRAND.siteUrl}/api/auth/telegram?locale=${locale}`} />
      </div>
    </div>
  );
}
