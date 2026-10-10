import { createApp } from './app.ts';
import { config, defaultMail } from './config.ts';
import { openDb } from './db.ts';

const db = openDb(config.dbPath);
const server = createApp(db, { ...config, sendMail: defaultMail });

// Listen on this device only. The website reaches it through the dev proxy.
server.listen(config.port, '127.0.0.1', () => {
  console.log(`Kredilo API running on http://127.0.0.1:${config.port}`);
  if (!config.ownerEmail) console.log('Note: OWNER_EMAIL is not set, so nobody can become owner yet.');
});
