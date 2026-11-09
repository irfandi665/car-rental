import Link from "next/link";
import type { CarResult } from "@/lib/availability";
import { formatIDR } from "@/lib/dates";

const TRANSMISSION_LABEL = { MANUAL: "Manual", AUTOMATIC: "Otomatis" } as const;

type Props = {
  car: CarResult;
  days?: number;
  startStr: string;
  endStr: string;
};

export function CarCard({ car, days, startStr, endStr }: Props) {
  const href =
    startStr && endStr
      ? `/booking/${car.id}?start=${startStr}&end=${endStr}`
      : `/booking/${car.id}`;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
        car.available ? "" : "opacity-60"
      }`}
    >
      {/* Placeholder: foto asli diunggah admin di Sesi 5 */}
      <div className="relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-5xl">
        🚗
        {!car.available && (
          <span className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
            Tidak Tersedia
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {car.brand}
          </p>
          <h3 className="text-lg font-semibold">{car.name}</h3>
        </div>

        <ul className="flex flex-wrap gap-2 text-sm text-slate-600">
          <li className="rounded-full bg-slate-100 px-3 py-1">
            {TRANSMISSION_LABEL[car.transmission]}
          </li>
          <li className="rounded-full bg-slate-100 px-3 py-1">
            {car.seats} penumpang
          </li>
        </ul>

        <div className="mt-auto">
          <p className="text-xl font-bold">
            {formatIDR(car.pricePerDay)}
            <span className="text-sm font-normal text-slate-500"> / hari</span>
          </p>
          {days && (
            <p className="text-sm text-slate-500">
              Estimasi {days} hari: {formatIDR(car.pricePerDay * days)}
            </p>
          )}
        </div>

        {car.available ? (
          <Link
            href={href}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-700"
          >
            Pilih Mobil Ini
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-500">
            Tidak Tersedia
          </span>
        )}
      </div>
    </article>
  );
}