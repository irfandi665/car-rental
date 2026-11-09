import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [cars, accessories] = await Promise.all([
      prisma.car.count(),
      prisma.accessory.count(),
    ]);
    return Response.json({ status: "ok", cars, accessories });
  } catch {
    return Response.json({ status: "error" }, { status: 500 });
  }
}