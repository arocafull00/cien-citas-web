# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"100 Citas" mobile-first PWA (Next.js 16 App Router, React 19, Tailwind 4 + shadcn) — a web port of a separate Expo app. It shares the **same Clerk instance, Neon Postgres database and Cloudflare R2 bucket** as the Expo app, so any schema or data-shape change affects the mobile app too. Faithfulness to the Expo app's visuals, copy and flows is a design goal (see `PRODUCT.md`). All UI text and API error messages are in Spanish.

## Commands

pnpm 10, Node ≥ 20.9. Dev server runs on port **3002**.

```bash
pnpm dev            # builds the offline bundle (dev mode), then next dev --webpack
pnpm build          # builds the offline bundle, then next build --webpack
pnpm start          # production server (required to test the service worker/PWA)
pnpm lint
pnpm typecheck
pnpm test           # vitest (tests/**/*.test.ts, node env)
pnpm vitest run tests/offline.test.ts   # single test file
pnpm vitest run -t "partial test name"  # single test by name
pnpm test:e2e       # Playwright (tests/browser, Pixel 7 + Chrome); runs against `pnpm start`, so build first
node scripts/verify-services.mjs        # read-only connectivity check for Clerk/Neon/R2/Geoapify
```

Always use `--webpack` (Serwist requires it). There is no `drizzle.config` or migration script: `drizzle/` holds the existing SQL migration history shared with Expo — do not run migrations or seeds against the shared database without explicit approval.

Env vars are listed in `.env.example`; only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` reaches the browser. Geoapify is proxied via `/api/places*` so its key stays server-side.

## Architecture

### Path aliases

`@/*` resolves to both `./src/*` and `./*`, so `@/db` is the top-level `db/` folder (Drizzle schema + Neon HTTP client) and `@/lib/...` is `src/lib/...`. Vitest mirrors this and stubs `server-only`.

### Routing and auth

- `src/proxy.ts` is the Clerk middleware (Next 16 "proxy"). It also rejects cross-origin non-GET `/api/*` requests, and excludes `/offline` and static assets from the matcher.
- `src/app/(online)/` wraps everything in `ClerkProvider` + `AppProvider`. `(online)/(protected)/layout.tsx` redirects unauthenticated users to `/login` and wraps pages in `CoupleGate`, which sends users without a linked partner to `/onboarding`.
- API routes call `requireAuth()` then usually `requireCouple(userId)` from `src/lib/auth-middleware.ts`. These **throw `Response` objects** on failure, which route handlers catch and return. `requireAuth` lazily creates the `users` row from the Clerk identity.

### Data model (`db/schema.ts`)

Everything is scoped to a **couple**. Dates come in two kinds that share UI but differ in storage:

- **Catalog dates**: `date_ideas` (numeric ids) + per-couple `couple_dates` rows holding completion data and optional `custom*` overrides (merged by `src/lib/resolve-catalog-date.ts`).
- **Custom dates**: `custom_dates` (UUID ids).
  `src/lib/date-id.ts` distinguishes them by id shape (UUID ⇒ custom). Images live in `date_images` / `custom_date_images`; achievements in `achievements` / `couple_achievements` (logic in `src/lib/achievements/`, evaluated on completion/upload and reconciled via backfill).

### Photo uploads (R2)

Browser → `POST /api/upload/presign` (or `/api/profile/avatar-presign`) → direct `PUT` to R2 with the presigned URL → `POST /api/upload/confirm` to record the image. Object keys are prefixed by couple id. Photos are never loaded directly from R2 by the client: `/api/media?url=...` (optionally `&variant=thumbnail`) validates the key belongs to the caller's couple via `src/lib/storage-key.ts` and proxies it with `private, no-store`. Browser uploads require the bucket CORS policy in `docs/r2-cors.json`.

### Client data layer

- `src/lib/api-client.ts`: the only fetch wrapper. In-memory GET cache (60 s TTL, whitelisted paths only) with request de-duplication; any write clears the cache. Writes throw `NetworkError` when offline — there is no offline write queue.
- `src/components/app-provider.tsx` (`useApp()`): holds account, couple, dates list and online state; persists a `Snapshot` to IndexedDB.
- `src/lib/offline.ts`: IndexedDB snapshots keyed by `clerkUserId:coupleId`, a per-session photo Cache Storage (max 100 photos / 30 days), and a **generation counter** used to discard async results that finish after a user/couple change. `clearPrivateData()` wipes IndexedDB, photo caches and `100citas:*` local/session storage on sign-out, user switch or unlink.

### Offline mode (two separate builds)

- `scripts/build-offline.mjs` bundles `src/offline-entry.tsx` with esbuild (plus compiled Tailwind CSS) into `public/offline-ui.js`, `public/offline-ui.css` and `public/offline.html`. These are generated (gitignored) and run **without the Next router or Clerk**, so components used by the offline viewer (`offline-screen.tsx` and the shared diary components) must not depend on Next/Clerk-only APIs.
- `/offline` (`src/app/offline/route.ts`) serves that static HTML.
- `src/app/sw.ts` (Serwist, disabled outside production) precaches `/offline`, card images and fonts; every other request is `NetworkOnly`. When a document navigation fails, it serves the offline document with the requested URL injected as `window.__100citasOfflineUrl`. The SW never caches API responses or authenticated HTML.
- `MobileLink` (`mobile-shell.tsx`) turns navigations into full loads of `/offline#<href>` when the browser is offline.

### Styling

Tailwind 4 configured in `src/app/globals.css` (no tailwind config file); shadcn components in `src/components/ui/`. Light theme only. Layout is a mobile column capped at 480 px on large screens. Card background images are optimized WebP (`pnpm assets:images`, which also converts the onboarding and login images).

### Deployment

Vercel project `cien-citas-web`. Clerk must allow the deployed domain and `/sso-callback` for Google OAuth.
