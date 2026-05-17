# AGENTS.md

## Runtime
- This is a single NestJS app. Real module wiring lives in `src/app.module.ts`; the module list in `README.md` is stale.
- App entrypoint is `src/main.ts`. `GET /` returns `{ api, version }` and is used by both deploy health checks; keep it working if you touch bootstrap or routing.
- Swagger is only mounted in non-production at `/docs`.

## Local Dev
- Normal dev flow is Docker-based, not host-node-based: `docker compose up -d` starts Postgres plus the Nest watcher.
- The app listens on container port `3000` but is published to host `${APP_PORT:-3003}`. For default local access use `http://localhost:3003`, not `3000`.
- On container boot, the app runs `npm install --legacy-peer-deps && npx prisma generate && npm run start:dev`.
- On Windows, file watching can miss changes through Docker bind mounts; use `docker compose restart app`.
- Dependency installs in Docker and CI always use `--legacy-peer-deps`. Do the same for any local `npm install`/`npm ci`.

## Verification
- `npm run lint` runs ESLint with `--fix`; expect it to modify files. Run it before build/tests if you use it as a verification step.
- Best quick compile check is `docker compose exec app npm run build`.
- `npm test` only covers unit specs under `src/**/*.spec.ts` and is currently just `src/app.controller.spec.ts`; do not treat it as backend coverage.
- Real API coverage is E2E against Postgres: `docker compose --profile test run --rm test`.
- Focused E2E runs can override the test container command, for example: `docker compose --profile test run --rm test npx jest --config test/jest-e2e.json test/auth.e2e-spec.ts --runInBand`.

## Prisma
- Prisma config is in `prisma.config.js` and reads `DATABASE_URL` from `.env`.
- Default Prisma seed is `prisma/seed-dev.ts` via `package.json#prisma.seed`; `prisma/seed.ts` exists but is not the configured default.
- Routine DB commands are expected inside the app container, e.g. `docker compose exec app npx prisma migrate dev --name <name>`, `docker compose exec app npx prisma migrate deploy`, `docker compose exec app npx prisma db seed`.
- After schema changes, make sure Prisma Client is regenerated. Restarting the dev container does this automatically; otherwise run `docker compose exec app npx prisma generate`.

## Repo-Specific Gotchas
- There are two similarly named modules: `src/contact` is the public contact form (captcha + mail), while `src/contacts` is the professional contact/domain module.
- Contact form captcha is bypassed when `TURNSTILE_SECRET_KEY` is unset (`src/captcha/turnstile-validator.service.ts`); missing `SUPPORT_EMAIL` makes the contact endpoint fail.
- Upload storage is local filesystem only right now. URLs are always `/uploads/...`, while the actual base path comes from `UPLOAD_PATH` or defaults to `uploads`.
- Logs are always written under `./logs` via Winston daily rotate files, even outside production.
- Production deploy/PM2 starts `dist/src/main.js` directly and preserves server-side `uploads` and `logs`; those paths are excluded from rsync in `.github/workflows/deploy.yml`.
