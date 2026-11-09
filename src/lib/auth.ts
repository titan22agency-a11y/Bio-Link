import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "./db";

/**
 * Auth: NextAuth with JWT sessions (stateless, no session table).
 * Phase 2: add Google/Email providers here; the role + plan claims below stay
 * the same, so every guard in the app keeps working.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        const email = creds?.email?.toLowerCase().trim();
        const password = creds?.password ?? "";
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || !user.canLogin) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as unknown as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.uid as string, role: token.role as Role };
      return session;
    },
  },
};

export type SessionUser = { id: string; email?: string | null; name?: string | null; role: Role };

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await getServerSession(authOptions);
  return (s?.user as SessionUser | undefined) ?? null;
}

export const isStaff = (role?: Role) => role === "ADMIN" || role === "SUPPORT";
