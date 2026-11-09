import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateID, formatIDR } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL = {
  PENDING: { text: "Menunggu Konfirmasi", cls: "bg-amber-100 text-amber-800" },
  APPROVED: { text: "Disetujui", cls: "bg-green-100 text-green-800" },
  COMPLETED: { text: "Selesai", cls: "bg-slate-200 text-slate-700" },
  CANCELLED: { text: "Dibatalkan", cls: "bg-red-100 text-red-800" },
} as const;

export default function OrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-4 py-10">
          <p className="text-sm text-slate-500">Memuat detail pesanan...</p>
        </main>
      }
    >
      <OrderContent params={params} />
    </Suspense>
  );
}

async function OrderContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const booking = await prisma.booking.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      car: { select: { name: true, brand: true } },
      accessories: { include: { accessory: { select: { name: true } } } },
    },
  });
  if (!booking) notFound();

  const status = STATUS_LABEL[booking.status];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Kode booking</p>
          <p className="text-3xl font-bold tracking-wider">{booking.code}</p>
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>
            {status.text}
          </span>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Penyewa</dt>
              <dd>{booking.customerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Mobil</dt>
              <dd>{booking.car.brand} {booking.car.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tanggal</dt>
              <dd>{formatDateID(booking.startDate)} – {formatDateID(booking.endDate)} ({booking.totalDays} hari)</dd>
            </div>
            {booking.accessories.map((a) => (
              <div key={a.id} className="flex justify-between">
                <dt className="text-slate-500">Aksesoris</dt>
                <dd>{a.accessory.name}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatIDR(booking.totalPrice)}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Langkah selanjutnya</p>
            <p className="mt-1">
              Admin akan meninjau pesanan Anda dan menghubungi via WhatsApp.
              Pembayaran dilakukan saat pickup atau sesuai arahan admin. Simpan
              kode booking ini.
            </p>
          </div>

          <Link href="/" className="mt-6 inline-block text-sm font-medium underline">
            Kembali ke katalog
          </Link>
        </div>
      </main>
    </div>
  );
}