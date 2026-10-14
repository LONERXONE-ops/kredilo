# Kredilo deploy — Render + Turso

The backend now talks to **libSQL/Turso** instead of a local SQLite file, so it can
run on Render's free tier (which has no persistent disk). Same code drives three modes:

| Where | How it connects |
|-------|-----------------|
| Termux (dev) | local file `server/data/kredilo.db` via libSQL — no Turso, no network |
| Tests | in-memory libSQL (`:memory:`) |
| Render (prod) | Turso cloud, via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |

It picks the mode purely from env vars — no code change between them.

---

## Step 0 — land the rewrite and prove it (do this first)

```
cd ~/kredilo/server
bash apply-turso.sh      # writes the files, runs: npm install + npm test
```

`apply-turso.sh` ends by running the full test suite against in-memory libSQL.
**Everything must pass (71 tests) before going further.** If anything fails, paste
me the output — we fix it before touching Turso or Render.

Then start it locally the usual way to smoke-test:

```
npm start                # still works offline, on the local file DB
```

Commit once green.

---

## Step 1 — create the Turso database

1. Install the Turso CLI (or use the web dashboard at app.turso.tech).
   - `curl -sSfL https://get.tur.so/install.sh | bash`  (if the Termux shell allows it)
   - or sign up at **app.turso.tech** and do it in the browser.
2. Sign up / log in: `turso auth signup`
3. Create the DB:  `turso db create kredilo`
4. Get the URL:    `turso db show kredilo --url`      → `libsql://kredilo-<you>.turso.io`
5. Make a token:   `turso db tokens create kredilo`   → a long token string

Keep both. Free tier gives 500 DBs and ~5 GB — far more than we need.

Migrations run automatically on first boot (the server creates every table in the
fresh Turso DB), so there's nothing to import.

---

## Step 2 — deploy the backend to Render

1. render.com → **New → Web Service** → connect the `LONERXONE-ops/kredilo` repo.
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
3. **Environment variables** (Render dashboard → Environment):

   | Key | Value |
   |-----|-------|
   | `NODE_VERSION` | `22.18.0` |
   | `NODE_ENV` | `production` |
   | `TURSO_DATABASE_URL` | the `libsql://…` url from Step 1 |
   | `TURSO_AUTH_TOKEN` | the token from Step 1 |
   | `OWNER_EMAIL` | your owner email (so you get owner on verify) |
   | `APP_ORIGIN` | `https://kredilo.com.ng` |
   | `ALLOWED_ORIGINS` | `https://kredilo.com.ng` |
   | `RESEND_API_KEY` | your Resend key |
   | `MAIL_FROM` | `Kredilo <no-reply@kredilo.com.ng>` (after domain verify) |
   | `SUPPORT_EMAIL` | `krediloonline@gmail.com` |
   | `PAY_BANK` | `Kuda` |
   | `PAY_ACCOUNT_NAME` | `Tanimola Wisdom` |
   | `PAY_ACCOUNT_NUMBER` | your account number |

   (Never commit these — they live only in Render.)

4. Deploy. Watch the logs for `Kredilo API running on 0.0.0.0:…`.
   Hit `https://<your-service>.onrender.com/api/health` → should return `{"ok":true}`.

> Free Render services sleep after 15 min idle and take ~30–60s to wake on the next
> request. Fine for launch; upgrade later if the cold start annoys users.

---

## Step 3 — the frontend (one more small change I'll make)

The site calls the API with relative `/api/...` paths, so the cleanest setup is to
serve the built frontend **from the same Render service** — one origin, no CORS, and
the login cookie just works. That needs a small addition to the Node server (serve
`dist/` + SPA fallback) and a tweak to the build command to build the frontend too.

**I'll add that once the rewrite tests are green** — I didn't want to bundle untested
serving code on top of the DB rewrite. After it's in, the Render build command becomes
roughly:

```
npm install && npm --prefix .. install && npm --prefix .. run build
```

and the server serves the built site. Then point `kredilo.com.ng` (Whogohost DNS →
a CNAME/A record Render gives you) at the Render service.

---

## Step 4 — Resend domain + go live

1. In Resend, add and verify the domain `kredilo.com.ng` (DNS records in Whogohost).
2. Set `MAIL_FROM` to a `@kredilo.com.ng` sender.
3. Flip the GitHub repo **private** (Settings → Danger Zone) now that it's deployed.
4. Sign up with `OWNER_EMAIL`, verify the email → you become owner → set the exchange
   rate, add funding, open withdrawals.

---

## Rollback / safety notes

- The ledger stays append-only and idempotent exactly as before — the rewrite changed
  *how* queries run (async), not the money rules. The test suite proves this.
- Turso keeps automatic backups; you can also `turso db shell kredilo` to inspect data.
- If a migration ever errors on first deploy, the server won't start and logs will name
  the file — send it to me.
