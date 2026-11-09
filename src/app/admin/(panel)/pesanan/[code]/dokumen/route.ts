import { getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateFileUrl } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const admin = await getAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const { code } = await params;
  const b = await prisma.booking.findUnique({
    where: { code: code.toUpperCase() },
    select: { idDocumentKey: true },
  });
  if (!b) return new Response("Not found", { status: 404 });

  console.info(`[audit] ${admin.email} membuka dokumen identitas ${code}`);
  const url = await getPrivateFileUrl(b.idDocumentKey, 60);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}