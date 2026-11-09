import { prisma } from "@/lib/prisma";

export type Status = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";

export const TRANSITIONS: Record<Status, Status[]> = {
  PENDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const STATUS_META: Record<Status, { text: string; cls: string }> = {
  PENDING: { text: "Menunggu", cls: "bg-amber-100 text-amber-800" },
  APPROVED: { text: "Disetujui", cls: "bg-green-100 text-green-800" },
  COMPLETED: { text: "Selesai", cls: "bg-slate-200 text-slate-700" },
  CANCELLED: { text: "Dibatalkan", cls: "bg-red-100 text-red-800" },
};

export class StatusError extends Error {}

export async function changeBookingStatus(p: {
  bookingId: string;
  to: Status;
  note?: string;
  adminId: string;
}) {
  await prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({
      where: { id: p.bookingId },
      select: { id: true, status: true },
    });
    if (!b) throw new StatusError("Pesanan tidak ditemukan.");

    const from = b.status as Status;
    if (!TRANSITIONS[from].includes(p.to)) {
      throw new StatusError(
        `Status "${STATUS_META[from].text}" tidak bisa diubah menjadi "${STATUS_META[p.to].text}".`,
      );
    }

    // Optimistic locking: hanya berhasil jika status belum berubah sejak dibaca
    const res = await tx.booking.updateMany({
      where: { id: b.id, status: from },
      data: { status: p.to },
    });
    if (res.count !== 1) {
      throw new StatusError("Status pesanan baru saja diubah orang lain. Muat ulang halaman.");
    }

    await tx.bookingStatusLog.create({
      data: {
        bookingId: b.id,
        fromStatus: from,
        toStatus: p.to,
        note: p.note || null,
        changedById: p.adminId,
      },
    });
  });
}