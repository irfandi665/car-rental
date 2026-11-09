import { prisma } from "@/lib/prisma";

/** Status booking yang mengunci tanggal (harus sama dengan constraint di database) */
export const ACTIVE_STATUSES = ["PENDING", "APPROVED"] as const;

export type CarFilters = {
  start?: Date;
  end?: Date;
  minSeats?: number;
  transmission?: "MANUAL" | "AUTOMATIC";
};

export async function searchCars(f: CarFilters) {
  const hasDates = Boolean(f.start && f.end);

  // Dua rentang beririsan jika: mulaiA <= selesaiB DAN selesaiA >= mulaiB (inklusif)
  const overlap = hasDates
    ? { startDate: { lte: f.end! }, endDate: { gte: f.start! } }
    : undefined;

  const [cars, booked, blocked] = await Promise.all([
    prisma.car.findMany({
      where: {
        isActive: true,
        ...(f.minSeats ? { seats: { gte: f.minSeats } } : {}),
        ...(f.transmission ? { transmission: f.transmission } : {}),
      },
      select: {
        id: true,
        name: true,
        brand: true,
        transmission: true,
        seats: true,
        pricePerDay: true,
        description: true,
        imageKey: true,
      },
    }),
    overlap
      ? prisma.booking.findMany({
          where: { status: { in: [...ACTIVE_STATUSES] }, ...overlap },
          select: { carId: true },
          distinct: ["carId"],
        })
      : Promise.resolve([]),
    overlap
      ? prisma.blockedDate.findMany({
          where: overlap,
          select: { carId: true },
          distinct: ["carId"],
        })
      : Promise.resolve([]),
  ]);

  const unavailable = new Set([...booked, ...blocked].map((x) => x.carId));

  return cars
    .map((car) => ({ ...car, available: !unavailable.has(car.id) }))
    .sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        a.pricePerDay - b.pricePerDay,
    );
}

export type CarResult = Awaited<ReturnType<typeof searchCars>>[number];

export async function isCarAvailable(carId: string, start: Date, end: Date) {
  const overlap = { startDate: { lte: end }, endDate: { gte: start } };
  const [booking, blocked] = await Promise.all([
    prisma.booking.findFirst({
      where: { carId, status: { in: [...ACTIVE_STATUSES] }, ...overlap },
      select: { id: true },
    }),
    prisma.blockedDate.findFirst({
      where: { carId, ...overlap },
      select: { id: true },
    }),
  ]);
  return !booking && !blocked;
}