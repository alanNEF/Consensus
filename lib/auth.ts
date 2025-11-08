import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Adapter } from "next-auth/adapters";
import { supabase } from "./supabase";
import { verifyPassword } from "./password";

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
    // Credentials provider for email/password authentication
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !supabase) {
          return null;
        }

        // Find user in database
        // Type assertion needed because hashed_password is not in the User type
        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, name, hashed_password")
          .eq("email", credentials.email)
          .single() as { data: { id: string; email: string; name: string | null; hashed_password: string } | null; error: any };

        if (error || !user || !user.hashed_password) {
          return null;
        }

        // Verify password
        const isValid = await verifyPassword(credentials.password, user.hashed_password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
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

