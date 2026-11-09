import { Suspense } from "react";
import Link from "next/link";
import { CarCard } from "@/components/car-card";
import { searchCars } from "@/lib/availability";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";
import { formatDateID, todayJakarta } from "@/lib/dates";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-4 py-6">
          <p className="text-sm text-slate-500">Memuat daftar mobil...</p>
        </main>
      }
    >
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const p = parseCatalogParams(await searchParams);
  const cars = await searchCars(p);
  const today = todayJakarta();
  const hasFilter = Boolean(
    p.startStr || p.endStr || p.minSeats || p.transmission,
  );
  const availableCount = cars.filter((c) => c.available).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <h1 className="text-2xl font-bold">Rental Mobil</h1>
          <p className="text-sm text-slate-500">
            Pilih tanggal, pilih mobil, pesan dalam hitungan menit.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <form
          method="get"
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className="text-sm font-medium">
            Tanggal mulai
            <input
              type="date"
              name="start"
              defaultValue={p.startStr}
              min={today}
              className={`${inputCls} mt-1`}
            />
          </label>
          <label className="text-sm font-medium">
            Tanggal selesai
            <input
              type="date"
              name="end"
              defaultValue={p.endStr}
              min={p.startStr || today}
              className={`${inputCls} mt-1`}
            />
          </label>
          <label className="text-sm font-medium">
            Kapasitas
            <select
              name="seats"
              defaultValue={p.minSeats?.toString() ?? ""}
              className={`${inputCls} mt-1`}
            >
              <option value="">Semua</option>
              <option value="5">5+ penumpang</option>
              <option value="7">7+ penumpang</option>
              <option value="15">15+ penumpang</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Transmisi
            <select
              name="transmission"
              defaultValue={p.transmission ?? ""}
              className={`${inputCls} mt-1`}
            >
              <option value="">Semua</option>
              <option value="AUTOMATIC">Otomatis</option>
              <option value="MANUAL">Manual</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Cari Mobil
            </button>
            {hasFilter && (
              <Link
                href="/"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {p.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {p.error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {p.start && p.end
              ? `Tersedia ${formatDateID(p.start)} – ${formatDateID(p.end)} (${p.days} hari)`
              : "Semua armada"}
          </h2>
          <p className="text-sm text-slate-500">
            {p.start && p.end
              ? `${availableCount} dari ${cars.length} mobil tersedia`
              : `${cars.length} mobil`}
          </p>
        </div>

        {cars.length === 0 ? (
          <p className="mt-8 text-center text-slate-500">
            Tidak ada mobil yang cocok dengan filter ini.
          </p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                days={p.days}
                startStr={p.startStr}
                endStr={p.endStr}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}