import type { NextRequest } from "next/server";
import { searchCars } from "@/lib/availability";
import { parseCatalogParams } from "@/lib/catalog-params";

export async function GET(req: NextRequest) {
  const params = parseCatalogParams(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (params.error) {
    return Response.json({ error: params.error }, { status: 400 });
  }
  const cars = await searchCars(params);
  return Response.json({ days: params.days ?? null, cars });
}