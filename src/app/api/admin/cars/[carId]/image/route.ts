import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { MAX_CAR_IMAGE_BYTES, detectImage } from "@/lib/image-file";
import { prisma } from "@/lib/prisma";
import { deleteFile, uploadPrivateFile } from "@/lib/storage";

const json = (body: unknown, status: number) => Response.json(body, { status });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ carId: string }> },
) {
  if (!(await getAdmin())) return json({ message: "Tidak diizinkan." }, 401);

  const { carId } = await params;
  const car = await prisma.car.findUnique({
    where: { id: carId },
    select: { id: true, imageKey: true },
  });
  if (!car) return json({ message: "Mobil tidak ditemukan." }, 404);

  const fd = await req.formData().catch(() => null);
  const file = fd?.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return json({ message: "Pilih file gambar." }, 400);
  }
  if (file.size > MAX_CAR_IMAGE_BYTES) return json({ message: "Ukuran maksimal 3 MB." }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = detectImage(buffer);
  if (!image) return json({ message: "Format harus JPG, PNG, atau WebP." }, 400);

  const key = `car-images/${car.id}/${randomUUID()}.${image.ext}`;
  await uploadPrivateFile(key, buffer, image.mime);
  await prisma.car.update({ where: { id: car.id }, data: { imageKey: key } });
  if (car.imageKey) await deleteFile(car.imageKey).catch(() => {});

  return json({ ok: true }, 200);
}