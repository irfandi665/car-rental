import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { PermanentError } from "./errors";
import type { EmailPayload } from "./templates";

let transporter: Transporter | undefined;

function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

export async function sendEmail(p: { to: string; payload: EmailPayload }): Promise<{ id?: string }> {
  const provider = process.env.EMAIL_PROVIDER ?? "smtp";

  if (provider === "log") {
    console.info(`[email:log] ke ${p.to}\nSubject: ${p.payload.subject}\n${p.payload.text}\n`);
    return { id: "log" };
  }
  if (provider !== "smtp") {
    throw new PermanentError(`EMAIL_PROVIDER tidak dikenal: ${provider}`);
  }
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) {
    throw new PermanentError("SMTP_HOST dan EMAIL_FROM belum diatur");
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: p.to,
      subject: p.payload.subject,
      text: p.payload.text,
      html: p.payload.html,
    });
    return { id: info.messageId };
  } catch (e) {
    const code = (e as { responseCode?: number }).responseCode;
    // Balasan SMTP 5xx = ditolak permanen (alamat tidak ada, login salah, dll.)
    if (typeof code === "number" && code >= 500) {
      throw new PermanentError(`SMTP ${code}: ${(e as Error).message}`);
    }
    throw e; // koneksi putus, 4xx -> dicoba ulang
  }
}