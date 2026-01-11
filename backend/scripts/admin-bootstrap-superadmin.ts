import { PrismaClient, AdminRole } from "@prisma/client";
import argon2 from "argon2";

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

async function main() {
  const emailRaw = process.env.ADMIN_BOOTSTRAP_EMAIL || "";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
  const force = process.argv.includes("--force");

  if (!emailRaw || !password) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required");
  }

  const email = normalizeEmail(emailRaw);
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.adminUser.findFirst();
    if (existing && !force) {
      throw new Error("Admin user already exists. Use --force to override.");
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const existingByEmail = await prisma.adminUser.findUnique({ where: { email } });
    if (existingByEmail) {
      await prisma.adminUser.update({
        where: { email },
        data: {
          passwordHash,
          role: AdminRole.SUPERADMIN,
          isActive: true,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`Updated SUPERADMIN ${email}`);
      return;
    }

    await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        role: AdminRole.SUPERADMIN,
        isActive: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Created SUPERADMIN ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err);
  process.exit(1);
});
