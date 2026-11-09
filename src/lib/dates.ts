export const MAX_RENTAL_DAYS = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Tanggal "hari ini" menurut WIB, format YYYY-MM-DD */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}

/** "2026-12-10" -> Date UTC 00:00 (sesuai kolom @db.Date). Null jika tidak valid. */
export function parseDateOnly(value?: string): Date | null {
  if (!value || !DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    return null;
  }
  return d;
}

/** Jumlah hari sewa, inklusif (10 s.d. 12 = 3 hari) */
export function diffDaysInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateID(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d);
}

export type RangeResult =
  | { ok: true; start: Date; end: Date; days: number }
  | { ok: false; field: "start" | "end"; message: string };

export function validateDateRange(startStr?: string, endStr?: string): RangeResult {
  const start = parseDateOnly(startStr);
  if (!start) return { ok: false, field: "start", message: "Tanggal mulai tidak valid." };
  const end = parseDateOnly(endStr);
  if (!end) return { ok: false, field: "end", message: "Tanggal selesai tidak valid." };

  if (start.toISOString().slice(0, 10) < todayJakarta()) {
    return { ok: false, field: "start", message: "Tanggal mulai tidak boleh sebelum hari ini." };
  }
  if (end < start) {
    return { ok: false, field: "end", message: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
  }
  const days = diffDaysInclusive(start, end);
  if (days > MAX_RENTAL_DAYS) {
    return { ok: false, field: "end", message: `Maksimal durasi sewa ${MAX_RENTAL_DAYS} hari.` };
  }
  return { ok: true, start, end, days };
}