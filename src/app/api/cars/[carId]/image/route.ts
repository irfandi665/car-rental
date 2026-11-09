import { prisma } from "@/lib/prisma";
import { getFileBytes } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ carId: string }> },
) {
  const { carId } = await params;
  const car = await prisma.car.findUnique({
    where: { id: carId },
    select: { imageKey: true },
  });
  if (!car?.imageKey) return new Response("Not found", { status: 404 });

  try {
    const { bytes, contentType } = await getFileBytes(car.imageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}