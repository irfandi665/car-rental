import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { processDueNotifications } from "@/lib/notifications/processor";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await processDueNotifications(50));
}