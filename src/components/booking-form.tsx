"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIDR } from "@/lib/dates";
import { MAX_ID_FILE_BYTES } from "@/lib/image-file";
import { calculateTotal } from "@/lib/pricing";

type Car = {
  id: string;
  name: string;
  brand: string;
  seats: number;
  transmission: "MANUAL" | "AUTOMATIC";
  pricePerDay: number;
};
type Accessory = { id: string; name: string; description: string; pricePerDay: number };

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;
}

export function BookingForm(props: {
  car: Car;
  accessories: Accessory[];
  start: string;
  end: string;
  days: number;
}) {
  const { car, accessories, start, end, days } = props;
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const chosen = useMemo(
    () => accessories.filter((a) => selected.includes(a.id)),
    [accessories, selected],
  );
  const total = calculateTotal(
    car.pricePerDay,
    chosen.map((a) => a.pricePerDay),
    days,
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErrors((prev) => {
      const { idDocument: _removed, ...rest } = prev;
      void _removed;
      return f && f.size > MAX_ID_FILE_BYTES
        ? { ...rest, idDocument: "Ukuran file maksimal 5 MB." }
        : rest;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        router.push(`/pesanan/${data.code}`);
        return;
      }
      if (res.status === 400 && data.fieldErrors) {
        setErrors(data.fieldErrors);
      } else {
        setFormError(data.message ?? "Terjadi kesalahan. Coba lagi.");
      }
    } catch {
      setFormError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  const topError = formError ?? errors.start ?? errors.end ?? errors.carId;

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-3">
      <input type="hidden" name="carId" value={car.id} />
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="end" value={end} />

      <div className="space-y-6 lg:col-span-2">
        {topError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{topError}</p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Data diri</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Nama lengkap
              <input name="customerName" required className={inputCls} />
              <FieldError msg={errors.customerName} />
            </label>
            <label className="text-sm font-medium">
              No. WhatsApp
              <input
                name="customerWhatsapp"
                type="tel"
                required
                placeholder="081234567890"
                className={inputCls}
              />
              <FieldError msg={errors.customerWhatsapp} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Email (opsional)
              <input name="customerEmail" type="email" className={inputCls} />
              <FieldError msg={errors.customerEmail} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Foto KTP/SIM
              <input
                name="idDocument"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={onFileChange}
                className={`${inputCls} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1`}
              />
              <span className="mt-1 block text-xs text-slate-500">
                JPG/PNG/WebP, maks 5 MB. Disimpan privat dan hanya dilihat admin.
              </span>
              <FieldError msg={errors.idDocument} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Catatan (opsional)
              <textarea name="notes" rows={3} className={inputCls} />
              <FieldError msg={errors.notes} />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Aksesoris tambahan</h2>
          <div className="mt-3 space-y-2">
            {accessories.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name="accessoryIds"
                  value={a.id}
                  checked={selected.includes(a.id)}
                  onChange={() => toggle(a.id)}
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="font-medium">{a.name}</span>
                  <span className="block text-xs text-slate-500">{a.description}</span>
                </span>
                <span className="whitespace-nowrap text-slate-700">
                  +{formatIDR(a.pricePerDay)}/hari
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <h2 className="font-semibold">Ringkasan</h2>
        <p className="mt-1 text-sm text-slate-600">
          {car.brand} {car.name}
        </p>
        <p className="text-sm text-slate-500">
          {start} s.d. {end} ({days} hari)
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Mobil ({formatIDR(car.pricePerDay)} × {days})</dt>
            <dd>{formatIDR(car.pricePerDay * days)}</dd>
          </div>
          {chosen.map((a) => (
            <div key={a.id} className="flex justify-between">
              <dt>{a.name} ({formatIDR(a.pricePerDay)} × {days})</dt>
              <dd>{formatIDR(a.pricePerDay * days)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatIDR(total)}</dd>
          </div>
        </dl>

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {submitting ? "Memproses..." : "Booking Sekarang"}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Tidak ada pembayaran online. Pembayaran dilakukan saat pickup atau
          sesuai arahan admin.
        </p>
      </aside>
    </form>
  );
}