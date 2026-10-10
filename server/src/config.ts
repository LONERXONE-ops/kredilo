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
};

export type AppOptions = {
  ownerEmail: string;
  appOrigin: string;
  allowedOrigins: string[];
  isProd: boolean;
  sendMail: (mail: { to: string; subject: string; text: string }) => void;
};

export const defaultMail: AppOptions['sendMail'] = (m) => {
  // No email provider is connected yet. In development the message is printed here.
  console.log(`\n[mail] to: ${m.to}\n[mail] subject: ${m.subject}\n${m.text}\n`);
};
