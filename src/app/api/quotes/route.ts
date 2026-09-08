import { getQuotes } from "@/lib/quotes";
export const dynamic = "force-dynamic";
export async function GET() {
  const quotes = await getQuotes();
  return Response.json({ configured: quotes.length > 0, asOf: new Date().toISOString(), quotes }, {
    headers: { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60" },
  });
}
