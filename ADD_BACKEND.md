# Add backend + MySQL settings API

> 历史任务。当前接口已由 `backend/` 里的 Spring Boot 提供，不再使用 Express。

Use the existing Vite + TypeScript + three.js frontend in this directory. Add a small Node.js (Express or Fastify) backend that talks to the **cloud MySQL already configured in `.env`** (MYSQL_HOST/PORT/USER/PASSWORD/DATABASE). Do not invent new DB credentials. Do not print secrets.

## Database
- Database name comes from `.env` (`test_01`).
- Table `scene_settings` already exists:
  - `setting_key` VARCHAR PK
  - `setting_value` JSON
  - `updated_at` TIMESTAMP
- Seeded keys include `camera` like `{"position":[19,16,23],"target":[0,1.1,0]}` and `reveal`.

## Backend API (encapsulated helpers)
Create clean modules, e.g. `server/` or `backend/`:
- `db.ts` — pool from `.env` (mysql2/promise)
- `settings.repo.ts` — get/set by key, getAll
- HTTP routes under `/api`:
  - `GET /api/health`
  - `GET /api/settings` — all settings as object
  - `GET /api/settings/:key`
  - `PUT /api/settings/:key` — body = JSON value (for later remote tweaks without rewriting frontend)
  - `GET /api/settings/camera` (or via :key) used by frontend on load

## Frontend
- On boot, fetch camera (and optional reveal flags) from `/api/settings` before/while creating the scene.
- If API fails, fall back to current hardcoded defaults in `src/scene/config.ts`.
- Vite `server.proxy`: `/api` -> `http://127.0.0.1:PORT` from `.env` (default 3001).
- Still no visible UI/HUD.

## Scripts & docs
- package.json: `dev` should run frontend+backend together (concurrently or similar), also `dev:web`, `dev:api`, `build`, `start` for API.
- Update README.md (Chinese ok) with how to run and how settings work.
- Update docs/ARCHITECTURE.md briefly.
- Ensure `.env` is in `.gitignore`; add `.env.example` without real password.
- Run `npm install` as needed and `npm run build` for the frontend; smoke-test API with a curl/node fetch if possible.
- Do not ask questions; implement now.