import { createApp } from './app.ts';
import { config, makeMailer } from './config.ts';
import { openDb } from './db.ts';
import { sweepExpiredPosts } from './posts.ts';

const db = openDb(config.dbPath);
const server = createApp(db, { ...config, sendMail: makeMailer() });

// Remove posted tasks whose paid run has ended — once at startup, then hourly.
const sweep = () => {
  try {
    const n = sweepExpiredPosts(db);
    if (n > 0) console.log(`[sweep] removed ${n} expired posted task(s)`);
  } catch (e) {
    console.error('[sweep] error', e);
  }
};
sweep();
setInterval(sweep, 60 * 60 * 1000).unref();

// Listen on this device only. The website reaches it through the dev proxy.
server.listen(config.port, '127.0.0.1', () => {
  console.log(`Kredilo API running on http://127.0.0.1:${config.port}`);
  if (!config.ownerEmail) console.log('Note: OWNER_EMAIL is not set, so nobody can become owner yet.');
});
