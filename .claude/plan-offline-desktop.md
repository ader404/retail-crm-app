# Retail CRM Desktop/Offline Edition — Analysis & Implementation Plan

## Security note (unrelated to this task, found during analysis)

`.env.example` currently contains a **real-looking Neon Postgres connection string** (with password) and a **real 128-char JWT secret**, not placeholder values. This file is presumably tracked in git. Recommend rotating both credentials and replacing them with placeholders, independent of the desktop work. Flagging now so it isn't lost.

## Scope confirmation

- Online version (`retail-crm/`) stays completely untouched. All new work happens in a sibling folder `retail-crm-desktop/`.
- This plan phase only: analyze, design, produce `OFFLINE-DESKTOP-TODO.md` inside the new folder, and get sign-off. No large-scale coding yet, per your instructions.

## What already exists that we build on

- `desktop-app/` — Electron 28 + electron-builder skeleton, NSIS target, currently just a remote-URL wrapper (`loadURL('https://aderuix.com/pos')`). Its own README already lists "offline mode with local database" as a wishlist item, so this fork is the natural continuation.
- Prisma schema is unusually clean for a Postgres→MySQL port: no array columns, no `dbgenerated()`, no full-text search, no Postgres-only functions. Only **one** raw SQL query in the whole backend (`dashboard.service.ts`, low-stock query) uses Postgres double-quoted identifiers — that's the only real SQL-dialect blocker.
- Auth already uses `bcryptjs` (pure JS, no native module — good, avoids Electron rebuild pain), Bearer-JWT (no cookies), and a `ThrottlerModule` + custom login rate-limiter. All portable as-is.
- Frontend is a pure SPA-over-REST Next.js 14 app (no SSR DB coupling) — good, means backend can stay a separate local process and frontend just points at it.

## Key architectural decisions to lock in before building

1. **How the frontend is served inside Electron.** Two options:
   - (a) `next build && next export`-style static output, served via `loadFile`/a tiny static server — simplest, but only works if nothing in the frontend needs Next SSR features.
   - (b) Bundle a local Next.js server (`next start`) as a child process alongside the NestJS backend — more faithful to current behavior, slightly more moving parts to manage/ports to allocate.
   I'll check for SSR-dependent pages during Phase 5 investigation and recommend one, but wanted to flag this now since it changes how `desktop-app/main.js` is structured.

2. **Local backend port binding.** Recommend binding explicitly to `127.0.0.1` (not the current implicit all-interfaces default) and picking a fixed or dynamically-allocated local port that Electron passes to both the backend process and the frontend's baked-in `NEXT_PUBLIC_API_URL`.

3. **License API hosting.** Requirement #6 asks for a separate online License API backed by Neon. This is new infrastructure (not part of `retail-crm` or `retail-crm-desktop`) — I'll design its schema/endpoints as part of this plan but won't build/deploy it without your confirmation on where it's hosted (same Render/Oracle Cloud setup as the online CRM backend, or something separate).

4. **Uploads directory.** Both the multer destination and the static-serve path currently resolve off `__dirname` with inconsistent nesting — neither survives Electron packaging (read-only install dir). These need to point at `app.getPath('userData')` (or similar OS-writable path) in the desktop fork.

## OFFLINE-DESKTOP-TODO.md — Phase Plan

**Phase 1 — Copy project**
Copy `retail-crm/` → `retail-crm-desktop/` (excluding `node_modules`, `dist`, `.git`, `uploads` contents). Fresh install of dependencies inside the copy. Verify the copy boots against the existing Postgres DB unmodified, as a baseline before any changes.

**Phase 2 — Architecture analysis** *(this phase — done, see above)*

**Phase 3 — PostgreSQL → MySQL**
- `schema.prisma`: switch provider, review string-length defaults (VARCHAR(191) vs any field that needs `@db.Text` for long `notes`/`address`/`description` values), regenerate a fresh MySQL migration (not editing the existing Postgres migration).
- Rewrite the one raw SQL query in `dashboard.service.ts` — likely just convert it to a plain Prisma `findMany` with an `include`, dropping raw SQL entirely.
- New local MySQL `.env` format: `mysql://user:pass@localhost:3306/retail_crm`.
- Decimal/money handling needs no code changes (Prisma abstracts this identically over MySQL).

**Phase 4 — Offline backend adjustments**
- Bind explicitly to `127.0.0.1`.
- Disable/adjust Helmet's HSTS (meaningless for localhost) and CSP.
- Fix uploads: move destination + static-serve path to a writable app-data directory, remove the fragile `__dirname`-relative traversal.
- CORS: allow whatever local origin the Electron-hosted frontend uses.
- Everything else (modules, guards, validation, Swagger optional) carries over unchanged.

