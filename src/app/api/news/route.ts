import { getHighImpact } from "@/lib/news";
export const dynamic = "force-dynamic";
export async function GET() {
  const events = await getHighImpact();
  return Response.json({ configured: events.length > 0, events, asOf: new Date().toISOString() }, { headers: { "cache-control": "public, max-age=0, s-maxage=600" } });
}
