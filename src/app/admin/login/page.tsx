import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { Flash } from "@/components/admin/flash";
import { getAdmin } from "@/lib/auth";
import { first } from "@/lib/search-params";

export const metadata = { title: "Login Admin", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getAdmin()) redirect("/admin/pesanan");
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
      <form
        action={loginAction}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold">Login Admin</h1>
        <Flash err={first(sp.err)} />
        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
          Masuk
        </button>
      </form>
    </div>
  );
}