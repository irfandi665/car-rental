import Link from "next/link";
import { notFound } from "next/navigation";
import { changeStatusAction } from "@/app/admin/actions";
import { Flash } from "@/components/admin/flash";
import { StatusBadge } from "@/components/admin/status-badge";
import { STATUS_META, TRANSITIONS, type Status } from "@/lib/booking-status";
import { formatDateID, formatIDR } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { first } from "@/lib/search-params";

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);

const ACTION: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: "Setujui", cls: "bg-green-600 hover:bg-green-700" },
  COMPLETED: { label: "Tandai Selesai", cls: "bg-slate-800 hover:bg-slate-700" },
  CANCELLED: { label: "Batalkan", cls: "bg-red-600 hover:bg-red-700" },
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const sp = await searchParams;

  const b = await prisma.booking.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      car: true,
      accessories: { include: { accessory: { select: { name: true } } } },
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!b) notFound();

  const allowed = TRANSITIONS[b.status as Status];
  const row = "flex justify-between gap-4 py-1.5 text-sm";

  return (
    <>
      <Link href="/admin/pesanan" className="text-sm text-slate-500 hover:underline">
        ← Semua pesanan
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{b.code}</h1>
        <StatusBadge status={b.status} />
      </div>
      <div className="mt-4">
        <Flash ok={first(sp.ok)} err={first(sp.err)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Penyewa</h2>
            <div className="mt-2 divide-y divide-slate-100">
              <div className={row}><span className="text-slate-500">Nama</span><span>{b.customerName}</span></div>
              <div className={row}>
                <span className="text-slate-500">WhatsApp</span>
                <a href={`https://wa.me/${b.customerWhatsapp}`} target="_blank" rel="noreferrer" className="underline">
                  +{b.customerWhatsapp}
                </a>
              </div>
              <div className={row}><span className="text-slate-500">Email</span><span>{b.customerEmail ?? "-"}</span></div>
              <div className={row}>
                <span className="text-slate-500">KTP/SIM</span>
                <a href={`/admin/pesanan/${b.code}/dokumen`} target="_blank" rel="noreferrer" className="font-medium underline">
                  Lihat dokumen
                </a>
              </div>
              {b.notes && <div className={row}><span className="text-slate-500">Catatan</span><span className="text-right">{b.notes}</span></div>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Sewa</h2>
            <div className="mt-2 divide-y divide-slate-100">
              <div className={row}><span className="text-slate-500">Mobil</span><span>{b.car.brand} {b.car.name} ({b.car.plateNumber})</span></div>
              <div className={row}><span className="text-slate-500">Tanggal</span><span>{formatDateID(b.startDate)} – {formatDateID(b.endDate)} ({b.totalDays} hari)</span></div>
              <div className={row}><span className="text-slate-500">Harga mobil</span><span>{formatIDR(b.carPricePerDay)}/hari</span></div>
              {b.accessories.map((a) => (
                <div key={a.id} className={row}>
                  <span className="text-slate-500">Aksesoris</span>
                  <span>{a.accessory.name} ({formatIDR(a.pricePerDay)}/hari)</span>
                </div>
              ))}
              <div className={`${row} text-base font-bold`}><span>Total</span><span>{formatIDR(b.totalPrice)}</span></div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Ubah status</h2>
            {allowed.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Status akhir, tidak dapat diubah lagi.</p>
            ) : (
              <form action={changeStatusAction} className="mt-3 space-y-3">
                <input type="hidden" name="code" value={b.code} />
                <label className="block text-sm font-medium">
                  Catatan (wajib saat membatalkan)
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={300}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {allowed.map((t) => (
                    <button
                      key={t}
                      name="to"
                      value={t}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${ACTION[t].cls}`}
                    >
                      {ACTION[t].label}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Riwayat status</h2>
            <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4 text-sm">
              {b.statusLogs.map((l) => (
                <li key={l.id}>
                  <p className="font-medium">
                    {l.fromStatus ? `${STATUS_META[l.fromStatus as Status].text} → ` : ""}
                    {STATUS_META[l.toStatus as Status].text}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmtTime(l.createdAt)} · {l.changedBy?.name ?? "Customer/Sistem"}
                  </p>
                  {l.note && <p className="mt-0.5 text-slate-600">{l.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}