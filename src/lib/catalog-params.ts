import {
  MAX_RENTAL_DAYS,
  diffDaysInclusive,
  parseDateOnly,
  todayJakarta,
} from "@/lib/dates";
import type { CarFilters } from "@/lib/availability";

export type RawParams = Record<string, string | string[] | undefined>;

export type ParsedCatalogParams = CarFilters & {
  startStr: string;
  endStr: string;
  days: number | undefined;
  error: string | undefined;
};

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const SEAT_OPTIONS = [5, 7, 15];

export function parseCatalogParams(sp: RawParams): ParsedCatalogParams {
  const startStr = first(sp.start) ?? "";
  const endStr = first(sp.end) ?? "";

  const seatsNum = Number(first(sp.seats));
  const minSeats = SEAT_OPTIONS.includes(seatsNum) ? seatsNum : undefined;

  const t = first(sp.transmission);
  const transmission = t === "MANUAL" || t === "AUTOMATIC" ? t : undefined;

  let start: Date | undefined;
  let end: Date | undefined;
  let days: number | undefined;
  let error: string | undefined;

  if (startStr || endStr) {
    start = parseDateOnly(startStr) ?? undefined;
    end = parseDateOnly(endStr) ?? undefined;

    if (!start || !end) {
      error = "Isi tanggal mulai dan tanggal selesai dengan benar.";
    } else if (startStr < todayJakarta()) {
      error = "Tanggal mulai tidak boleh sebelum hari ini.";
    } else if (end < start) {
      error = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
    } else {
      days = diffDaysInclusive(start, end);
      if (days > MAX_RENTAL_DAYS) {
        error = `Maksimal durasi sewa ${MAX_RENTAL_DAYS} hari.`;
      }
    }
    if (error) {
      start = undefined;
      end = undefined;
      days = undefined;
    }
  }

  return { startStr, endStr, start, end, days, minSeats, transmission, error };
}