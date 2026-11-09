"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { redirectWith } from "@/lib/admin-redirect";
import { ACTIVE_STATUSES } from "@/lib/availability";
import { createSession, destroySession, requireAdmin } from "@/lib/auth";
import {
  STATUS_META,
  StatusError,
  changeBookingStatus,
  type Status,
} from "@/lib/booking-status";
import { lockCar } from "@/lib/car-lock";
import { parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

// Dipakai agar waktu respons sama baik email ada maupun tidak
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/* ---------- Auth ---------- */

export async function loginAction(formData: FormData) {
  const email = str(formData, "email").trim().toLowerCase();
  const password = str(formData, "password");
  const key = `login:${email}`;

  if (!rateLimit(key, 5, 15 * 60_000)) {
    redirectWith("/admin/login", "err", "Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || user.role !== "ADMIN") {
    redirectWith("/admin/login", "err", "Email atau password salah.");
  }

  resetRateLimit(key);
  await createSession(user.id);
  redirect("/admin/pesanan");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- Status pesanan ---------- */

const TARGETS: Status[] = ["APPROVED", "COMPLETED", "CANCELLED"];

export async function changeStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const code = str(formData, "code");
  const to = str(formData, "to") as Status;
  const note = str(formData, "note").trim().slice(0, 300);
  const back = `/admin/pesanan/${encodeURIComponent(code)}`;

  if (!TARGETS.includes(to)) redirectWith(back, "err", "Status tujuan tidak valid.");
  if (to === "CANCELLED" && note.length < 3) {
    redirectWith(back, "err", "Alasan pembatalan wajib diisi.");
  }

  const booking = await prisma.booking.findUnique({ where: { code }, select: { id: true } });
  if (!booking) redirectWith("/admin/pesanan", "err", "Pesanan tidak ditemukan.");

  try {
    await changeBookingStatus({ bookingId: booking.id, to, note, adminId: admin.id });
  } catch (e) {
    if (e instanceof StatusError) redirectWith(back, "err", e.message);
    throw e;
  }

  revalidatePath("/admin/pesanan");
  revalidatePath("/admin/kalender");
  revalidatePath("/");
  redirectWith(back, "ok", `Status diubah menjadi "${STATUS_META[to].text}".`);
}

/* ---------- Blokir tanggal ---------- */

export async function createBlockAction(formData: FormData) {
  await requireAdmin();
  const m = str(formData, "m");
  const back = /^\d{4}-\d{2}$/.test(m) ? `/admin/kalender?m=${m}` : "/admin/kalender";

  const carId = str(formData, "carId");
  const start = parseDateOnly(str(formData, "start"));
  const end = parseDateOnly(str(formData, "end"));
  const reason = str(formData, "reason").trim().slice(0, 200);

  if (!carId || !start || !end) redirectWith(back, "err", "Pilih mobil dan isi tanggal dengan benar.");
  if (end < start) redirectWith(back, "err", "Tanggal selesai tidak boleh sebelum tanggal mulai.");
  if ((end.getTime() - start.getTime()) / 86_400_000 > 365) {
    redirectWith(back, "err", "Maksimal rentang blokir 1 tahun.");
  }

  const car = await prisma.car.findUnique({ where: { id: carId }, select: { id: true } });
  if (!car) redirectWith(back, "err", "Mobil tidak ditemukan.");

  const conflicts = await prisma.$transaction(async (tx) => {
    await lockCar(tx, carId);
    const found = await tx.booking.findMany({
      where: {
        carId,
        status: { in: [...ACTIVE_STATUSES] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { code: true },
      take: 5,
    });
    if (found.length === 0) {
      await tx.blockedDate.create({
        data: { carId, startDate: start, endDate: end, reason: reason || null },
      });
    }
    return found;
  });

  if (conflicts.length > 0) {
    redirectWith(
      back,
      "err",
      `Tidak bisa diblokir: bentrok dengan booking ${conflicts.map((c) => c.code).join(", ")}. Batalkan booking itu dulu.`,
    );
  }

  revalidatePath("/admin/kalender");
  revalidatePath("/");
  redirectWith(back, "ok", "Tanggal berhasil diblokir.");
}

export async function deleteBlockAction(formData: FormData) {
  await requireAdmin();
  const m = str(formData, "m");
  const back = /^\d{4}-\d{2}$/.test(m) ? `/admin/kalender?m=${m}` : "/admin/kalender";

  await prisma.blockedDate.deleteMany({ where: { id: str(formData, "id") } });

  revalidatePath("/admin/kalender");
  revalidatePath("/");
  redirectWith(back, "ok", "Blokir dihapus.");
}

/* ---------- Mobil ---------- */

const carSchema = z.object({
  name: z.string().trim().min(2).max(80),
  brand: z.string().trim().min(2).max(50),
  plateNumber: z.string().trim().toUpperCase().min(3).max(15),
  transmission: z.enum(["MANUAL", "AUTOMATIC"]),
  seats: z.coerce.number().int().min(2).max(20),
  pricePerDay: z.coerce.number().int().min(50_000).max(10_000_000),
  description: z.string().trim().max(500).optional(),
});

export async function createCarAction(formData: FormData) {
  await requireAdmin();
  const back = "/admin/mobil";

  const r = carSchema.safeParse(Object.fromEntries(formData));
  if (!r.success) {
    const fields = [...new Set(r.error.issues.map((i) => String(i.path[0])))].join(", ");
    redirectWith(back, "err", `Data tidak valid pada kolom: ${fields}.`);
  }

  try {
    await prisma.car.create({
      data: { ...r.data, description: r.data.description || null },
    });
  } catch (e) {
    if (String(e).includes("P2002") || String(e).includes("plateNumber")) {
      redirectWith(back, "err", "Plat nomor sudah terdaftar.");
    }
    throw e;
  }

  revalidatePath("/admin/mobil");
  revalidatePath("/");
  redirectWith(back, "ok", "Mobil ditambahkan.");
}

export async function updateCarAction(formData: FormData) {
  await requireAdmin();
  const back = "/admin/mobil";

  const price = z.coerce
    .number()
    .int()
    .min(50_000)
    .max(10_000_000)
    .safeParse(formData.get("pricePerDay"));
  if (!price.success) redirectWith(back, "err", "Harga harus antara Rp 50.000 dan Rp 10.000.000.");

  await prisma.car.update({
    where: { id: str(formData, "id") },
    data: { pricePerDay: price.data, isActive: formData.get("isActive") === "on" },
  });

  revalidatePath("/admin/mobil");
  revalidatePath("/");
  redirectWith(back, "ok", "Mobil diperbarui. Harga baru berlaku untuk booking berikutnya.");
}