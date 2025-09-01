
import NextAuth from 'next-auth/next';
import { authentication } from '../../../../lib/auth';


const handler=NextAuth(authentication);
export {handler as GET,handler as POST}