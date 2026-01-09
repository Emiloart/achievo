import { PrismaClient } from "@prisma/client";
import { readRuntime } from "./runtime";

let client: PrismaClient | null = null;

export function prismaClient() {
  if (client) return client;
  const runtime = readRuntime();
  process.env.DATABASE_URL = runtime.db.databaseUrl;
  client = new PrismaClient();
  return client;
}

export async function disconnectPrisma() {
  if (!client) return;
  await client.$disconnect();
  client = null;
}
