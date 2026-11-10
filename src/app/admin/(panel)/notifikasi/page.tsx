import { Suspense } from "react";
import Link from "next/link";
import { retryNotificationAction } from "@/app/admin/actions";
import { Flash } from "@/components/admin/flash";
import { prisma } from "@/lib/prisma";
import { first } from "@/lib/search-params";

const STATUS_CLS = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SENT: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
} as const;

const KIND_LABEL = {
  BOOKING_CREATED_CUSTOMER: "Booking → Customer",
  BOOKING_CREATED_ADMIN: "Booking → Admin",
} as const;

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(d);

export default function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat notifikasi...</p>}>
      <NotificationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NotificationsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [rows, grouped] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { booking: { select: { code: true } } },
    }),
    prisma.notification.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

  return (
    <>
      <h1 className="text-xl font-bold">Notifikasi</h1>
      <p className="mt-1 text-sm text-slate-500">
        Terkirim {counts.SENT ?? 0} · Menunggu/diulang {(counts.PENDING ?? 0) + (counts.PROCESSING ?? 0)} ·{" "}
        <span className={counts.FAILED ? "font-semibold text-red-600" : ""}>Gagal {counts.FAILED ?? 0}</span>
      </p>
      <div className="mt-4"><Flash ok={first(sp.ok)} err={first(sp.err)} /></div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Jenis</th>
              <th className="px-4 py-3">Kanal</th>
              <th className="px-4 py-3">Penerima</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Belum ada notifikasi.</td></tr>
            )}
            {rows.map((n) => (
              <tr key={n.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{fmt(n.createdAt)}</td>
                <td className="px-4 py-3 font-mono">
                  <Link href={`/admin/pesanan/${n.booking.code}`} className="underline">{n.booking.code}</Link>
                </td>
                <td className="px-4 py-3">{KIND_LABEL[n.kind]}</td>
                <td className="px-4 py-3">{n.channel === "WHATSAPP" ? "WhatsApp" : "Email"}</td>
                <td className="px-4 py-3">{n.channel === "WHATSAPP" ? `+${n.recipient}` : n.recipient}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLS[n.status]}`}>{n.status}</span>
                  <span className="ml-2 text-xs text-slate-400">×{n.attempts}</span>
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                  {n.lastError && <p className="break-words text-red-700">{n.lastError}</p>}
                  {n.status === "PENDING" && n.attempts > 0 && <p>Coba lagi: {fmt(n.nextAttemptAt)}</p>}
                  {n.status === "FAILED" && (
                    <form action={retryNotificationAction} className="mt-1">
                      <input type="hidden" name="id" value={n.id} />
                      <button className="rounded-lg border border-slate-300 px-3 py-1 font-medium hover:bg-slate-50">Coba lagi</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}