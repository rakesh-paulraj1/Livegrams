import GoogleProvider from 'next-auth/providers/google';
import { setCookie } from '../utils/setcookie';
import {prismaClient} from "@repo/db/client"




export const authentication = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    jwt: async ({ user, token }: any) => {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    session: async ({ session, token }: any) => {
      if (session.user) {
        session.user.id = token.uid;
      }

      try {
        const existingUser = await prismaClient.user.findUnique({
          where: {
            email: session.user.email
          }
        });

        if (existingUser) {
          await setCookie('userId', existingUser.id.toString());
          if (typeof window !== 'undefined') {
            localStorage.setItem('userId', existingUser.id.toString());
          }
        } else {
          const newUser = await prismaClient.user.create({
            data: {
              name: session.user.name,
              email: session.user.email,
            }
          });

          await setCookie('userId', newUser.id.toString());
          if (typeof window !== 'undefined') {
            localStorage.setItem('userId', newUser.id.toString());
          }
        }
      } catch (error) {
        console.error('Error in session callback:', error);
      }

      return session;
    },
  }
};