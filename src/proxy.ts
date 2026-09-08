import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

import { type NextRequest } from "next/server";

const intl = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const res = intl(req);
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[A-Za-z0-9_-]{4,16}$/.test(ref)) res.cookies.set("ref", ref, { maxAge: 30 * 864e5 / 1000, path: "/", sameSite: "lax" });
  return res;
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
