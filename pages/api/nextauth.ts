// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    // ...add more providers here if you want
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt', // Using JWT for sessions
  },
  callbacks: {
    async session({ session, token }) {
      // Add user ID to session
      if (token && session.user) {
        (session.user as any).id = token.sub; // token.sub is the user id
      }
      return session;
    },
    async jwt({ token, user }) {
      // Persist the user ID from the user object to the token on sign in
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    // signIn: '/auth/signin', // You can define custom sign-in pages
  },
};

export default NextAuth(authOptions);