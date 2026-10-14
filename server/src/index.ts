import { createApp } from './app.ts';
import { config, dbConfig, makeMailer } from './config.ts';
import { openDb } from './db.ts';
import { sweepExpiredPosts } from './posts.ts';

const db = await openDb(dbConfig);
const server = createApp(db, { ...config, sendMail: makeMailer() });

// Remove posted tasks whose paid run has ended — once at startup, then hourly.
const sweep = async () => {
  try {
    const n = await sweepExpiredPosts(db);
    if (n > 0) console.log(`[sweep] removed ${n} expired posted task(s)`);
  } catch (e) {
    console.error('[sweep] error', e);
  }
};
void sweep();
setInterval(() => void sweep(), 60 * 60 * 1000).unref();

// In production (Render) listen on all interfaces and the injected PORT; locally bind to this
// device only, since the website reaches the API through the dev proxy.
const host = config.isProd ? '0.0.0.0' : '127.0.0.1';
server.listen(config.port, host, () => {
  console.log(`Kredilo API running on ${host}:${config.port}`);
  if (!config.ownerEmail) console.log('Note: OWNER_EMAIL is not set, so nobody can become owner yet.');
});
