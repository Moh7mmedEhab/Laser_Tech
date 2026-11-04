# Laser Tech

Admin dashboard for Laser Tech: a React frontend (built from the brand brief in `Brand Info.zip`) plus an Express + Prisma backend API on Neon PostgreSQL. The frontend still renders from typed mock data in `src/data/` and is ready to be wired to the API.

## Technologies Used

- React 19 + Vite 7
- TypeScript
- Tailwind CSS v4
- React Router 7
- Recharts (statistic graphs)
- lucide-react (icon set matching the brief's icon names)

### Backend (`apps/backend`)

- Express 5 + TypeScript (ESM, NodeNext)
- Prisma 7 with the `@prisma/adapter-pg` driver (Neon pooled URL)
- Neon PostgreSQL (branch `production` for dev, branch `backend-test` for integration/security tests)
- Zod validation, helmet, cors, express-rate-limit (global + login limiter)
- Session auth: opaque token in an httpOnly cookie, sha256-hashed server-side, revocable; login history table
- Socket.IO realtime: domain events (bills/products/notes) fan out over the event bus
- Race-safe billing: stock consumed inside a Prisma interactive transaction with conditional decrements; edits/cancels restock

## Layout

```
+----------+------------------------------------------------------+
| Sidebar  |  Topbar (search Ctrl+K, settings, bell, profile)      |
| 260px    +------------------------------------------------------+
|          |  Page content                                         |
| MAIN MENU|                                                       |
| - States |                                                       |
| - Products                                                     |
| - Bills  |                                                       |
| - Users  |                                                       |
| - Daily Notes                                                  |
+----------+------------------------------------------------------+
```

## Design tokens (from details.json)

| Token | Value |
|---|---|
| primary | `#6366F1` |
| primary-light | `#EEF2FF` |
| background | `#F9FAFB` |
| surface | `#FFFFFF` |
| text-primary | `#111827` |
| text-secondary | `#6B7280` |
| border | `#E5E7EB` |
| radius | 12px |
| card shadow | `0 1px 3px 0 rgba(0,0,0,.1), 0 1px 2px 0 rgba(0,0,0,.06)` |

Status colors: success `#059669` / bg `#D1FAE5`, warning `#D97706` / bg `#FEF3C7`, error `#DC2626` / bg `#FEE2E2`.

## Routes

| Route | Screen | Status |
|---|---|---|
| `/` | Statistics: 4 stat cards, revenue area chart, category donut, weekly bills bar | done (mock data) |
| `/products` | Products CRUD, search, low-stock (<10) warning highlight | done (mock data) |
| `/bills` | Bills CRUD + search, drawer forms | done (mock data) |
| `/users` | Users CRUD with avatars and roles | done (mock data) |
| `/daily-notes` | Daily notes CRUD | done (mock data) |
| `/settings` | Profile picture and name change, password change | done (front-end only) |
| `/login` | Centered card login | done (front-end only) |

## Getting Started

```sh
npm install
npm run dev:frontend   # React app on :5173
npm run dev:backend    # Express API on :4000

npm run build          # type-check + build both workspaces
npm run lint           # oxlint (both)
npm run test:integration -w apps/backend  # hits the Neon backend-test branch
```

Backend env: `apps/backend/.env` (dev) and `.env.test` (tests) — see `.env.example`.
Seed the first admin: `npm run seed -w apps/backend -- --username admin --email admin@lasertech.com --phone '+20...' --password 'Str0ngPass!'`

## Notes

- All frontend data is mocked in `src/data/` with plausible laser-business content; typed to make the API contract easy to map.
- Currency formatted as EGP via `Intl.NumberFormat`.
- Light mode only, no RTL in this pass.
