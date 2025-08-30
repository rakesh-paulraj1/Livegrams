import GoogleProvider from 'next-auth/providers/google';
import { setCookie } from '../utils/setcookie';

const prisma = new PrismaClient();

// Validate required environment variables
const requiredEnvVars = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env.local file and ensure all required variables are set.');
}

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
        const existingUser = await prisma.user.findUnique({
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
          const newUser = await prisma.user.create({
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