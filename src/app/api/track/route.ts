import { cookies } from "next/headers";
import { recordVisit } from "@/lib/analytics";
export const dynamic = "force-dynamic";
/** First-party page-view beacon (one per page per session, sent by <Track/>). No user identity stored. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { path?: string };
  if (!b.path || typeof b.path !== "string" || b.path.length > 200) return new Response(null, { status: 204 });
  const camp = (await cookies()).get("camp")?.value ?? null;
  await recordVisit({ campaign: camp, path: b.path }).catch((e) => console.error("[track]", e));
  return new Response(null, { status: 204 });
}
