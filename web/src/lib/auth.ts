import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prismaUsersRepository } from "./repositories/prisma";
import { verifyPassword } from "./utils/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      })
    ] : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Check if user exists in database
          const user = await prismaUsersRepository.getByEmail(credentials.email as string);

          if (!user) {
            return null;
          }

          // Check if user has a password hash
          if (!user.password_hash) {
            // User exists but has no password (OAuth-only user)
            return null;
          }

          // Verify password against hash
          const isValidPassword = await verifyPassword(
            credentials.password as string,
            user.password_hash
          );

          if (!isValidPassword) {
            return null;
          }

          // Return user data in format expected by NextAuth
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar_url ?? null,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt", // Use JWT for sessions if database adapter is not configured
  },
  pages: {
    signIn: "/auth/signin",
    // signOut: '/auth/signout', // Custom sign out page
    // error: '/auth/error', // Error page for authentication errors
    // verifyRequest: '/auth/verify-request', // Email verification page (e.g., for Magic Links)
    // newUser: '/auth/new-user' // Page for new users (after first OAuth authentication)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If this is a callback after successful authorization, redirect to /issues
      if (url.startsWith(baseUrl)) {
        // If URL already contains a path, use it
        if (url.includes('/default/') || url.includes('/auth/')) {
          return url;
        }
        // Otherwise redirect to issues
        return `${baseUrl}/default/issues`;
      }
      // For external URLs return baseUrl + issues
      return `${baseUrl}/default/issues`;
    },
  },
  // Add AUTH_SECRET to your environment variables
  // secret: process.env.AUTH_SECRET, // In v5 this is usually not required if AUTH_SECRET is set
});
