import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BRAND } from "@/config/brand";

const PAGES: Record<string, { title: Record<string, string>; body: Record<string, string[]> }> = {
  risk: {
    title: { en: "Risk disclosure", ms: "Pendedahan risiko" },
    body: {
      en: [
        "Trading gold, forex and CFDs on margin carries a high level of risk and may not be suitable for all investors. You could lose more than your initial deposit. Between 70–80% of retail investor accounts lose money when trading CFDs.",
        "Past performance is not indicative of future results. Published results are compiled from signals posted to our channels and shown in pips and R; individual results vary with execution, spread, timing and position size.",
        `All signals, analysis and content provided by ${BRAND.name} are for educational purposes only and do not constitute financial, investment or trading advice. We are not a licensed financial adviser. You are solely responsible for your trading decisions.`,
      ],
      ms: [
        "Dagangan emas, forex dan CFD secara margin berisiko tinggi dan mungkin tidak sesuai untuk semua pelabur. Anda boleh kehilangan lebih daripada deposit awal. 70–80% akaun pelabur runcit rugi apabila berdagang CFD.",
        "Prestasi lepas bukan petunjuk prestasi akan datang. Rekod yang dipaparkan dikira daripada signal yang dihantar ke channel kami dalam pip dan R; keputusan individu berbeza mengikut pelaksanaan, spread, masa dan saiz lot.",
        `Semua signal, analisis dan kandungan ${BRAND.name} adalah untuk tujuan pendidikan sahaja dan bukan nasihat kewangan, pelaburan atau dagangan. Kami bukan penasihat kewangan berlesen. Anda bertanggungjawab sepenuhnya atas keputusan dagangan anda.`,
      ],
    },
  },
  "ib-disclosure": {
    title: { en: "IB disclosure", ms: "Pendedahan IB" },
    body: {
      en: [`${BRAND.name} is an Introducing Broker partner of HFM. When you open and fund an account through our link we receive a commission from the broker based on your trading volume. This does not change your trading costs. You are free to use any broker; paid plans are available for that.`],
      ms: [`${BRAND.name} ialah rakan Introducing Broker HFM. Apabila anda membuka dan mendanai akaun melalui link kami, kami menerima komisen daripada broker berdasarkan volum dagangan anda. Ini tidak mengubah kos dagangan anda. Anda bebas guna mana-mana broker; pelan berbayar disediakan untuk itu.`],
    },
  },
  terms: {
    title: { en: "Terms", ms: "Terma" },
    body: {
      en: ["Subscriptions auto-renew until cancelled; cancel anytime from your account page.", "No refunds on digital goods after delivery except where required by law.", "One licence per user. Sharing signals, files or invite links terminates access without refund.", "IB access depends on your broker account remaining active and above the tier's deposit band; we re-verify monthly."],
      ms: ["Langganan diperbaharui automatik sehingga dibatalkan; batal bila-bila masa dari halaman akaun.", "Tiada bayaran balik untuk produk digital selepas penghantaran kecuali dikehendaki undang-undang.", "Satu lesen setiap pengguna. Berkongsi signal, fail atau link jemputan menamatkan akses tanpa bayaran balik.", "Akses IB bergantung pada akaun broker anda kekal aktif dan melebihi band deposit pelan; kami sahkan semula setiap bulan."],
    },
  },
  privacy: {
    title: { en: "Privacy", ms: "Privasi" },
    body: {
      en: ["We store your email, Telegram id, broker account number and verification screenshots only to provide access. We never sell data. Screenshots are deleted 90 days after verification. Contact support to delete your account."],
      ms: ["Kami menyimpan emel, id Telegram, nombor akaun broker dan screenshot pengesahan anda hanya untuk memberi akses. Kami tidak menjual data. Screenshot dipadam 90 hari selepas pengesahan. Hubungi sokongan untuk memadam akaun."],
    },
  },
};

export function generateStaticParams() {
  return ["ms", "en"].flatMap((locale) => Object.keys(PAGES).map((slug) => ({ locale, slug })));
}

export default async function Legal({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params; setRequestLocale(locale);
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{page.title[locale] ?? page.title.en}</h1>
      <div className="mt-6 space-y-4 text-muted leading-relaxed">{(page.body[locale] ?? page.body.en).map((p, i) => <p key={i}>{p}</p>)}</div>
    </div>
  );
}
