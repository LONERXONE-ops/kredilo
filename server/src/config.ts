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

// Database connection for libSQL / Turso.
//   • Production: set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) → connects to Turso cloud.
//   • Local dev (Termux): neither set → a local SQLite file via libSQL (no network, no Turso needed).
// The test suite passes its own { url: ':memory:' } and never reads this.
export const dbConfig: { url: string; authToken?: string } = (() => {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) return { url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() };
  return { url: `file:${config.dbPath}` };
})();

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

// ---- Branded HTML email ----------------------------------------------------
// Every outgoing email is wrapped in a simple, on-brand shell (black header with
// the Kredilo wordmark, an emerald call-to-action button when the message carries
// a link, and a footer with our socials). The plain `text` is still sent as the
// fallback, so nothing breaks in clients that don't render HTML.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ctaLabel(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('verify')) return 'Verify my email';
  if (s.includes('password') || s.includes('reset')) return 'Reset my password';
  if (s.includes('invit')) return 'Accept invitation';
  return 'Open Kredilo';
}

function renderEmail(subject: string, text: string): string {
  // Pull the first stand-alone URL out of the body and turn it into a button.
  let cta = '';
  const bodyLines: string[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!cta && /^https?:\/\/\S+$/.test(t)) { cta = t; continue; }
    bodyLines.push(line);
  }
  const paras = bodyLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">${esc(l)}</p>`)
    .join('');

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;"><tr><td style="border-radius:999px;background:#10B981;">
<a href="${esc(cta)}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${ctaLabel(subject)} &rarr;</a>
</td></tr></table>
<p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">Or paste this link into your browser:<br><a href="${esc(cta)}" style="color:#059669;word-break:break-all;">${esc(cta)}</a></p>`
    : '';

  return `<!doctype html><html><body style="margin:0;padding:0;background:#0A0A0A;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0A0A0A;padding:22px 28px;">
<span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:1px;color:#ffffff;">KREDIL<span style="color:#10B981;">O</span></span>
</td></tr>
<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;">${paras}${button}</td></tr>
<tr><td style="padding:20px 28px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Complete tasks. Play games. Get paid. 🇳🇬</p>
<p style="margin:0;font-size:12px;color:#9ca3af;">
<a href="https://x.com/krediloofficial" style="color:#059669;text-decoration:none;">X</a> &nbsp;&middot;&nbsp;
<a href="https://www.instagram.com/kredilo" style="color:#059669;text-decoration:none;">Instagram</a> &nbsp;&middot;&nbsp;
<a href="https://www.tiktok.com/@kredilo.ng" style="color:#059669;text-decoration:none;">TikTok</a> &nbsp;&middot;&nbsp;
<a href="https://www.facebook.com/share/19dcSW3C1g/" style="color:#059669;text-decoration:none;">Facebook</a>
</p>
<p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">You received this email because you have a Kredilo account.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

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
      body: JSON.stringify({ from, to: m.to, subject: m.subject, text: m.text, html: renderEmail(m.subject, m.text) }),
    })
      .then(async (res) => {
        if (!res.ok) console.error(`[mail] resend ${res.status}: ${await res.text()}`);
      })
      .catch((e) => console.error('[mail] resend error', e));
  };
}
