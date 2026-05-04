import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "./lib/db"
import { users } from "./lib/db/schema"
import { eq } from "drizzle-orm"
// Note: In a real app, use bcryptjs or similar. Using a simple comparison for demonstration if no bcrypt is available.
// If bcryptjs is installed, import { compare } from "bcryptjs". Here we will assume bcryptjs.
import { compare } from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const userRecord = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })

        if (!userRecord || !userRecord.passwordHash) return null

        const isValid = await compare(credentials.password as string, userRecord.passwordHash)

        if (!isValid) return null

        return userRecord
      },
    }),
  ],
  session: {
    strategy: "jwt", // Credentials provider requires JWT strategy
  },
  pages: {
    signIn: "/login",
  }
})
