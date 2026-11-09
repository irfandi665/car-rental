export function Flash({ ok, err }: { ok?: string; err?: string }) {
  const text = (err ?? ok)?.slice(0, 200);
  if (!text) return null;
  return (
    <p
      className={`mb-4 rounded-lg px-4 py-3 text-sm ${
        err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
      }`}
    >
      {text}
    </p>
  );
}