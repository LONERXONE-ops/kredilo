# Kredilo Frontend

Task-to-earn platform frontend for Nigerian users.

## Features

- Responsive public pages matching design references
- Authentication flows (login, signup, password reset, recovery)
- User dashboard with tasks, wallet, notifications, profile
- Playable games: Snake, Memory Match, Reaction Test, Trivia Quiz
- Admin dashboard skeleton
- Legal and support pages
- Mock data clearly labelled as demo

## Tech Stack

- Vite + React 19 + TypeScript
- React Router
- Tailwind CSS v4
- Lucide icons

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Backend Integration Notes

This is a frontend-only implementation. All data is mock/demo.

Required backend endpoints (to be implemented):

- Auth: POST /auth/login, /auth/signup, /auth/forgot-password, /auth/reset
- Tasks: GET /tasks, GET /tasks/:id, POST /tasks/:id/submit
- Games: POST /games/:type/complete (validate score/eligibility server-side)
- Wallet: GET /wallet, POST /withdrawals
- Notifications, Profile, Admin routes with proper authorization

Provisional config (src/lib/config.ts):
- 10 tokens = ₦1
- Minimum withdrawal = 10,000 tokens (₦1,000)

Do not treat demo balances as real withdrawable funds.

## Demo Mode

All financial figures, task completions, and withdrawals are simulated. No real payments or external sponsors are connected.
