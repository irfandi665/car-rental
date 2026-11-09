import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { calculateTotal } from "@/lib/pricing";
import { lockCar } from "@/lib/car-lock";

export class BookingError extends Error {
  constructor(
    public code: "CAR_NOT_FOUND" | "CAR_UNAVAILABLE" | "ACCESSORY_INVALID",
    message: string,
  ) {
    super(message);
  }
}

// Tanpa karakter yang mudah tertukar (0/O, 1/I)
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateBookingCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `RNT-${s}`;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v) ?? "";
  } catch {
    return String(v);
  }
}

function errorText(e: unknown): string {
  if (e instanceof Error) {
    const x = e as Error & { meta?: unknown; cause?: unknown; code?: unknown };
    return [e.message, safeJson(x.meta), safeJson(x.cause), String(x.code ?? "")].join(" ");
  }
  return String(e);
}

/** True jika database menolak karena exclusion constraint (SQLSTATE 23P01) */
export function isOverlapError(e: unknown): boolean {
  const t = errorText(e);
  return t.includes("booking_no_overlap") || t.includes("23P01");
}

function isCodeCollision(e: unknown): boolean {
  const t = errorText(e);
  return t.includes("P2002") && t.includes("code");
}

export type CreateBookingInput = {
  carId: string;
  start: Date;
  end: Date;
  days: number;
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string;
  notes?: string;
  accessoryIds: string[];
  idDocumentKey: string;
};

export async function createBooking(input: CreateBookingInput) {
  const uniqueAccessoryIds = [...new Set(input.accessoryIds)];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        await lockCar(tx, input.carId);
        const car = await tx.car.findFirst({
          where: { id: input.carId, isActive: true },
        });
        if (!car) {
          throw new BookingError("CAR_NOT_FOUND", "Mobil tidak ditemukan atau sudah tidak tersedia.");
        }

        const accessories = uniqueAccessoryIds.length
          ? await tx.accessory.findMany({
              where: { id: { in: uniqueAccessoryIds }, isActive: true },
            })
          : [];
        if (accessories.length !== uniqueAccessoryIds.length) {
          throw new BookingError("ACCESSORY_INVALID", "Ada aksesoris yang tidak valid. Muat ulang halaman.");
        }

        // Tanggal yang diblokir admin (tidak dijaga constraint database)
        const blocked = await tx.blockedDate.findFirst({
          where: {
            carId: car.id,
            startDate: { lte: input.end },
            endDate: { gte: input.start },
          },
          select: { id: true },
        });
        if (blocked) {
          throw new BookingError("CAR_UNAVAILABLE", "Mobil tidak tersedia pada tanggal tersebut.");
        }

        const totalPrice = calculateTotal(
          car.pricePerDay,
          accessories.map((a) => a.pricePerDay),
          input.days,
        );

        // Jika bentrok dengan booking aktif lain, constraint database
        // "booking_no_overlap" akan menolak INSERT ini.
        return tx.booking.create({
          data: {
            code: generateBookingCode(),
            carId: car.id,
            startDate: input.start,
            endDate: input.end,
            totalDays: input.days,
            carPricePerDay: car.pricePerDay,
            totalPrice,
            customerName: input.customerName,
            customerWhatsapp: input.customerWhatsapp,
            customerEmail: input.customerEmail,
            notes: input.notes,
            idDocumentKey: input.idDocumentKey,
            accessories: {
              create: accessories.map((a) => ({
                accessoryId: a.id,
                quantity: 1,
                pricePerDay: a.pricePerDay,
              })),
            },
            statusLogs: {
              create: {
                fromStatus: null,
                toStatus: "PENDING",
                note: "Booking dibuat oleh customer",
              },
            },
          },
          select: { id: true, code: true },
        });
      });
    } catch (e) {
      if (isCodeCollision(e) && attempt < 2) continue; // kode acak kebetulan kembar
      throw e;
    }
  }
  throw new Error("Gagal membuat kode booking unik.");
}