import { randomUUID } from "node:crypto";
import { after, type NextRequest } from "next/server";
import { BookingError, createBooking, isOverlapError } from "@/lib/booking-service";
import { validateDateRange } from "@/lib/dates";
import { MAX_ID_FILE_BYTES, detectImage } from "@/lib/image-file";
import { processDueNotifications } from "@/lib/notifications/processor";
import { deleteFile, uploadPrivateFile } from "@/lib/storage";
import { bookingSchema, fieldErrors } from "@/lib/validation";

const json = (body: unknown, status: number) => Response.json(body, { status });

export async function POST(req: NextRequest) {
  // Tolak lebih awal jika ukuran request jelas berlebihan
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_ID_FILE_BYTES + 200_000) {
    return json({ error: "TOO_LARGE", message: "Ukuran file terlalu besar (maks 5 MB)." }, 413);
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return json({ error: "BAD_REQUEST", message: "Data form tidak valid." }, 400);
  }

  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };

  const parsed = bookingSchema.safeParse({
    carId: str("carId"),
    start: str("start"),
    end: str("end"),
    customerName: str("customerName"),
    customerWhatsapp: str("customerWhatsapp"),
    customerEmail: str("customerEmail"),
    notes: str("notes"),
    accessoryIds: fd.getAll("accessoryIds").filter((v): v is string => typeof v === "string"),
  });

  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);

  // Validasi file berdasarkan isi (magic bytes), bukan nama/ekstensi
  const file = fd.get("idDocument");
  let buffer: Buffer | undefined;
  let image: ReturnType<typeof detectImage> = null;

  if (!(file instanceof File) || file.size === 0) {
    errors.idDocument = "Foto KTP/SIM wajib diunggah.";
  } else if (file.size > MAX_ID_FILE_BYTES) {
    errors.idDocument = "Ukuran file maksimal 5 MB.";
  } else {
    buffer = Buffer.from(await file.arrayBuffer());
    image = detectImage(buffer);
    if (!image) errors.idDocument = "Format file harus JPG, PNG, atau WebP.";
  }

  if (!parsed.success || !buffer || !image || Object.keys(errors).length > 0) {
    return json({ error: "VALIDATION", fieldErrors: errors }, 400);
  }

  const data = parsed.data;
  const range = validateDateRange(data.start, data.end);
  if (!range.ok) {
    return json({ error: "VALIDATION", fieldErrors: { [range.field]: range.message } }, 400);
  }

  // 1) Simpan file ke storage private
  const key = `id-documents/${randomUUID()}.${image.ext}`;
  try {
    await uploadPrivateFile(key, buffer, image.mime);
  } catch (e) {
    console.error("Upload gagal:", e);
    return json({ error: "UPLOAD_FAILED", message: "Gagal menyimpan foto identitas. Coba lagi." }, 502);
  }

  // 2) Simpan booking. Jika gagal, hapus file agar tidak jadi sampah.
  try {
    const booking = await createBooking({
      carId: data.carId,
      start: range.start,
      end: range.end,
      days: range.days,
      customerName: data.customerName,
      customerWhatsapp: data.customerWhatsapp,
      customerEmail: data.customerEmail,
      notes: data.notes,
      accessoryIds: data.accessoryIds,
      idDocumentKey: key,
    });

    // Dijalankan setelah respons terkirim ke customer, jadi tidak memperlambat booking
    after(() =>
      processDueNotifications().catch((err) => console.error("[notif]", err)),
    );

    return json({ code: booking.code }, 201);
  } catch (e) {
    await deleteFile(key).catch(() => {});

    if (e instanceof BookingError) {
      const status =
        e.code === "CAR_UNAVAILABLE" ? 409 : e.code === "CAR_NOT_FOUND" ? 404 : 400;
      return json({ error: e.code, message: e.message }, status);
    }
    if (isOverlapError(e)) {
      return json(
        {
          error: "CAR_UNAVAILABLE",
          message: "Maaf, mobil ini baru saja dipesan orang lain untuk tanggal tersebut. Silakan pilih tanggal atau mobil lain.",
        },
        409,
      );
    }
    console.error("Gagal membuat booking:", e);
    return json({ error: "SERVER_ERROR", message: "Terjadi kesalahan. Coba lagi sebentar lagi." }, 500);
  }
}