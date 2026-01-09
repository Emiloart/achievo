import { PrismaClient } from "@prisma/client";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { URL } from "url";
import { join } from "path";

function stripSchema(urlRaw: string) {
  const url = new URL(urlRaw);
  url.searchParams.delete("schema");
  return url.toString();
}

function withSchema(urlRaw: string, schema: string) {
  const url = new URL(urlRaw);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function randomSchema() {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e_${stamp}_${rand}`;
}

async function runMigrations(databaseUrl: string) {
  const schema = new URL(databaseUrl).searchParams.get("schema");
  const pgOptions = schema ? `-c search_path=${schema},public` : undefined;
  const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const usePrismaCli = existsSync(prismaCli);
  const command = usePrismaCli ? process.execPath : process.platform === "win32" ? "npx" : "npx";
  const args = usePrismaCli ? [prismaCli, "migrate", "deploy"] : ["prisma", "migrate", "deploy"];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        ...(pgOptions ? { PGOPTIONS: pgOptions } : {}),
      },
      stdio: "inherit",
      shell: !usePrismaCli && process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma migrate deploy failed with code ${code}`));
    });
  });
}

export async function prepareTestDb() {
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) throw new Error("DATABASE_URL must be set for E2E");
  const schema = randomSchema();
  const adminUrl = stripSchema(baseUrl);
  const client = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  await client.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.$disconnect();
  const databaseUrl = withSchema(adminUrl, schema);
  await runMigrations(databaseUrl);
  return { databaseUrl, schema, adminUrl };
}

export async function dropTestSchema(adminUrl: string, schema: string) {
  if (!adminUrl || !schema) return;
  const client = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.$disconnect();
}
