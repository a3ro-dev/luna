import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { eq } from "drizzle-orm";
// Note: In a real app, use bcryptjs or similar. Using a simple comparison for demonstration if no bcrypt is available.
// If bcryptjs is installed, import { compare } from "bcryptjs". Here we will assume bcryptjs.
import { compare } from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[Auth] authorize() called with email:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Missing email or password");
          return null;
        }

        const userRecord = await db.query.users.findFirst({
          where: eq(users.email, (credentials.email as string).toLowerCase().trim()),
        });

        if (!userRecord) {
          console.log("[Auth] User record not found for:", credentials.email);
          return null;
        }

        if (!userRecord.passwordHash) {
          console.log("[Auth] User has no password hash set");
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          userRecord.passwordHash,
        );

        console.log("[Auth] Password is valid:", isValid);

        if (!isValid) return null;

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
      }
      // Verify user still exists on every token refresh
      // This runs on initial sign-in and on session access
      if (token.id) {
        const userExists = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
          columns: { id: true },
        });
        if (!userExists) {
          // Force re-authentication by clearing the id
          return { ...token, id: undefined };
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
