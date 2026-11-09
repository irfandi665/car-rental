// src/lib/admin-redirect.ts
import { redirect } from "next/navigation";

/** Redirect membawa pesan sukses (ok) atau error (err) lewat query string */
export function redirectWith(path: string, type: "ok" | "err", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${type}=${encodeURIComponent(message)}`);
}