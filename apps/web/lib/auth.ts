import GoogleProvider from 'next-auth/providers/google';
import { setCookie } from '../utils/setcookie';
import { prismaClient } from "@repo/db/client";
import { signToken } from './jwt';




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
        token.email = user.email;
        token.name = user.name;
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

        let userId: string;
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const newUser = await prismaClient.user.create({
            data: {
              name: session.user.name,
              email: session.user.email,
            }
          });
          userId = newUser.id;
        }

      
        await setCookie('userId', userId);
        
        const jwtToken = signToken({
          userId: userId,
          email: session.user.email,
          name: session.user.name
        });
        
        await setCookie('jwt-token', jwtToken);
        
        
        session.accessToken = jwtToken;
        session.userId = userId;
      } catch (error) {
        console.error('Error in session callback:', error);
      }

      return session;
    },
  }
};