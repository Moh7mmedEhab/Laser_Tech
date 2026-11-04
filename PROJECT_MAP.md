# Project Map

```
+----------+------------------------------------------------------+
| Sidebar  |  Topbar (search Ctrl+K, settings, bell, profile)      |
| 260px    +------------------------------------------------------+
|          |  Page content                                         |
+----------+------------------------------------------------------+
```

| Path | Purpose |
|---|---|
| `index.html` | Entry HTML; loads Inter font |
| `vite.config.ts` | Vite + React + Tailwind v4 plugins; `@` alias to `src` |
| `tsconfig*.json` | TS 7 project refs (`app` covers src, utils, config) |
| `src/main.tsx` | React root; mounts `App` inside `BrowserRouter` |
| `src/App.tsx` | Route table; lazy-loads StatsPage (Recharts bundle split) |
| `src/index.css` | Tailwind v4 `@theme` design tokens from the brand brief (`details.json`) |
| `src/assets/logo.svg` | Brand logo (from Brand Info.zip) |
| `src/components/layout/` | `AppLayout`, `Sidebar`, `Topbar`, `SearchModal` (Ctrl+K palette) |
| `src/components/stats/` | `CategoryDonut`, `WeeklyBillsBar` charts |
| `src/components/ui/` | `Modal`, `Drawer`, `Form` (Button/Input/Select/StatusPill), `ConfirmDialog`, `Pagination` |
| `src/pages/` | Route barrel files exporting from `src/pages/<route>/` folders |
| `src/pages/products/` | Products table + search + low-stock rows; `ProductModal`, `ProductActionsMenu` |
| `src/pages/bills/` | Bills table + search + status filter; `BillDrawer` (create/edit), view modal |
| `src/pages/users/` | Users table with avatars/roles, active toggle; `UserModal` |
| `src/pages/notes/` | Daily notes card grid; `NoteModal` |
| `src/pages/StatsPage.tsx` | Statistics: 4 stat cards, revenue area, donut, weekly bars |
| `src/pages/SettingsPage.tsx` | Profile name/email + avatar upload; password change |
| `src/pages/LoginPage.tsx` | Standalone centered login card |
| `src/data/` | Typed mock data: `types`, `products`, `bills`, `users` (+notes), `stats`; `LOW_STOCK_THRESHOLD` |
| `utils/format.ts` | `formatEGP`, `formatDate`, `todayISO` (plain helpers, no framework imports) |
| `config/` | Reserved (empty until backend config is added) |
| `tests/unit` `tests/integration` `tests/security` | Reserved placeholders; no test runner installed yet |

### `apps/backend/`

Monorepo workspace, npm scripts via root `package.json` (`dev:backend`, `build -w apps/backend`).

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | User (roles ADMIN/USER/EMPLOYEE), Session, LoginHistory, Product, Bill, BillItem, Note |
| `prisma/migrations/` | `init` migration, applied to both Neon branches |
| `prisma.config.ts` | Prisma 7 config; migrations use the DIRECT (unpooled) URL |
| `src/config/` | `env.ts` (Zod-validated), `db.ts` (PrismaClient + pg adapter pool) |
| `src/lib/` | `app.ts` (assembly), `server.ts` (HTTP+Socket.IO), `session.ts` (opaque tokens), `rate-limit.ts`, `events.ts` (domain bus), `prisma-errors.ts`, `db-retry.ts` |
| `src/errors/`, `src/middlewares/` | `AppError` factories; ZodError→422, AppError→status; `requireAuth`/`requireRole` |
| `src/modules/<name>/` | Per module: constants/types/validation/repository/service/controller/routes |
| `scripts/seed.ts` | First-admin seeder (idempotent upsert) |
| `tests/` | `unit/` (10), `integration/` (13), `security/` (10) — vitest + supertest on the Neon backend-test branch |
| `.env` / `.env.test` | Neon pooled+direct URLs, CORS_ORIGINS, COOKIE_SECRET (gitignored) |

Design source of truth: `Brand Info.zip` at `~/Programming/` — theme colors, typography, layout contract.
