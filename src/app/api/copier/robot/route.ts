// Hands the member the robot file. Serves the compiled build when Sam has uploaded one
// (assets/copier/SamBangGoldCopier.ex5), otherwise the source they compile once in MetaEditor.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { auth } from "@/auth";
import { fileResponse } from "@/lib/files";
import { copierProduct } from "@/lib/copier";
import { canAccessProduct } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthenticated", { status: 401 });
  const p = await copierProduct();
  if (!p) return new Response("copier not in the store", { status: 404 });
  const { ok } = await canAccessProduct(session.user.id, p.id);
  if (!ok) return new Response("forbidden", { status: 403 });

  const roots = [process.env.UPLOAD_DIR ?? "/data/uploads", join(process.cwd(), "assets"), process.cwd()];
  const names = ["copier/SamBangGoldCopier.ex5", "copier/SamBangGoldCopier.mq5", "tools/mt5/SamBangGoldCopier.mq5"];
  for (const root of roots) {
    for (const name of names) {
      const abs = join(root, name);
      if (existsSync(abs)) return fileResponse(abs);
    }
  }
  return new Response("robot file missing", { status: 404 });
}
