import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import { PermanentError } from "./errors";
import type { EmailPayload, WaPayload } from "./templates";
import { sendWhatsapp, type WaKind } from "./whatsapp";

export const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60]; // jeda setelah percobaan ke-1, ke-2, ...

/**
 * Ambil notifikasi yang jatuh tempo, lalu kirim.
 * FOR UPDATE SKIP LOCKED membuat beberapa pemroses (atau beberapa instance app)
 * tidak pernah mengambil baris yang sama. Baris PROCESSING yang macet lebih dari
 * 5 menit (misalnya app mati saat mengirim) diambil ulang.
 */
export async function processDueNotifications(limit = 20) {
  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "Notification"
    SET status = 'PROCESSING', "lockedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "Notification"
      WHERE (status = 'PENDING' AND "nextAttemptAt" <= now())
         OR (status = 'PROCESSING' AND "lockedAt" < now() - interval '5 minutes')
      ORDER BY "nextAttemptAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;

  const result = { claimed: claimed.length, sent: 0, retry: 0, failed: 0 };
  if (claimed.length === 0) return result;

  const rows = await prisma.notification.findMany({
    where: { id: { in: claimed.map((c) => c.id) } },
  });

  for (const n of rows) {
    try {
      const sent =
        n.channel === "WHATSAPP"
          ? await sendWhatsapp({
              to: n.recipient,
              kind: n.kind as WaKind,
              payload: n.payload as unknown as WaPayload,
            })
          : await sendEmail({
              to: n.recipient,
              payload: n.payload as unknown as EmailPayload,
            });

      await prisma.notification.update({
        where: { id: n.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: sent.id ?? null,
          lastError: null,
          lockedAt: null,
        },
      });
      result.sent++;
    } catch (e) {
      const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      const giveUp = e instanceof PermanentError || n.attempts >= MAX_ATTEMPTS;

      if (giveUp) {
        await prisma.notification.update({
          where: { id: n.id },
          data: { status: "FAILED", lastError: message, lockedAt: null },
        });
        result.failed++;
        console.error(`[notif] GAGAL permanen ${n.channel} -> ${n.recipient}: ${message}`);
      } else {
        const wait = BACKOFF_MINUTES[Math.min(n.attempts - 1, BACKOFF_MINUTES.length - 1)];
        await prisma.notification.update({
          where: { id: n.id },
          data: {
            status: "PENDING",
            lastError: message,
            nextAttemptAt: new Date(Date.now() + wait * 60_000),
            lockedAt: null,
          },
        });
        result.retry++;
        console.warn(`[notif] gagal (percobaan ${n.attempts}), ulang ${wait} menit lagi: ${message}`);
      }
    }
  }
  return result;
}