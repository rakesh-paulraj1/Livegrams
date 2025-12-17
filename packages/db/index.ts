// import { config } from "dotenv";
import { PrismaClient } from './prisma/generated/prisma/client';
// config({ path: "../env" });
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});

export const prismaClient= new PrismaClient({adapter})