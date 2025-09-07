// import { config } from "dotenv";
import { PrismaClient } from "./generated/prisma/index.js";
// config({ path: "../env" });
export const prismaClient = new PrismaClient();
