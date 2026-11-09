import { STATUS_META, type Status } from "@/lib/booking-status";

export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${m.cls}`}>
      {m.text}
    </span>
  );
}