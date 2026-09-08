import { captureLead } from "@/lib/leads";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { email?: string; name?: string; locale?: string; source?: string; website?: string };
  if (b.website) return Response.json({ ok: true }); // honeypot
  if (!b.email) return Response.json({ error: "email required" }, { status: 400 });
  try {
    const lead = await captureLead({ email: b.email, name: b.name, locale: b.locale, source: b.source });
    return Response.json({ ok: true, id: lead.id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
