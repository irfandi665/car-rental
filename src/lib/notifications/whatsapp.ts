import { PermanentError } from "./errors";
import type { WaPayload } from "./templates";

export type WaKind = "BOOKING_CREATED_CUSTOMER" | "BOOKING_CREATED_ADMIN";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new PermanentError(`Environment variable ${name} belum diatur`);
  return v;
}

export async function sendWhatsapp(p: {
  to: string; // 628...
  kind: WaKind;
  payload: WaPayload;
}): Promise<{ id?: string }> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "log";

  if (provider === "log") {
    console.info(`[wa:log] ke +${p.to}\n${p.payload.text}\n`);
    return { id: "log" };
  }
  if (provider === "twilio") return sendViaTwilio(p);

  throw new PermanentError(`WHATSAPP_PROVIDER tidak dikenal: ${provider}`);
}

async function sendViaTwilio(p: { to: string; kind: WaKind; payload: WaPayload }) {
  const sid = req("TWILIO_ACCOUNT_SID");
  const token = req("TWILIO_AUTH_TOKEN");
  const fromDigits = req("TWILIO_WHATSAPP_FROM").replace(/^whatsapp:/, "").replace(/^\+/, "");

  const body = new URLSearchParams({
    From: `whatsapp:+${fromDigits}`,
    To: `whatsapp:+${p.to}`,
  });

  if ((process.env.TWILIO_WA_MODE ?? "freeform") === "template") {
    const contentSid = req(
      p.kind === "BOOKING_CREATED_CUSTOMER"
        ? "TWILIO_CONTENT_SID_CUSTOMER"
        : "TWILIO_CONTENT_SID_ADMIN",
    );
    body.set("ContentSid", contentSid);
    body.set("ContentVariables", JSON.stringify(p.payload.vars));
  } else {
    body.set("Body", p.payload.text);
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    code?: number;
  };
  if (res.ok) return { id: data.sid };

  const msg = `Twilio ${res.status}: ${data.message ?? "error"} (kode ${data.code ?? "-"})`;
  // 4xx (kecuali 429) = permintaan/kredensial salah, tidak akan sembuh dengan retry
  if (res.status >= 400 && res.status < 500 && res.status !== 429) {
    throw new PermanentError(msg);
  }
  throw new Error(msg); // 429, 5xx, timeout -> dicoba ulang
}