import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Panel Admin", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-bold">Admin Rental</span>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/admin/pesanan" className="hover:underline">Pesanan</Link>
            <Link href="/admin/kalender" className="hover:underline">Kalender</Link>
            <Link href="/admin/mobil" className="hover:underline">Mobil</Link>
          </nav>
          <form action={logoutAction} className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-500">{admin.name}</span>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
              Keluar
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}