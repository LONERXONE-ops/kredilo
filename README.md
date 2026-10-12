# Kredilo

A Nigeria-first task-to-earn platform. Users complete simple tasks, surveys, social actions and browser games to earn **kreds**, then withdraw them as Naira once their balance passes the minimum and withdrawals are open.

This is a full-stack application: a React frontend and a dependency-free Node backend with its own SQLite database, real authentication, an append-only token ledger, and an admin console.

## Features

- Email/password auth with email verification, password reset and account recovery
- Task marketplace with image-forward task cards, proof submission (screenshot / link / text) and admin review
- **Post a Task** — users pay to have other users complete a task, with admin payment confirmation
- Wallet with kreds balance, Naira value, transaction history and withdrawal requests (encrypted bank details)
- Daily **games** that pay kreds — Snake, Memory Match, Reaction Test, Trivia Quiz (server-capped per day)
- **Referrals** — invite via a code, earn kreds when an invited user completes their first task
- **Follow gate** — optional onboarding step that rewards following Kredilo's social accounts
- In-app notifications for approvals, rejections and updates
- Admin console — overview, tasks, submissions, payments, withdrawals, users, funding, ledger, audit, fraud, team
- Role-based access (owner / reviewer / support / user)

## Tech stack

**Frontend:** Vite + React 19 + TypeScript, React Router 7, Tailwind CSS v4, Lucide icons.

**Backend:** Node (native TypeScript, no build step) using only the standard library — `node:http` and `node:sqlite`. No external runtime dependencies. Passwords hashed with scrypt; sessions via signed cookies; bank details encrypted at rest; images via Cloudinary signed delivery; email via Resend over `fetch`.

## Money model

All balances live in two append-only tables — a per-user `ledger` and a shared `reserve` that funds rewards. Nothing is ever edited or deleted; corrections are new opposite rows. Rewards are issued from the reserve atomically and idempotently, so a completion can never pay twice.

- 100 kreds = ₦50
- Minimum withdrawal = 2,000 kreds (₦1,000)

Rewards only pay out while the reserve has funds — top it up in **Admin → Funding**.

## Project structure

```
/            React frontend (src/)
/server      Node backend (server/src/), SQLite migrations (server/migrations/)
```

## Setup

### Frontend

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

### Backend

```bash
cd server
cp .env.example .env   # then fill in the values below
npm run dev            # node --watch src/index.ts
npm start              # node src/index.ts
npm test               # node --test
```

Requires a recent Node (24.x) for native TypeScript and `node:sqlite`.

## Environment (server/.env)

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port |
| `DB_PATH` | SQLite file path |
| `OWNER_EMAIL` | Bootstraps the first owner account on verification |
| `APP_ORIGIN` | Public site URL (used in email links) |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API |
| `NODE_ENV` | `production` in prod (enables secure cookies) |
| `DATA_KEY` | Secret key for encrypting bank details at rest |
| `RESEND_API_KEY` | Resend key for sending email |
| `MAIL_FROM` | From address for outgoing email |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image storage & signed delivery |
| `UPLOAD_DIR` | Local fallback upload directory |
| `PAY_BANK` / `PAY_ACCOUNT_NAME` / `PAY_ACCOUNT_NUMBER` | Payment details shown to users paying for a posted task |

**Never commit `server/.env`.** Secrets stay local and in the host's environment settings only.

## Database

Schema is managed by numbered SQL migrations in `server/migrations/`, applied in order and tracked in `schema_migrations`. To add a change, create the next numbered file — never edit an applied one.
