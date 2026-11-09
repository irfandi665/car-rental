import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const cars = [
  { name: "Avanza 1.3 G", brand: "Toyota", plateNumber: "B 1001 RNT", transmission: "MANUAL", seats: 7, pricePerDay: 350000 },
  { name: "Xenia 1.3 R", brand: "Daihatsu", plateNumber: "B 1002 RNT", transmission: "AUTOMATIC", seats: 7, pricePerDay: 380000 },
  { name: "Brio RS", brand: "Honda", plateNumber: "B 1003 RNT", transmission: "AUTOMATIC", seats: 5, pricePerDay: 300000 },
  { name: "Innova Reborn", brand: "Toyota", plateNumber: "B 1004 RNT", transmission: "AUTOMATIC", seats: 7, pricePerDay: 600000 },
  { name: "Fortuner VRZ", brand: "Toyota", plateNumber: "B 1005 RNT", transmission: "AUTOMATIC", seats: 7, pricePerDay: 900000 },
  { name: "Hiace Commuter", brand: "Toyota", plateNumber: "B 1006 RNT", transmission: "MANUAL", seats: 15, pricePerDay: 1000000 },
] as const;

const accessories = [
  { name: "Kursi Bayi", description: "Child seat untuk usia 0-4 tahun", pricePerDay: 50000 },
  { name: "GPS Navigator", description: "Perangkat GPS dengan peta Indonesia", pricePerDay: 40000 },
  { name: "Asuransi Tambahan", description: "Perlindungan tambahan selama masa sewa", pricePerDay: 75000 },
  { name: "Wi-Fi Portable", description: "Modem Wi-Fi portable", pricePerDay: 30000 },
] as const;

async function main() {
  // Akun admin untuk DEVELOPMENT saja - ganti di produksi!
  const passwordHash = await bcrypt.hash("Admin123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@rental.test" },
    update: {},
    create: {
      email: "admin@rental.test",
      name: "Admin Rental",
      passwordHash,
      role: "ADMIN",
    },
  });

  for (const car of cars) {
    await prisma.car.upsert({
      where: { plateNumber: car.plateNumber },
      update: {},
      create: { ...car },
    });
  }

  for (const acc of accessories) {
    await prisma.accessory.upsert({
      where: { name: acc.name },
      update: {},
      create: { ...acc },
    });
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());