import { Suspense } from "react";
import Link from "next/link";
import { Flash } from "@/components/admin/flash";
import { StatusBadge } from "@/components/admin/status-badge";
import { STATUS_META, type Status } from "@/lib/booking-status";
import { formatDateID, formatIDR } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { first } from "@/lib/search-params";

const STATUSES: Status[] = ["PENDING", "APPROVED", "COMPLETED", "CANCELLED"];

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat pesanan...</p>}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrdersContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === first(sp.status));

  const [rows, grouped] = await Promise.all([
    prisma.booking.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { car: { select: { name: true, brand: true } } },
    }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium ${
      active ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"
    }`;

  return (
    <>
      <h1 className="text-xl font-bold">Pesanan</h1>
      <div className="mt-4">
        <Flash ok={first(sp.ok)} err={first(sp.err)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/pesanan" className={tab(!status)}>Semua</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/pesanan?status=${s}`} className={tab(status === s)}>
            {STATUS_META[s].text} ({counts[s] ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Penyewa</th>
              <th className="px-4 py-3">Mobil</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Belum ada pesanan.
                </td>
              </tr>
            )}
            {rows.map((b) => (
              <tr key={b.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-mono font-semibold">
                  <Link href={`/admin/pesanan/${b.code}`} className="underline">{b.code}</Link>
                </td>
                <td className="px-4 py-3">{b.customerName}</td>
                <td className="px-4 py-3">{b.car.brand} {b.car.name}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {formatDateID(b.startDate)} – {formatDateID(b.endDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{formatIDR(b.totalPrice)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 100 && (
        <p className="mt-2 text-xs text-slate-500">Menampilkan 100 pesanan terbaru.</p>
      )}
    </>
  );
}