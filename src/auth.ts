import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "noreply@example.com",
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/signin", verifyRequest: "/signin?sent=1" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      (session.user as { role?: string }).role = (user as { role?: string }).role;
      return session;
    },
  },
  trustHost: true,
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as { id: string; email?: string | null; name?: string | null; role?: string };
}
export async function requireAdmin() {
  const u = await requireUser();
  return u?.role === "admin" ? u : null;
}
