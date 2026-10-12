import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const list = (v: string | undefined, fallback: string) =>
  (v ?? fallback).split(',').map((s) => s.trim()).filter(Boolean);

export const config = {
  port: Number(process.env.PORT ?? 8787),
  dbPath: process.env.DB_PATH ?? path.join(root, 'data', 'kredilo.db'),
  ownerEmail: (process.env.OWNER_EMAIL ?? '').trim().toLowerCase(),
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
  allowedOrigins: list(process.env.ALLOWED_ORIGINS, 'http://localhost:5173,http://127.0.0.1:5173'),
  isProd: process.env.NODE_ENV === 'production',
  supportEmail: (process.env.SUPPORT_EMAIL ?? 'krediloonline@gmail.com').trim(),
};

export type AppOptions = {
  ownerEmail: string;
  appOrigin: string;
  allowedOrigins: string[];
  isProd: boolean;
  supportEmail: string;
  sendMail: (mail: { to: string; subject: string; text: string }) => void;
};

export const defaultMail: AppOptions['sendMail'] = (m) => {
  // No email provider is connected yet. In development the message is printed here.
  console.log(`\n[mail] to: ${m.to}\n[mail] subject: ${m.subject}\n${m.text}\n`);
};

// Sends real email through Resend when RESEND_API_KEY is set; otherwise falls back to console.
// Fire-and-forget: callers don't await it, so a slow/failed send never blocks a request.
export function makeMailer(): AppOptions['sendMail'] {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? 'Kredilo <onboarding@resend.dev>';
  if (!key) return defaultMail;
  return (m) => {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: m.to, subject: m.subject, text: m.text }),
    })
      .then(async (res) => {
        if (!res.ok) console.error(`[mail] resend ${res.status}: ${await res.text()}`);
      })
      .catch((e) => console.error('[mail] resend error', e));
  };
}
