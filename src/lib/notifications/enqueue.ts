import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { normalizeWhatsapp } from "@/lib/validation";
import { buildAdminMessage, buildCustomerMessage, type BookingSummary } from "./templates";

type Tx = Pick<PrismaClient, "notification">;

const list = (v?: string) =>
  (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Panggil DI DALAM transaksi pembuatan booking */
export async function enqueueBookingCreated(tx: Tx, b: BookingSummary) {
  const customer = buildCustomerMessage(b);
  const admin = buildAdminMessage(b);
  const rows: Prisma.NotificationCreateManyInput[] = [];

  rows.push({
    bookingId: b.bookingId,
    kind: "BOOKING_CREATED_CUSTOMER",
    channel: "WHATSAPP",
    recipient: b.customerWhatsapp,
    payload: customer.wa as Prisma.InputJsonObject,
  });

  if (b.customerEmail) {
    rows.push({
      bookingId: b.bookingId,
      kind: "BOOKING_CREATED_CUSTOMER",
      channel: "EMAIL",
      recipient: b.customerEmail,
      payload: customer.email as Prisma.InputJsonObject,
    });
  }

  for (const n of list(process.env.ADMIN_NOTIFY_WHATSAPP)) {
    rows.push({
      bookingId: b.bookingId,
      kind: "BOOKING_CREATED_ADMIN",
      channel: "WHATSAPP",
      recipient: normalizeWhatsapp(n),
      payload: admin.wa as Prisma.InputJsonObject,
    });
  }

  for (const email of list(process.env.ADMIN_NOTIFY_EMAIL)) {
    rows.push({
      bookingId: b.bookingId,
      kind: "BOOKING_CREATED_ADMIN",
      channel: "EMAIL",
      recipient: email,
      payload: admin.email as Prisma.InputJsonObject,
    });
  }

  await tx.notification.createMany({ data: rows });
}