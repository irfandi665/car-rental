import { z } from "zod";
import { validateDateRange } from "@/lib/dates";

/** 0812-3456-7890 / +62 812 ... / 62812... -> 62812xxxxxxx */
export function normalizeWhatsapp(input: string): string {
  let n = input.replace(/[\s\-().]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n;
}

export const bookingSchema = z
  .object({
    carId: z.string().min(1, "Mobil tidak valid."),
    start: z.string(),
    end: z.string(),
    customerName: z
      .string()
      .trim()
      .min(3, "Nama minimal 3 karakter.")
      .max(100, "Nama terlalu panjang."),
    customerWhatsapp: z
      .string()
      .transform(normalizeWhatsapp)
      .pipe(
        z
          .string()
          .regex(/^628\d{8,12}$/, "Nomor WhatsApp tidak valid (contoh: 081234567890)."),
      ),
    customerEmail: z
      .string()
      .trim()
      .max(120, "Email terlalu panjang.")
      .refine(
        (v) => v === "" || z.string().email().safeParse(v).success,
        "Format email tidak valid.",
      )
      .transform((v) => (v === "" ? undefined : v)),
    notes: z
      .string()
      .trim()
      .max(500, "Catatan maksimal 500 karakter.")
      .transform((v) => (v === "" ? undefined : v)),
    accessoryIds: z.array(z.string().min(1)).max(20),
  })
  .superRefine((d, ctx) => {
    const r = validateDateRange(d.start, d.end);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", path: [r.field], message: r.message });
    }
  });

/** Ambil satu pesan error per field */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}