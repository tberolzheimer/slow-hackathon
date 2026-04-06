import { prisma } from "@/lib/db/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"

const MASTER_ADMIN_EMAIL = "thomas@juliaberolzheimer.com"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/check-email",
  },
  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Magic link via Resend
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "VibeShop <hello@juliaberolzheimer.com>",
    }),
    // Password fallback
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials.email as string
        const password = credentials.password as string

        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user?.password) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    async signIn() {
      // Role assignment is handled in the JWT callback after the user record exists
      return true
    },

    async jwt({ token, user }) {
      // On initial sign-in, user object is available
      if (user) {
        token.id = user.id
        // For credentials, role comes from the authorize function
        if (user.role) {
          token.role = user.role
        }
      }

      // Always refresh role from DB to pick up role changes and handle OAuth/magic-link sign-ins
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, email: true },
        })

        if (dbUser) {
          const email = dbUser.email?.toLowerCase()

          // Master admin always gets admin role
          if (email === MASTER_ADMIN_EMAIL && dbUser.role !== "admin") {
            await prisma.user.update({
              where: { id: token.id as string },
              data: { role: "admin" },
            })
            token.role = "admin"
          }
          // Check for admin invite (only for users with "user" role)
          else if (dbUser.role === "user" && email) {
            const invite = await prisma.adminInvite.findUnique({
              where: { email },
            })
            if (invite && !invite.usedAt) {
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: token.id as string },
                  data: { role: invite.role },
                }),
                prisma.adminInvite.update({
                  where: { id: invite.id },
                  data: { usedAt: new Date() },
                }),
              ])
              token.role = invite.role
            } else {
              token.role = dbUser.role
            }
          } else {
            token.role = dbUser.role
          }
        }
      }

      return token
    },

    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
      }
      if (token.role) {
        session.user.role = token.role as string
      } else {
        session.user.role = "user"
      }
      return session
    },
  },
})
