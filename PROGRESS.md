# Progress

## Final Goal

Build the Laser Tech admin dashboard frontend: statistics home with graphs, full CRUD screens for Products (with low-stock highlighting), Bills, Users, Daily Notes, Settings, and a themed login page, all on the brand design system from `Brand Info.zip`, mock-data driven, ready to be wired to a future backend API.

## Todos

- [x] Scaffold Vite + React + TypeScript + Tailwind v4 project
- [x] Design tokens mapped from details.json
- [x] App shell: sidebar, topbar (Ctrl+K search, settings, bell badge, profile dropdown), router setup
- [x] Statistics page: stat cards + revenue chart + category donut + weekly bills bar
- [x] Products page: CRUD, search, low-stock (<10) warning highlight
- [x] Bills page: CRUD + search, drawer forms
- [x] Users page: CRUD with avatars and roles
- [x] Daily Notes page: CRUD
- [x] Settings page: profile picture and name change, password change
- [x] Login page: centered card
- [x] Runtime smoke test: all 7 routes render with zero console errors (Playwright headless, screenshots reviewed)

## Done

- Git repo initialized, project markdown files created
- App shell + Statistics page (charts) — commit `feat:` app shell
- All CRUD pages, Settings and Login pages
- AGENTS.md with build/toolchain/convention notes

## Tests done

- Lint (oxlint): clean (frontend + backend)
- Build/typecheck (`tsc -b && vite build`): clean, bundle code-split (main ~326KB + lazy StatsPage ~420KB)
- Live smoke test (frontend + backend dev servers): login → session cookie → `PATCH /auth/me`, product create/patch/delete via API, Socket.IO `product:changed` received by a cookie-authed client (update + delete), Vite proxy serves `/api` and `/socket.io` same-origin
- Round 2 smoke: `user:changed` over a live socket, server-side filters (`search/category/lowStock/price range/date range` products, `search/user/admin/amount range/date range/sort` bills, `sort/role/date range` users, notes date range), sessions + login-history endpoints, 33 tests green

## Remaining tasks

- Realtime fixes done: users now emit `user:changed` (was the only silent module); frontend invalidates `userStore` on it
- [x] New: server-side filters + sort/order (products: category/lowStock/price+/date range; bills: user/admin/amount range/date range; users: role/date range; notes: date range), `order` override on all sorts
- [x] New: bill print tab `/bills/:id/print` with auto print dialog
- [x] New: Settings — active devices (`GET/DELETE /auth/sessions`) + login history card
- [x] New: password-confirmed user delete with cascade (owned bills deleted + stock returned; subject notes removed; issued bills/authored notes repoint to the deleting admin); `DELETE /users/:id` now requires `{ password }`
- [x] New: admin credentials live in `ADMIN_*` vars of `apps/backend/.env`; `npm run seed -w apps/backend` resets the admin to match (used for login any time)
- Dark mode, RTL (deferred by user)
- Test runner setup for frontend (test folders are placeholders)
- Browser-level smoke test of every page (node-level API flow + socket verified)

## Backend progress (apps/backend)

- [x] Workspace split (npm workspaces), Express 5 + Prisma 7 + Neon scaffold
- [x] Prisma schema + init migration applied (production + backend-test branches)
- [x] Auth module: login (username/email), bcrypt, revocable sessions, login history, change password
- [x] Users module: admin CRUD, last-admin/self-delete guards, Prisma error mapping
- [x] Products module: CRUD, categories, low-stock filter, employee write guards
- [x] Bills module: race-safe atomic stock consumption, restock on edit/cancel
- [x] Notes module: subject scoping, author-only editing for employees
- [x] Socket.IO realtime over domain event bus
- [x] Seed script for the first admin + graceful shutdown entry point
- [x] Live smoke test against Neon dev: auth/products/bills/notes flows verified
- [x] Tests: 10 unit + 13 integration + 10 security (vitest, Neon backend-test branch)
- [x] Pool hardening: idle/connect budgets + transient-socket retry layer
