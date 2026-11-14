# Garden Bistro replacement — work in progress

This is an incomplete, separate Vite/React/TypeScript replacement. It does not replace the existing Next.js build or production Netlify configuration. The `netlify.toml` here is for an isolated staging site whose base directory is `garden-bistro/vite-app`; it publishes `dist` and includes Netlify Functions and an SPA fallback. The app remains noindex. The original application must remain the live system until migration and end-to-end verification are complete.

## Setup

Run `npm ci`, then `npm run dev` for the client. To exercise functions, run through Netlify's function runtime, not the standalone Vite dev server. `npm run typecheck`, `npm test`, and `npm run build` check the client and function TypeScript and run the local tests. The build does not itself exercise Netlify function packaging or deployed services.

Client build variables (public; `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. These must never contain a service-role key. Set them in the Vite build environment. Menu and room queries require reviewed public-read RLS policies on the actual content table; absent permissions or configuration result in unavailable content.

Server-only Netlify variables: `SITE_URL` (exact allowed staging origin, e.g. `https://staging.example.org`), `DATABASE_URL` (server-only PostgreSQL connection), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_BASE_URL` (HTTPS base URL for **public** images). Do not prefix any server secret with `VITE_`. Configure Supabase Auth redirect allowlists and email delivery for the staging origin. These functions fail closed when required configuration is missing. The database role requires permissions for the legacy `requests`, `rate_limits`, `audit_logs` tables and proposed `gb_staff_access` and `gb_media` tables; grant only what is needed. Confirm IP-header behavior and connection security with the deployment provider.

## Implemented in code

- EN/FR/SW page shells, actual provided imagery and unchanged logo, exact map, database-backed menu/room listings, explicit empty/error states, and disabled ordering.
- Table, hotel and event request forms and Netlify request function with source validation, honeypot, DB-backed rate limit and idempotency. Requests remain pending; no availability is guaranteed.
- Supabase session restoration, login, logout, reset-email and password-update UI; staff request list/status changes with per-user server-side permission checks and audit records. Status changes are **not** realtime. Only the latest 100 requests are displayed.
- Authenticated, explicitly permission-checked public R2 image upload with image decoding/format checks, resizing and WebP conversion, randomized keys, DB metadata and audit. The R2 public domain must be intentionally configured for public objects. Failed metadata writes trigger best-effort deletion; any logged orphan key requires operator review.

## Important gaps and migration status

This is not production-ready. Auth, forms, permissions, Netlify packaging, R2 and live database integration have not been tested against configured services. `migrations/001_staff_access_PROPOSED.sql` and `002_media_PROPOSED.sql` are additive proposals and **have not been applied**; first review the actual deployed schema, grants and RLS policies. A trusted operator must onboard staff through Supabase Auth and separately provision exact permission strings (currently `requests.read`, `requests.write`, `media.write`) in `gb_staff_access`; no client can alter its own role. No existing staff hashes have been imported. The old app and new access table are not automatically synchronized.

The full granular RLS model, staff invitation/management, media library/replacement/deletion, migration and verification of old PostgreSQL images, content editing, menu search/categories, complete admin modules, realtime, push, localization of staff UI, SEO controls and full ordering preservation are not implemented. Existing static photographs are still bundled rather than migrated to R2. No live records or media have been migrated or counted. Existing published content query access depends on safely configured RLS, not on an assumption that every authenticated user is an admin. Never apply these proposal migrations or cut over without checking compatibility, backups, owner decisions, permissions and end-to-end behavior.
