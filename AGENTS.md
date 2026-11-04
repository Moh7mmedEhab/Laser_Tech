# AGENTS.md

## Commands

- `npm run dev` — dev server.
- `npm run build` — **this is the typecheck**: `tsc -b && vite build`. There is no separate typecheck script.
- `npm run lint` — oxlint only (no eslint/prettier installed).
- Verification order: `npm run lint` then `npm run build`. Both must pass before committing.

## Toolchain gotchas

- **TypeScript 7**: tsconfig cannot use `baseUrl` and rejects non-relative paths in `include`. Path alias is `"@/*": ["./src/*"]` in `tsconfig.app.json` and mirrored in `vite.config.ts`.
- The root `utils/` and `config/` folders are **not** under `@/`; import from pages with relative paths (`../../../utils/format`).
- **Tailwind v4** — no `tailwind.config.js`. All design tokens (colors, radius, shadows from the brand brief) are CSS vars in the `@theme` block of `src/index.css`. Use token classes (`bg-primary`, `text-muted`, `border-line`, `bg-warning-bg`, `rounded-card`, `shadow-card`), not raw hex values.
- **Recharts 3**: `Tooltip formatter` receives `ValueType | undefined`, and `ValueType` is not exported from the package root — type the param as `unknown`.
- The Recharts-heavy `StatsPage` is lazy-loaded in `src/App.tsx` to keep the main chunk small. Keep chart imports out of eagerly-loaded modules.
- **react-router v8** with `BrowserRouter`/`Routes` in `src/App.tsx`; pages render inside `AppLayout` via `<Outlet/>` (except `/login`, which is standalone).

## Conventions specific to this project

- Frontend-only with mock data. All entities live typed in `src/data/` (products, bills, users, notes, stats). A backend API will replace them later — do not invent API calls or env variables.
- Products with `quantity < LOW_STOCK_THRESHOLD` (`src/data/types.ts`) get the warning row highlight — changing that rule means changing the Products table and the form hint together.
- oxlint `purity`/`set-state-in-effect` rules are kept quiet by design: form drafts are created in event handlers via `emptyProduct()`/`emptyBill()`-style helpers (see pages), not `new Date()` inside `useState` defaults; modals mount conditionally from parents (`{formOpen && editing && ...}`).
- Money is formatted with `formatEGP` (EGP currency) from root `utils/format.ts`.
- `App.css` does not exist despite the scaffold — styles are Tailwind utility classes only.

## Project status files

- `PROGRESS.md`, `PROJECT_MAP.md`, `SKILLS.md` track work state per the user's project-standards skill; `tests/unit|integration|security/` are intentional placeholders (no test runner installed yet — don't invent test commands, and don't delete the folders).
- Commit messages: conventional `feat:`, `fix:`, `chore:`, `docs:` style.
