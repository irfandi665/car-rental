import { Suspense } from "react";
import { createCarAction, updateCarAction } from "@/app/admin/actions";
import { CarImageUpload } from "@/components/admin/car-image-upload";
import { Flash } from "@/components/admin/flash";
import { prisma } from "@/lib/prisma";
import { first } from "@/lib/search-params";

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat daftar mobil...</p>}>
      <CarsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CarsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const cars = await prisma.car.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });

  return (
    <>
      <h1 className="text-xl font-bold">Mobil</h1>
      <div className="mt-4"><Flash ok={first(sp.ok)} err={first(sp.err)} /></div>

      <details className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold">+ Tambah mobil</summary>
        <form action={createCarAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Nama<input name="name" required className={input} /></label>
          <label className="text-sm font-medium">Merek<input name="brand" required className={input} /></label>
          <label className="text-sm font-medium">Plat nomor<input name="plateNumber" required className={input} /></label>
          <label className="text-sm font-medium">
            Transmisi
            <select name="transmission" className={input}>
              <option value="AUTOMATIC">Otomatis</option>
              <option value="MANUAL">Manual</option>
            </select>
          </label>
          <label className="text-sm font-medium">Kapasitas<input name="seats" type="number" min={2} max={20} defaultValue={7} required className={input} /></label>
          <label className="text-sm font-medium">Harga/hari (Rp)<input name="pricePerDay" type="number" min={50000} step={5000} required className={input} /></label>
          <label className="text-sm font-medium sm:col-span-3">Deskripsi<input name="description" maxLength={500} className={input} /></label>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-3">Simpan</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Foto diunggah setelah mobil tersimpan.</p>
      </details>

      <div className="grid gap-4 md:grid-cols-2">
        {cars.map((c) => (
          <article key={c.id} className={`flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 ${c.isActive ? "" : "opacity-60"}`}>
            <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200 text-3xl">
              {c.imageKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/cars/${c.id}/image?v=${encodeURIComponent(c.imageKey)}`}
                  alt={c.name}
                  className="h-full w-full object-cover"
                />
              ) : "🚗"}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="font-semibold">{c.brand} {c.name}</p>
                <p className="text-xs text-slate-500">
                  {c.plateNumber} · {c.seats} kursi · {c.transmission === "AUTOMATIC" ? "Otomatis" : "Manual"}
                </p>
              </div>
              <form action={updateCarAction} className="flex flex-wrap items-end gap-2 text-xs">
                <input type="hidden" name="id" value={c.id} />
                <label className="font-medium">
                  Harga/hari
                  <input name="pricePerDay" type="number" min={50000} step={5000} defaultValue={c.pricePerDay} className="mt-1 block w-32 rounded-lg border border-slate-300 px-2 py-1.5" />
                </label>
                <label className="flex items-center gap-1.5 pb-1.5 font-medium">
                  <input type="checkbox" name="isActive" defaultChecked={c.isActive} /> Aktif
                </label>
                <button className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white">Simpan</button>
              </form>
              <CarImageUpload carId={c.id} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}