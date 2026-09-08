import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { attachReferrer } from "@/lib/referral";
import { accessibleProducts } from "@/lib/access";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { ibAccounts, tvAccessRequests, users, licenses, products } from "@/db/schema";
import { activeEntitlements, effectiveTier } from "@/lib/entitlements";
import { submitIbVerification, requestTvAccess } from "@/lib/actions";
import { CheckoutButton } from "@/components/CheckoutButton";
import { BRAND, botDeepLink } from "@/config/brand";
import { TIERS, fmtUsd } from "@/config/tiers";

export const dynamic = "force-dynamic";

export default async function Account({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ checkout?: string; interval?: string; product?: string; paid?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/signin?callbackUrl=/${locale}/account`);
  const uid = session.user.id;
  const ms = locale === "ms";
  await attachReferrer(uid, (await cookies()).get("ref")?.value).catch(() => {});
  const [[u], tier, ents, ibs, tvs, lics, [refs], dl] = await Promise.all([
    db.select().from(users).where(eq(users.id, uid)),
    effectiveTier(uid), activeEntitlements(uid),
    db.select().from(ibAccounts).where(eq(ibAccounts.userId, uid)).orderBy(desc(ibAccounts.createdAt)),
    db.select().from(tvAccessRequests).where(eq(tvAccessRequests.userId, uid)),
    db.select({ l: licenses, p: products }).from(licenses).innerJoin(products, eq(products.id, licenses.productId)).where(eq(licenses.userId, uid)),
    db.select({ n: count() }).from(users).where(eq(users.referredBy, uid)),
    accessibleProducts(uid),
  ]);
  const wantTier = TIERS.find((t) => t.key === sp.checkout);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{ms ? "Akaun" : "Account"}</h1>
          <p className="text-muted">{session.user.email ?? u?.name}</p>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: `/${locale}` }); }}><button className="text-sm text-muted underline">{ms ? "Log keluar" : "Sign out"}</button></form>
      </div>
      {sp.paid && <p className="glass rounded-xl p-4 text-win">{ms ? "Pembayaran diterima. Akses dikemas kini dalam beberapa saat." : "Payment received. Access updates within seconds."}</p>}

      <section className="glass rounded-2xl p-6">
        <div className="text-xs uppercase text-muted">{ms ? "Pelan semasa" : "Current plan"}</div>
        <div className="text-3xl font-semibold mt-1">{tier.toUpperCase()}</div>
        <ul className="mt-3 text-sm text-muted space-y-1">
          {ents.map((e) => <li key={e.id}>{e.tierKey.toUpperCase()} · {e.source} · {e.expiresAt ? `${ms ? "tamat" : "expires"} ${e.expiresAt.toISOString().slice(0, 10)}` : (ms ? "tiada tamat" : "no expiry")}</li>)}
          {!ents.length && <li>{ms ? "Tiada pelan aktif. Sahkan akaun HFM atau langgan di bawah." : "No active plan. Verify an HFM account or subscribe below."}</li>}
        </ul>
      </section>

      {wantTier && (
        <section className="glass rounded-2xl p-6 glow-gold">
          <h2 className="font-semibold">{ms ? "Langgan" : "Subscribe"} {wantTier.key.toUpperCase()} · {fmtUsd(sp.interval === "year" ? wantTier.priceYearCents : wantTier.priceMonthCents)}/{sp.interval === "year" ? "yr" : "mo"}</h2>
          <div className="mt-3 flex flex-wrap gap-3"><CheckoutButton body={{ tier: wantTier.key, interval: sp.interval ?? "month" }} label={ms ? "Bayar dengan kad (Stripe)" : "Pay by card (Stripe)"} /><CheckoutButton endpoint="/api/crypto/invoice" body={{ tier: wantTier.key, interval: sp.interval ?? "month" }} label={ms ? "Bayar dengan USDT" : "Pay with USDT"} className="rounded-md border border-gold text-gold font-semibold px-4 py-2 disabled:opacity-50" /></div>
        </section>
      )}
      {sp.product && (
        <section className="glass rounded-2xl p-6 glow-gold">
          <h2 className="font-semibold">{ms ? "Beli produk" : "Buy product"}: {sp.product}</h2>
          <div className="mt-3 flex flex-wrap gap-3"><CheckoutButton body={{ product: sp.product }} label={ms ? "Bayar dengan kad (Stripe)" : "Pay by card (Stripe)"} /><CheckoutButton endpoint="/api/crypto/invoice" body={{ product: sp.product }} label={ms ? "Bayar dengan USDT" : "Pay with USDT"} className="rounded-md border border-gold text-gold font-semibold px-4 py-2 disabled:opacity-50" /></div>
        </section>
      )}

      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold">Telegram</h2>
        {u?.telegramId ? <p className="text-sm text-muted mt-1">@{u.tgUsername ?? u.telegramId} ✓</p> : (
          <p className="text-sm text-muted mt-1">{ms ? "Pautkan Telegram untuk terima link group secara automatik:" : "Link Telegram to receive group links automatically:"} <a className="text-gold underline" href={botDeepLink(`link_${uid}`)} target="_blank" rel="noopener">{ms ? "Buka bot" : "Open bot"}</a></p>
        )}
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold">{ms ? "Sahkan akaun HFM (Cara A)" : "Verify HFM account (Door A)"}</h2>
        <p className="text-sm text-muted mt-1">{ms ? "Belum ada akaun?" : "No account yet?"} <a className="text-gold underline" href={BRAND.broker.links.my} target="_blank" rel="noopener">MY/SG/BN</a> · <a className="text-gold underline" href={BRAND.broker.links.id} target="_blank" rel="noopener">ID</a> · <a className="underline" href={BRAND.telegram.registerGuide} target="_blank" rel="noopener">{ms ? "panduan" : "guide"}</a></p>
        <form action={submitIbVerification} className="mt-4 grid gap-3 md:grid-cols-2">
          <select name="region" className="rounded-md bg-surface border border-border px-3 py-2"><option value="my">MY / SG / BN</option><option value="id">Indonesia</option></select>
          <input name="accountNo" required pattern="\d{5,12}" placeholder={ms ? "No. akaun MT4/MT5" : "MT4/MT5 account no."} className="rounded-md bg-surface border border-border px-3 py-2" />
          <input name="fullName" required placeholder={ms ? "Nama penuh" : "Full name"} className="rounded-md bg-surface border border-border px-3 py-2" />
          <input name="balance" type="number" step="0.01" placeholder={ms ? "Baki (USD)" : "Balance (USD)"} className="rounded-md bg-surface border border-border px-3 py-2" />
          <p className="md:col-span-2 text-xs text-muted">{ms ? "Screenshot: hantar melalui bot Telegram (/verify) supaya admin boleh semak." : "Screenshot: send via the Telegram bot (/verify) so admin can check."}</p>
          <button className="md:col-span-2 rounded-md bg-gold text-black font-semibold py-2">{ms ? "Hantar untuk pengesahan" : "Submit for verification"}</button>
        </form>
        {ibs.length > 0 && <ul className="mt-4 text-sm text-muted space-y-1">{ibs.map((i) => <li key={i.id}>{i.accountNo} · {i.status}{i.depositUsd ? ` · $${i.depositUsd}` : ""}{i.note ? ` · ${i.note}` : ""}</li>)}</ul>}
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold">TradingView</h2>
        <form action={requestTvAccess} className="mt-3 flex gap-2">
          <input name="tvUsername" required placeholder="TradingView username" className="flex-1 rounded-md bg-surface border border-border px-3 py-2" />
          <button className="rounded-md border border-border px-4">{ms ? "Minta akses" : "Request access"}</button>
        </form>
        {tvs.length > 0 && <ul className="mt-3 text-sm text-muted">{tvs.map((r) => <li key={r.id}>{r.tvUsername} · {r.status}</li>)}</ul>}
      </section>

      {dl.length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold">{ms ? "Muat turun" : "Downloads"}</h2>
          <ul className="mt-3 text-sm space-y-1">{dl.map((p) => (
            <li key={p.id} className="flex justify-between gap-3"><span>{p.name}</span>
              {p.filePath ? (p.filePath.startsWith("tg:") ? <span className="text-muted">{ms ? "hantar /ebook pada bot" : "send /ebook to the bot"}</span> : <a className="text-gold underline" href={`/api/downloads/${p.id}`}>{ms ? "muat turun" : "download"}</a>) : <span className="text-muted">{ms ? "akan datang" : "coming soon"}</span>}
            </li>))}</ul>
        </section>
      )}
      {lics.length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold">{ms ? "Lesen MT5" : "MT5 licences"}</h2>
          <p className="text-xs text-muted mt-1">{ms ? "Masukkan kunci lesen dalam input indicator. Terikat pada akaun MT5 pertama yang digunakan." : "Paste the licence key into the indicator inputs. It binds to the first MT5 accounts used."}</p>
          <ul className="mt-3 text-sm space-y-1">{lics.map(({ l, p }) => <li key={l.id}>{p.name} · <code className="font-mono text-gold">{l.id}</code> · {l.mt5Account ?? (ms ? "belum diaktifkan" : "not activated")} · {l.activations}/{l.maxActivations}</li>)}</ul>
        </section>
      )}

      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold">{ms ? "Rujukan" : "Referral"}</h2>
        <p className="text-sm text-muted mt-1 font-mono">{BRAND.siteUrl}/?ref={u?.referralCode}</p>
        <p className="text-xs text-muted mt-1">{ms ? `Rujukan: ${refs.n}. Setiap rakan yang aktifkan pelan beri anda +7 hari.` : `Referrals: ${refs.n}. Each friend who activates a plan gives you +7 days.`}</p>
      </section>
    </div>
  );
}
