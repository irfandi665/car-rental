import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "Admin";

if (!email || !password || password.length < 12) {
  console.error("Set ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 12 karakter).");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const passwordHash = await bcrypt.hash(password!, 12);
  await prisma.user.upsert({
    where: { email: email! },
    update: { passwordHash, name },
    create: { email: email!, name, passwordHash, role: "ADMIN" },
  });
  console.log(`Admin ${email} siap dipakai.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());