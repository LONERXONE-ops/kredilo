import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ServerResponse } from 'node:http';
import { root } from './config.ts';

// In production one Render service serves BOTH the API and the built frontend,
// so the site and `/api` share an origin (no CORS, the session cookie just
// works). The frontend build lands in <repo>/dist (Vite's default); the server
// lives in <repo>/server, so dist is one level up.
const DIST = path.resolve(root, '..', 'dist');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

// True when a built frontend is present (i.e. in production). In local dev the
// frontend is served by Vite, so this is false and the server stays API-only.
export const hasFrontend = () => existsSync(path.join(DIST, 'index.html'));

// Serve a static file from the build, with SPA fallback: a path with no file
// extension (a client route like /dashboard) returns index.html so React Router
// can take over. Returns true when it wrote a response. GET only; the caller
// must already have excluded /api/* paths.
export function serveStatic(pathname: string, res: ServerResponse): boolean {
  if (!hasFrontend()) return false;

  const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  let filePath = path.resolve(DIST, rel);
  // Traversal guard: the resolved path must stay inside DIST.
  if (filePath !== DIST && !filePath.startsWith(DIST + path.sep)) return false;

  let isFile = existsSync(filePath) && statSync(filePath).isFile();
  if (!isFile) {
    // A missing asset (has an extension) should 404; a missing route falls back to the SPA shell.
    if (path.extname(rel)) return false;
    filePath = path.join(DIST, 'index.html');
    isFile = existsSync(filePath);
    if (!isFile) return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const body = readFileSync(filePath);
  // Vite fingerprints asset filenames, so they can cache forever; HTML must not.
  const cache = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
  return true;
}
