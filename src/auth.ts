import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { createHash } from "node:crypto";
import { rateLimit } from "./lib/rate-limit";

// Precomputed cost-12 hash so unknown emails still pay for one bcrypt compare.
const DUMMY_HASH = "$2b$12$dk32SVT8sHueZRIXwbdV8uFBPD98ECb6hULYSfvc2jXJeNfbkrzW6";

/** Session version: changes whenever the password hash changes, without putting hash material in the token. */
const passwordVersion = (hash: string | null | undefined) =>
  hash ? createHash("sha256").update(hash).digest("base64url").slice(0, 16) : undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();

        // ponytail: per-email only; lets an attacker lock a victim out for 15 min. Add a per-IP key if that becomes a problem.
        const rl = await rateLimit(`login:${email}`, 10, 15 * 60_000);
        if (!rl.success) return null;

        const userRecord = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        // Always run one cost-12 compare so unknown emails take as long as real ones (no timing oracle).
        const isValid = await compare(
          credentials.password as string,
          userRecord?.passwordHash ?? DUMMY_HASH,
        );
        if (!userRecord?.passwordHash || !isValid) return null;

        return userRecord;
      },
    }),
  ],
  session: {
    strategy: "jwt", // Credentials provider requires JWT strategy
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60, // 1 hour — force re-auth more frequently
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.consentGiven = (user as Record<string, unknown>).consentGiven as boolean;
        // ponytail: password-hash fingerprint as session version; any password change/reset revokes all sessions
        token.pwv = passwordVersion((user as { passwordHash?: string | null }).passwordHash);
      }
      // Verify user still exists and password hasn't changed on every token refresh
      if (token.id) {
        let userExists;
        try {
          userExists = await db.query.users.findFirst({
            where: eq(users.id, token.id as string),
            columns: { id: true, consentGiven: true, passwordHash: true },
          });
        } catch (err) {
          // transient DB error: keep the signed token instead of logging the user out
          console.error("[Auth] user lookup failed, keeping session", err);
          return token;
        }
        if (!userExists) return null; // confirmed gone: Auth.js clears the cookie
        if (passwordVersion(userExists.passwordHash) !== token.pwv) return null; // password changed/reset
        token.consentGiven = userExists.consentGiven;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session.user as { consentGiven?: boolean }).consentGiven =
          token.consentGiven as boolean | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
