# AGENTS.md

## Commands

- Frontend: `npm run dev:frontend`, build via root `npm run build` (runs both workspaces; frontend build is `tsc -b && vite build` — it IS the frontend typecheck).
- Backend (`@laser/backend`): `npm run dev:backend`; `npm run build -w apps/backend` (`tsc -p tsconfig.json`); `npm run lint -w apps/backend` (oxlint); tests `npm run test:{unit,integration,security} -w apps/backend` (vitest + supertest against the Neon **backend-test** branch — never production).
- Seed/reset the main admin: `npm run seed -w apps/backend` — defaults come from `ADMIN_*` vars in `apps/backend/.env` (edit the password there, re-run, log in; CLI flags still override).
- Verification order: lint then build (both workspaces). Both must pass before committing.

## Toolchain gotchas

- **TypeScript 7**: tsconfig cannot use `baseUrl` and rejects non-relative paths in `include`. Path alias is `"@/*": ["./src/*"]` in `tsconfig.app.json` and mirrored in `vite.config.ts`.
- The root `utils/` and `config/` folders are **not** under `@/`; import from pages with relative paths (`../../../utils/format`).
- **Tailwind v4** — no `tailwind.config.js`. All design tokens (colors, radius, shadows from the brand brief) are CSS vars in the `@theme` block of `src/index.css`. Use token classes (`bg-primary`, `text-muted`, `border-line`, `bg-warning-bg`, `rounded-card`, `shadow-card`), not raw hex values.
- **Recharts 3**: `Tooltip formatter` receives `ValueType | undefined`, and `ValueType` is not exported from the package root — type the param as `unknown`.
- The Recharts-heavy `StatsPage` is lazy-loaded in `src/App.tsx` to keep the main chunk small. Keep chart imports out of eagerly-loaded modules.
- **react-router v8** with `BrowserRouter`/`Routes` in `src/App.tsx`; pages render inside `AppLayout` via `<Outlet/>` (except `/login`, which is standalone).

- **Backend ESM (module nodenext)**: relative imports MUST end in `.js` (e.g. `from './auth.constants.js'`) or `tsc` fails with TS2835/TS2307.
- **Prisma 7**: no `url` in `schema.prisma`; connections come from `prisma.config.ts` (CLI, `DIRECT_URL`) and the `@prisma/adapter-pg` pool in `src/config/db.ts`. After schema changes: `prisma migrate dev` (dev branch via `.env`), `DIRECT_URL=<test-branch direct url> prisma migrate deploy` for the test branch.
- **Neon pool notes**: `idleTimeoutMillis` (240s) sits below Neon's 5-min idle suspend; interactive `$transaction` calls pass explicit `timeout`/`maxWait` because the 5s default aborts during compute cold starts; single-statement repo reads are wrapped in `withRetry` (`src/lib/db-retry.ts`) — never wrap `$transaction` callbacks with it.
- **Prisma Decimal columns** (price/amount/unitPrice) are converted to plain numbers at the service edge; never return raw Decimal JSON.

## Conventions specific to this project

- Frontend-first: entities live typed in `apps/frontend/src/data/` (products, bills, users, notes, stats). The backend now exists at `apps/backend` (`/api/v1/...`); the frontend still uses mocks until wiring.
- Backend module shape per feature: `<module>.{constants,types,validation,repository,service,controller,routes,errors}.ts` under `src/modules/<name>/`; services own the business rules, controllers only parse/respond, repos only talk to Prisma. Role gates: `requireAuth` + `requireRole('ADMIN'[, 'EMPLOYEE'])`.
- Sessions: opaque token in cookie `lt_session` (httpOnly), sha256 hash in DB; `Session` + `LoginHistory` rows created together; password change revokes all other sessions.
- Bills: stock is consumed by `consumeStock()` inside a Prisma interactive transaction (conditional decrement), so oversell gets a 409 and full rollback; edits and deletes restock.
- Products with `quantity < LOW_STOCK_THRESHOLD` (`src/data/types.ts`) get the warning row highlight — changing that rule means changing the Products table and the form hint together.
- oxlint `purity`/`set-state-in-effect` rules are kept quiet by design: form drafts are created in event handlers via `emptyProduct()`/`emptyBill()`-style helpers (see pages), not `new Date()` inside `useState` defaults; modals mount conditionally from parents (`{formOpen && editing && ...}`).
- Money is formatted with `formatEGP` (EGP currency) from root `utils/format.ts`.
- `App.css` does not exist despite the scaffold — styles are Tailwind utility classes only.

## Project status files

- `PROGRESS.md`, `PROJECT_MAP.md`, `SKILLS.md` track work state per the user's project-standards skill; `apps/frontend/tests/unit|integration|security/` are intentional placeholders (no frontend test runner installed yet — don't delete the folders). Backend tests use vitest (`apps/backend/tests/` + `vitest.config.ts`).
- Commit messages: conventional `feat:`, `fix:`, `chore:`, `docs:` style.
