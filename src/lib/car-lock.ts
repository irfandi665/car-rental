import type { PrismaClient } from "@/generated/prisma/client";

/** Serialisasi operasi pada satu mobil (booking baru vs blokir tanggal). Panggil di dalam $transaction. */
export async function lockCar(tx: Pick<PrismaClient, "$queryRaw">, carId: string) {
  await tx.$queryRaw`SELECT id FROM "Car" WHERE id = ${carId} FOR UPDATE`;
}