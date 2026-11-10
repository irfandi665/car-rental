import { Suspense } from "react";
import Link from "next/link";
import { createBlockAction, deleteBlockAction } from "@/app/admin/actions";
import { Flash } from "@/components/admin/flash";
import { formatDateID, todayJakarta } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { first } from "@/lib/search-params";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function parseMonth(m?: string) {
  const base = /^\d{4}-(0[1-9]|1[0-2])$/.test(m ?? "") ? m! : todayJakarta().slice(0, 7);
  const [y, mo] = base.split("-").map(Number);
  return { y, mo, key: base };
}

function shiftMonth(y: number, mo: number, delta: number) {
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const CELL_CLS = {
  PENDING: "bg-amber-300",
  APPROVED: "bg-green-500",
  BLOCKED: "bg-slate-500",
} as const;

export default function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat kalender...</p>}>
      <CalendarContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CalendarContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { y, mo, key } = parseMonth(first(sp.m));
  const monthStart = new Date(Date.UTC(y, mo - 1, 1));
  const monthEnd = new Date(Date.UTC(y, mo, 0));
  const days = Array.from({ length: monthEnd.getUTCDate() }, (_, i) => i + 1);

  const [cars, bookings, blocks] = await Promise.all([
    prisma.car.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, plateNumber: true },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { code: true, carId: true, startDate: true, endDate: true, status: true, customerName: true },
    }),
    prisma.blockedDate.findMany({
      where: { startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
      include: { car: { select: { name: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  function cellFor(carId: string, dayMs: number) {
    const b = bookings.find(
      (x) => x.carId === carId && x.startDate.getTime() <= dayMs && x.endDate.getTime() >= dayMs,
    );
    if (b) {
      return {
        kind: b.status as "PENDING" | "APPROVED",
        label: `${b.code} - ${b.customerName}`,
        href: `/admin/pesanan/${b.code}`,
      };
    }
    const k = blocks.find(
      (x) => x.carId === carId && x.startDate.getTime() <= dayMs && x.endDate.getTime() >= dayMs,
    );
    if (k) {
      return { kind: "BLOCKED" as const, label: `Diblokir${k.reason ? `: ${k.reason}` : ""}`, href: undefined };
    }
    return undefined;
  }

  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Kalender Ketersediaan</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/admin/kalender?m=${shiftMonth(y, mo, -1)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">←</Link>
          <span className="min-w-36 text-center font-semibold">{MONTHS[mo - 1]} {y}</span>
          <Link href={`/admin/kalender?m=${shiftMonth(y, mo, 1)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">→</Link>
        </div>
      </div>

      <div className="mt-4"><Flash ok={first(sp.ok)} err={first(sp.err)} /></div>

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-amber-300" />Pending</span>
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-green-500" />Approved</span>
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-slate-500" />Diblokir admin</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-40 border-b border-slate-200 bg-white px-3 py-2 text-left">Mobil</th>
              {days.map((d) => (
                <th key={d} className="w-8 min-w-8 border-b border-slate-200 px-0.5 py-2 font-medium text-slate-500">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => (
              <tr key={car.id}>
                <th className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-1 text-left font-medium">
                  {car.name}
                  <span className="block font-normal text-slate-400">{car.plateNumber}</span>
                </th>
                {days.map((d) => {
                  const c = cellFor(car.id, Date.UTC(y, mo - 1, d));
                  return (
                    <td
                      key={d}
                      title={c?.label}
                      className={`h-8 border border-slate-100 p-0 ${c ? CELL_CLS[c.kind] : ""}`}
                    >
                      {c?.href && <Link href={c.href} aria-label={c.label} className="block h-8 w-full" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Blokir tanggal</h2>
          <p className="text-xs text-slate-500">Contoh: mobil masuk bengkel. Tanggal yang sudah punya booking aktif tidak bisa diblokir.</p>
          <form action={createBlockAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="m" value={key} />
            <label className="text-sm font-medium sm:col-span-2">
              Mobil
              <select name="carId" required className={input}>
                {cars.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.plateNumber})</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Mulai<input type="date" name="start" required className={input} /></label>
            <label className="text-sm font-medium">Selesai<input type="date" name="end" required className={input} /></label>
            <label className="text-sm font-medium sm:col-span-2">Alasan<input name="reason" maxLength={200} placeholder="Servis berkala" className={input} /></label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 sm:col-span-2">
              Blokir
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Blokir bulan ini</h2>
          {blocks.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Tidak ada.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {blocks.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium">{k.car.name}</span>
                    <span className="block text-xs text-slate-500">
                      {formatDateID(k.startDate)} – {formatDateID(k.endDate)}{k.reason ? ` · ${k.reason}` : ""}
                    </span>
                  </span>
                  <form action={deleteBlockAction}>
                    <input type="hidden" name="id" value={k.id} />
                    <input type="hidden" name="m" value={key} />
                    <button className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Hapus</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}