**Phase 5 — Offline frontend**
- Decide static-export vs bundled-Next-server (see decision #1 above) — I'll inspect the frontend routes for SSR dependence before finalizing.
- Remove/disable the Cloudinary direct-upload path (`frontend/lib/cloudinary.ts`) — hard cloud dependency, replace with the existing backend upload endpoint only.
- New build-time env file pointing `NEXT_PUBLIC_API_URL` at the local backend.

**Phase 6 — First-run setup wizard**
Electron renderer flow: License Activation → Admin Account → MySQL Connection (with Test Connection) → DB Initialization (run Prisma migrate deploy) → Complete. Needs new IPC-backed screens, not part of the existing CRM frontend routes (kept separate so the main app UI is untouched).

**Phase 7 — License API** (new, separate service)
- New minimal NestJS (or lightweight Express) service + Postgres/Neon schema: `License`, `Device`, `ActivationEvent`/history tables per requirement #22's dashboard fields.
- Endpoints: activate, validate/heartbeat, (later) admin CRUD — admin dashboard itself deferred per requirement #22.
- Signed responses (e.g. HMAC or asymmetric signature over activation payload) so the desktop app can verify authenticity offline during the grace period.

**Phase 8 — Device activation**
- Device fingerprint: stable, hashed identifier from non-sensitive machine info (e.g. machine GUID / volume serial + app installation ID), no personal data collected.
- One-device-per-license enforcement server-side; admin-triggered reset unbinds a device row.

**Phase 9 — Secure local credential storage**
- MySQL credentials and license activation token stored via OS-protected storage (Windows: DPAPI, e.g. via `electron-store` with encryption or `keytar`-style OS credential vault) — never in plaintext files, never sent to frontend JS.

**Phase 10 — Offline license validation & grace period**
- Local encrypted cache of last-validated signed license state + timestamp.
- Configurable grace period (default 30 days) enforced client-side against the signed, tamper-checked cached state; periodic revalidation attempts when internet is available.

**Phase 11 — Windows packaging**
- Wire `desktop-app/main.js` to spawn/manage the local backend process, load the frontend, handle app-data paths, extend `electron-builder` config as needed (already has NSIS target). Produce `RetailCRM-Setup.exe`.

**Phase 12 — Security audit**
Full pass against requirement #24's checklist before calling this done.

**Phase 13 — Full QA**
Functional parity testing (business logic) + licensing/database edge cases from requirement #25.

## Files expected to be touched (inside `retail-crm-desktop/` only)

- `prisma/schema.prisma` (provider, possible `@db.Text` additions)
- `src/modules/dashboard/dashboard.service.ts` (raw query rewrite)
- `src/modules/products/products.controller.ts` (upload path)
- `src/main.ts` (host binding, helmet, CORS, static path)
- `frontend/lib/cloudinary.ts` (remove/replace)
- `frontend/lib/api.ts` / env files (base URL)
- `desktop-app/main.js` (full rewrite: backend process lifecycle, local load target, IPC)
- `desktop-app/package.json` (electron-builder config extensions, added deps: e.g. `electron-store`, MySQL client if needed at setup time)

## New files/services expected

- `retail-crm-desktop/` (whole new project tree, copied then modified)
- Setup wizard screens (new frontend routes or a separate Electron renderer flow) — License Activation, Admin Account, MySQL Setup, DB Init, Complete
- `desktop-app/preload.js` + IPC handlers for setup wizard ↔ backend communication
- New standalone **License API** service (new repo/folder, e.g. `license-api/`) + its own Prisma schema against Neon
- Device fingerprinting utility (backend or Electron main process)
- Secure local credential store module (encrypted config or OS vault)
- `retail-crm-desktop/OFFLINE-DESKTOP-TODO.md` and a short doc listing differences from the online version

## Risks / open questions

1. **License API hosting** — needs your decision on where it lives (same infra as current backend, or new).
2. **Static export vs bundled Next server** — will confirm after checking frontend routes for SSR usage in Phase 5, but wanted this flagged since it's the biggest "how does Electron actually load the UI" decision.
3. **MySQL string-length defaults** — Prisma's MySQL connector defaults `String` to `VARCHAR(191)`; any field currently holding longer free text (e.g. product `description`, `notes`) needs an explicit `@db.Text` annotation, otherwise data could get truncated or migration could fail on existing long values. Will audit exact fields during Phase 3.
4. **Committed secrets** in `.env.example` (see top of this doc) — recommend rotating regardless of this project.
5. **"Uncrackable" framing** — per requirement #10, will build defense-in-depth (HTTPS, server-side validation, device binding, signed responses, replay protection) but will not claim the license scheme is unbypassable by a sufficiently motivated attacker with full binary access — that's stated as a constraint, not a gap in my plan.

## Immediate next step if you approve

Phase 1 (copy the project) + write `retail-crm-desktop/OFFLINE-DESKTOP-TODO.md` with this same phase breakdown, committed as the first change inside the new folder. No Phase 3+ code changes start until you review that TODO file in place.
