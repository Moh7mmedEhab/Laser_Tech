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

- Lint (oxlint): clean
- Build/typecheck (`tsc -b && vite build`): clean, bundle code-split (main ~317KB + lazy StatsPage ~419KB)
- Browser smoke test: all routes, zero console/page errors; products search "tube" filters to 3 rows

## Remaining tasks

- Wire frontend to the backend API (replace `src/data/` mocks with the `/api/v1/...` endpoints + socket events)
- Dark mode, RTL (deferred by user)
- Test runner setup (test folders are placeholders)
- Backend: contract tests per endpoint as the frontend wiring proceeds

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
