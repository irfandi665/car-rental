import { formatDateID, formatIDR } from "@/lib/dates";

export type BookingSummary = {
  bookingId: string;
  code: string;
  customerName: string;
  customerWhatsapp: string; // format 628...
  customerEmail?: string | null;
  carName: string;
  startDate: Date;
  endDate: Date;
  days: number;
  accessoryNames: string[];
  totalPrice: number;
};

export type WaPayload = { text: string; vars: Record<string, string> };
export type EmailPayload = { subject: string; text: string; html: string };

const biz = () => process.env.BUSINESS_NAME ?? "Rental Mobil";
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const payInfo = () =>
  process.env.PAYMENT_INSTRUCTIONS ??
  "Pembayaran dilakukan saat pickup atau sesuai arahan admin.";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Variabel template WhatsApp: tanpa baris baru/tab, tanpa spasi beruntun, tidak boleh kosong */
const waVar = (s: string) =>
  s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim() || "-";

function facts(b: BookingSummary) {
  return {
    range: `${formatDateID(b.startDate)} - ${formatDateID(b.endDate)} (${b.days} hari)`,
    total: formatIDR(b.totalPrice),
    acc: b.accessoryNames.length ? b.accessoryNames.join(", ") : "-",
  };
}

function htmlMail(heading: string, intro: string, rows: [string, string][], footerHtml: string) {
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#64748b">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
<h2 style="margin:0 0 12px">${esc(heading)}</h2>
<p>${esc(intro)}</p>
<table style="border-collapse:collapse;font-size:14px">${tr}</table>
<p style="margin-top:16px;font-size:14px">${footerHtml}</p>
</div>`;
}

export function buildCustomerMessage(b: BookingSummary): { wa: WaPayload; email: EmailPayload } {
  const f = facts(b);
  const url = `${appUrl()}/pesanan/${b.code}`;
  const status = "Menunggu konfirmasi admin";

  const text = [
    `Halo ${b.customerName},`,
    ``,
    `Booking Anda di ${biz()} sudah kami terima.`,
    ``,
    `Kode booking : ${b.code}`,
    `Mobil        : ${b.carName}`,
    `Tanggal      : ${f.range}`,
    `Aksesoris    : ${f.acc}`,
    `Total        : ${f.total}`,
    `Status       : ${status}`,
    ``,
    `Pembayaran: ${payInfo()}`,
    ``,
    `Cek status booking: ${url}`,
  ].join("\n");

  return {
    wa: {
      text,
      // Urutan variabel HARUS sama dengan template WhatsApp (lihat Langkah 11)
      vars: {
        "1": waVar(b.customerName),
        "2": waVar(b.code),
        "3": waVar(b.carName),
        "4": waVar(f.range),
        "5": waVar(f.total),
        "6": waVar(payInfo()),
        "7": waVar(url),
      },
    },
    email: {
      subject: `Booking ${b.code} diterima - ${biz()}`,
      text,
      html: htmlMail(
        `Booking ${b.code} diterima`,
        `Halo ${b.customerName}, booking Anda di ${biz()} sudah kami terima.`,
        [
          ["Mobil", b.carName],
          ["Tanggal", f.range],
          ["Aksesoris", f.acc],
          ["Total", f.total],
          ["Status", status],
        ],
        `<strong>Pembayaran:</strong> ${esc(payInfo())}<br><br><a href="${esc(url)}">Cek status booking</a>`,
      ),
    },
  };
}

export function buildAdminMessage(b: BookingSummary): { wa: WaPayload; email: EmailPayload } {
  const f = facts(b);
  const url = `${appUrl()}/admin/pesanan/${b.code}`;

  const text = [
    `Booking baru perlu direviu.`,
    ``,
    `Kode    : ${b.code}`,
    `Penyewa : ${b.customerName} (+${b.customerWhatsapp})`,
    `Mobil   : ${b.carName}`,
    `Tanggal : ${f.range}`,
    `Aksesoris: ${f.acc}`,
    `Total   : ${f.total}`,
    ``,
    `Tinjau: ${url}`,
  ].join("\n");

  return {
    wa: {
      text,
      vars: {
        "1": waVar(b.code),
        "2": waVar(b.customerName),
        "3": waVar(b.carName),
        "4": waVar(f.range),
        "5": waVar(f.total),
        "6": waVar(url),
      },
    },
    email: {
      subject: `[Booking baru] ${b.code} - ${b.customerName}`,
      text,
      html: htmlMail(
        `Booking baru ${b.code}`,
        `Ada booking baru yang perlu direviu.`,
        [
          ["Penyewa", `${b.customerName} (+${b.customerWhatsapp})`],
          ["Mobil", b.carName],
          ["Tanggal", f.range],
          ["Aksesoris", f.acc],
          ["Total", f.total],
        ],
        `<a href="${esc(url)}">Buka di panel admin</a>`,
      ),
    },
  };
}