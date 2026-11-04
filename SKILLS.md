# Skills

Recommended skills and tools for working on this project. Skills live in the project's `skills/` directory (installed from their GitHub sources). Activated skills appear in the session as `<skill_content>` blocks; most are invoked explicitly or auto-applied per the triggers below.

## Auto Skill Pack — installed in `skills/` (2026-11-04)

All pack skills were downloaded from their GitHub sources into `skills/`. Every folder contains its original `SKILL.md`.

| # | Skill (folder) | Source | Use for |
|---|---|---|---|
| 1 | `grill-me` | RobMitt/grill-me-skill | Relentless requirements interview until shared understanding |
| 2 | `taste` | Leonxlnx/taste-skill (subfolder `skills/taste-skill`) | Design taste: art direction, references, tokens, real browser check |
| 3 | *(see note)* superpowers | obra/superpowers | Parent framework repo — no standalone SKILL.md; install source for #4–13 |
| 4 | `brainstorming` | obra/superpowers | Ideate before building |
| 5 | `writing-plans` | obra/superpowers | Structured feature plans |
| 6 | `executing-plans` | obra/superpowers | Implement plans step by step |
| 7 | `test-driven-development` | obra/superpowers | Test-first workflow (red, green, refactor) |
| 8 | `systematic-debugging` | obra/superpowers | Reproduce, hypothesize, verify |
| 9 | `requesting-code-review` | obra/superpowers | Peer-review protocol |
| 10 | *(see note)* root-cause-tracing | — | Does not exist in obra/superpowers; its workflow is covered by `systematic-debugging` |
| 11 | `verification-before-completion` | obra/superpowers | Prove work is done, not assumed |
| 12 | `using-git-worktrees` | obra/superpowers | Isolate risky changes in git |
| 13 | `subagent-driven-development` | obra/superpowers | Parallelize large work |
| 14 | `write-prd` | max4c/skills | Product requirements documents |
| 15 | `tdd` | max4c/skills | TDD discipline |
| 16 | `audit-safety` | Melvynx/ai-maxxing-skills | Safety and security audit |
| 17 | `skill-creator` | anthropics/skills | Build custom skills |
| 18 | `frontend-design` | anthropics/skills | Polished frontend UI work |
| 19 | `webapp-testing` | anthropics/skills | Testing web apps |
| 20 | `mcp-server-generation` | anthropics/skills (folder `mcp-builder`) | Generate MCP servers |
| 21 | `docx` | anthropics/skills | Word reports |
| 22 | `pdf` | anthropics/skills | PDF reports |
| 23 | `xlsx` | anthropics/skills | Spreadsheet reports |
| 24 | `pptx` | anthropics/skills | Slide reports |

Notes:
- Skill 3 (`superpowers`) is a framework repo, not a single skill — skills 4–13 came from its `skills/` subfolder.
- Skill 10 (`root-cause-tracing`) is listed in the standards table but does not exist upstream; use `systematic-debugging` for root-cause work.
- Skill 20's upstream folder is named `mcp-builder`; it is installed here as `mcp-server-generation` to match the standards table.

## Auto-activation triggers (from project-standards)

| Task | Apply |
|---|---|
| New UI / design work | `taste` + `frontend-design` |
| Debug / fix | `systematic-debugging` |
| Scan / audit / review | `audit-safety`, `requesting-code-review` |
| Tests / QA | `test-driven-development`, `webapp-testing` |
| Reports | `verification-before-completion` + `docx`/`pdf`/`xlsx`/`pptx` |
| Planning new features | `grill-me` → `brainstorming` → `writing-plans`/`write-prd` → `executing-plans` |
| Large shipping work | `subagent-driven-development` |
| Neon backend / database / auth / AI gateway work | Neon skills (`.agents/skills/`) |

## Usage history

- **grill-me** — used in planning for this project's frontend (stack, taste, CRUD shape, currency, login flavor confirmed with the user)
- **taste / frontend-design** (method applied inline before install) — design tokens from `Brand Info.zip`, reference-quality density, browser screenshot review
- **writing-plans / executing-plans** — plan approved, executed one commit per feature
- **verification-before-completion** (method applied inline) — lint + typecheck/build + headless Playwright route pass with zero console errors

## Neon skills (`.agents/skills/`, installed via `npx neon skills -y`, 2026-11-04)

OpenCode-managed skills from `neondatabase/agent-skills`, hash-locked in `skills-lock.json`. Relevant to this project's planned backend-next phase:

- `neon` — entry point: Neon cloud backend primitives (Lakebase Postgres branch-first workflow), CLI/MCP setup
- `neon-postgres` — connections, pooled vs direct, schema migrations, branching, autoscaling; wins for existing DATABASE_URL/SQL/schema work
- `neon-auth` — authentication (Managed Better Auth): login, sessions, OAuth, OTP; fits the previously stubbed `/login` page
- `neon-realtime` — live SQL queries for reactive dashboards (candidate for the Statistics page later)
- `neon-object-storage` — S3-compatible storage that branches with the DB (product images, profile photos)
- `neon-functions` — long-running serverless Node functions with DATABASE_URL injected
- `neon-ai-gateway` — one credential for frontier/open-source LLMs on your Neon branch

These activate directly in OpenCode sessions (unlike the manual `skills/` library above). `skills-lock.json` must be kept so re-running `npx neon skills` reproduces the same versions.

## Manual tooling used in this project

- Node 22, npm, Vite 8, TypeScript 7, Tailwind v4, Recharts 3, react-router 8, lucide-react, oxlint
- Playwright (headless Chromium) for the browser smoke test — installed ad hoc in `/tmp/opencode`, not a project dependency
