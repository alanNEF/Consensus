import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Adapter } from "next-auth/adapters";

// TODO: If using Supabase adapter, install @next-auth/supabase-adapter
// import { SupabaseAdapter } from "@next-auth/supabase-adapter";
// import { supabase } from "./supabase";

// TODO: If using Prisma, install @prisma/client and @next-auth/prisma-adapter
// import { PrismaAdapter } from "@next-auth/prisma-adapter";

// For now, we'll use JWT sessions without an adapter
// In production, use SupabaseAdapter or PrismaAdapter with a database

export const authOptions: NextAuthOptions = {
  // TODO: Uncomment and configure Supabase adapter when ready:
  // adapter: SupabaseAdapter({
  //   url: process.env.SUPABASE_URL!,
  //   secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // }) as Adapter,

  providers: [
    // Email provider (magic link)
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.SMTP_FROM || "noreply@example.com",
    }),
    // TODO: Alternative Credentials provider (uncomment to use instead of Email):
    // CredentialsProvider({
    //   name: "Credentials",
    //   credentials: {
    //     email: { label: "Email", type: "email" },
    //     password: { label: "Password", type: "password" },
    //   },
    //   async authorize(credentials) {
    //     // TODO: Implement your authentication logic here
    //     // Verify credentials against your database
    //     if (!credentials?.email || !credentials?.password) {
    //       return null;
    //     }
    //     // Mock authentication for now
    //     return {
    //       id: "1",
    //       email: credentials.email,
    //       name: "Test User",
    //     };
    //   },
    // }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
    verifyRequest: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Helper to get current session
export async function getSession() {
  const { getServerSession } = await import("next-auth/next");
  return getServerSession(authOptions);
}

// Helper to require authentication (throws if not authenticated)
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

