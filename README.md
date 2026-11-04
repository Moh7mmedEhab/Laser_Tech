# Laser Tech

Frontend-only admin dashboard for Laser Tech, built from the brand brief in `Brand Info.zip` (theme tokens, layout, sidebar/topbar contract) and the reference dashboard aesthetic. A backend API will replace the mock data layer later.

## Technologies Used

- React 19 + Vite 7
- TypeScript
- Tailwind CSS v4
- React Router 7
- Recharts (statistic graphs)
- lucide-react (icon set matching the brief's icon names)

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
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview production build
```

## Notes

- All data is mocked in `src/data/` with plausible laser-business content; typed to make the future API contract easy to map.
- Currency formatted as EGP via `Intl.NumberFormat`.
- Light mode only, no RTL in this pass.
