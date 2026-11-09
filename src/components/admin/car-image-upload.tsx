"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_CAR_IMAGE_BYTES } from "@/lib/image-file";

export function CarImageUpload({ carId }: { carId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_CAR_IMAGE_BYTES) {
      setMsg("Ukuran maksimal 3 MB.");
      input.value = "";
      return;
    }

    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`/api/admin/cars/${carId}/image`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data.message ?? "Gagal mengunggah.");
      else router.refresh();
    } catch {
      setMsg("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  return (
    <div className="text-xs">
      <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50">
        {busy ? "Mengunggah..." : "Ganti foto"}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} disabled={busy} className="hidden" />
      </label>
      {msg && <p className="mt-1 text-red-600">{msg}</p>}
    </div>
  );
}