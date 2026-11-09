import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { isCarAvailable } from "@/lib/availability";
import { validateDateRange } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-600">{text}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
      >
        Kembali ke katalog
      </Link>
    </div>
  );
}

export default function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ carId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-sm text-slate-500">Memuat formulir booking...</p>
        </main>
      }
    >
      <BookingContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BookingContent({
  params,
  searchParams,
}: {
  params: Promise<{ carId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { carId } = await params;
  const sp = await searchParams;

  const car = await prisma.car.findFirst({ where: { id: carId, isActive: true } });
  if (!car) notFound();

  const range = validateDateRange(first(sp.start), first(sp.end));
  if (!range.ok) {
    return <Notice title="Pilih tanggal sewa dulu" text={range.message} />;
  }

  if (!(await isCarAvailable(car.id, range.start, range.end))) {
    return (
      <Notice
        title="Mobil tidak tersedia"
        text="Mobil ini sudah dipesan atau tidak tersedia pada tanggal yang Anda pilih."
      />
    );
  }

  const accessories = await prisma.accessory.findMany({
    where: { isActive: true },
    orderBy: { pricePerDay: "asc" },
    select: { id: true, name: true, description: true, pricePerDay: true },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← Kembali ke katalog
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Lengkapi Booking</h1>
        <BookingForm
          car={{
            id: car.id,
            name: car.name,
            brand: car.brand,
            seats: car.seats,
            transmission: car.transmission,
            pricePerDay: car.pricePerDay,
          }}
          accessories={accessories.map((a) => ({
            ...a,
            description: a.description ?? "",
          }))}
          start={first(sp.start)!}
          end={first(sp.end)!}
          days={range.days}
        />
      </main>
    </div>
  );
}