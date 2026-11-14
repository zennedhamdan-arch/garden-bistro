# React/Vite, Supabase and R2 migration — preparation

## Current system and reference audit

The running application remains Next.js 15 / React 19 with server routes, PostgreSQL and signed HTTP-only sessions. Its source migrations are `001_initial.sql` (content, settings, requests, orders/items/history, audit and rate limits), `002_images.sql` (WebP bytes in PostgreSQL), and `003_users.sql` (accounts and roles). The source schema is not evidence of the schema actually deployed: inspect the target before proposing SQL. Editorial translations live in the content table; transactional records include snapshots and idempotency keys. Runtime and migration permissions must be assessed separately.

Green Corner reference branch `arena/e327698c-green-corner-ll` was inspected at commit `344593732924e97a8a5556e126a79bb33b66fdda`. Its actual application path is `green Conner/green-corner-website/green-corner`. It demonstrates React Router, a Supabase auth context, admin modules and realtime patterns. Its `schema.sql` grants broad access to all authenticated users, and its repository includes reset and Supabase Storage code. None of those policies, reset scripts or storage components should be applied to Garden Bistro.

## Safe inventory

With a least-privilege read-only connection to a verified **copy** of the source database, run `npm run db:inventory`. It opens a repeatable-read, read-only transaction and emits counts, applied migration names, and image IDs, byte lengths and SHA-256 digests. Missing known tables are represented by `null`, not zero. Output is sensitive operational metadata: save it only in approved private storage, not Git. The command does not export image bytes, connect to R2, inspect every deployed policy, or prove record-level equivalence. Verify database identity through the deployment provider independently before running it. Under RLS, counts may be incomplete unless the read-only inventory role has appropriately reviewed visibility; do not interpret invisible rows as deleted.

## Required migration gates

1. Obtain an approved isolated copy and a tested backup. Inventory actual tables, migrations, RLS policies, grants, triggers, functions and references; reconcile record and image counts with the source. No reset or destructive seed.
2. Design additive, versioned schema changes against the **actual** deployment. Preserve primary keys, translations, order snapshots, customer requests and legacy image bytes. Test both fresh and already-populated copies and rollback/restoration.
3. Define granular role/permission mappings and policies; test anonymous, customer, staff and administrator access including privilege escalation and service functions. Invite/reset passwords via Supabase Auth; do not copy password hashes. Do not cut over until account onboarding and revocation are verified.
4. Build private server-mediated R2 upload and migration tooling with validated types/size, authorization, unique keys, retries and checksums. Compare each uploaded object against the source SHA-256, verify references and public/private access, and retain source bytes for rollback. Do not delete source media without explicit approval.
5. Implement the new client and server functions in parallel, preserving server-side pricing, idempotency, request workflows, localization, indexing controls and audit. Keep ordering disabled until business settings are approved. Verify transactional workflows and security before cutover.
6. Configure Netlify, Supabase, R2, secret management, backups, monitoring and rollback in a staging environment. Run end-to-end and role-boundary tests, then obtain owner approval for any production migration or cutover.

## Status

This document and the inventory utility are preparation only. React/Vite, Supabase Auth/RLS, R2 storage and Netlify Functions are **not implemented**. No live database, R2 objects or user accounts were migrated, and no live record counts were checked. The existing application remains in place. Supabase/R2 provisioning, business configuration, media migration, live permissions review and production verification are blockers.
