# Remaining rebuild: implementation and rollout plan

This plan describes work still required, not completed production behavior. The Vite app is separate from the current Next.js deployment. Current repository code and proposed SQL are not proof of deployed schema, data counts, permissions or service configuration.

## 1. Inventory, existing data and media

**Built:** the original app has a read-only record/image digest inventory. The Vite app now has a dry-run/resumable legacy-image copier and a proposed mapping table. It reads legacy `images` under a read-only repeatable-read snapshot, checks real WebP bytes and dimensions, uploads identical bytes to a fresh R2 key, downloads and SHA-256 checks them, and only then records metadata and a legacy ID mapping in a target transaction. A rerun checks both the source digest and the remote object. It does not change content references or delete source bytes. R2 and PostgreSQL are independent systems; failed or uncertain writes can leave orphan objects and are logged for manual reconciliation, never automatically deleted.

**Next:** obtain a verified, least-privilege read-only copy of the source and inspect the real tables, extensions, grants, RLS, policies, triggers, indexes and applied migrations. Inventory all content, settings, orders, request history, roles and referenced images. Reconcile legacy IDs across locales and content JSON. Get explicit approval that the images may be publicly accessible from the chosen R2 domain; quarantine anything not approved. Back up source and test restoration. On isolated staging only, review/apply proposed migrations, execute dry-run, then copy and verify all hashes/counts. Record source/target identity and date in the approved migration record; don't check sensitive inventory into Git. Reconcile orphan keys. Build and test a separate additive reference migration using the verified mapping, preserving old `imageId` references and recording original values for rollback. Compare every reference and image before/after, confirm content still renders, and only consider source-byte cleanup after explicit approval. A staging success does not constitute a production migration.

## 2. Authorization and RLS

**Built:** JWT verification, explicit server-side permission checks, and proposed request read RLS/realtime policies. A local PGlite test exercises a limited role matrix.

**Next:** enumerate actual existing grants/policies, since permissive PostgreSQL policies are OR-combined; a new restrictive policy does not neutralize a broad old one. For each table specify anonymous, authenticated non-staff, each staff permission and service access for select/insert/update/delete. Use separate permissions for content kinds, requests, orders, media, settings, staff and audit. Decide exactly which fields are public and prevent staff self-promotion or mutation of owner roles. Review security-definer owner, fixed search path, function execution grants, `auth.uid()` behavior, PostgREST grants and realtime publication exposure. Run two-user live Supabase RLS/negative tests for each operation and revocation, plus function-level tests. Apply only reviewed, versioned, additive SQL against a populated staging copy and verify rollback and counts. The current security-definer policy is a proposal, not an audit result.

## 3. Administration and media lifecycle

**Built:** basic permission-aware staff content, requests, invitations and R2 upload/library; menu category, availability and image link.

**Next:** implement dashboard metrics/activity and the remaining permission-aware pages for menu/categories, rooms, events, reviews, business profile/hours, translated content and audit. The basic order queue and ordering-settings editor are implemented but not live-tested. Add server validation, server-side pagination/search, confirmations, concurrency checks, audit entries and useful loading/error/empty states. For replacement, upload and verify a new object first, atomically update references with audit and preserve the old object for rollback. For deletion, first enumerate all content and legacy mappings and prove an object is unreferenced; implement a reversible tombstone/retention period and an audited, separately authorized cleanup job. Do not delete an object if reference discovery, ownership or commit state is uncertain. Add integration tests for unauthorized actions, partial failures and recovery.

## 4. Orders and pricing

**Built:** public Vite ordering remains disabled; old app code is retained for rollback. A Netlify order submission foundation validates server-derived prices, settings, fees and snapshots in a transaction; it is gated by the separate `ORDERING_APPROVED=true` server variable as well as business settings. A localized cart, delivery-zone selector, status queue and ordering settings editor are now implemented, but not live-tested or approved.

**Next:** migrate existing order/cart settings and preserve historical snapshots/IDs. Complete integration and concurrency testing of the existing server transaction, which re-reads published available menu prices, quantities, allowed fulfilment, configured fees and payment instructions, uses integer RWF and an idempotency key, and creates item snapshots and initial status. Verify the customer-facing stale-price/fee rejection and order-state transition graph with concurrent-update detection and audit history against the live stack. Test all invalid inputs, rounding, duplication, concurrent requests and existing records. Do not enable ordering/payment/pickup/delivery until owner approves real business settings and workflows; no payment integration is claimed.

## 5. Realtime and push

**Built:** proposed request RLS/publication and a request insert/update subscription that refreshes the staff queue. No live Supabase verification has been performed.

**Next:** after RLS validation, test reconnects, token refresh, revocation and no cross-role leakage against an isolated real Supabase project. Add order/enquiry notifications only to authorized staff. If Web Push is approved, store subscriptions privately with per-staff ownership, keep VAPID private keys server-side, strictly validate subscription endpoints and payloads, and use authorized functions or mandatory verified webhook secrets, origin restrictions and rate limits. Avoid sending customer PII in push payloads; implement opt-in/out, expiration and cleanup. Test missing/invalid secrets, replay/abuse and permission changes. No wildcard CORS on privileged routes.

## 6. Localization and accessibility

**Built:** EN/FR/SW public strings and translated database records; staff UI remains English.

**Next:** centralize all public and admin strings, validate parity of translation keys, localize form errors, state labels, email/invite copy and content editor workflows. Owner/reviewer must approve translations and missing business facts. Test keyboard focus, labels, responsive navigation, screen-reader announcements, color contrast and slow/mobile rendering. Add browser tests in EN/FR/SW with both empty and populated data and real login recovery; compare against the five supplied references. Verify titles/metadata, canonicals, sitemap and indexability against the approved production domain without fabricating business facts.

## 7. Deployment, verification and approval

Create a separate Netlify staging site rooted at `garden-bistro/vite-app`; configure server-only Supabase/R2 credentials and the precise `SITE_URL`, a staged database, Auth redirect/email configuration and least-privilege roles. Verify Netlify Functions are packaged and run with Sharp and R2, SPA fallback does not mask function paths, and no secrets enter the browser bundle. Run unit/typecheck/build, function integration, live auth/RLS, R2 and browser tests; record actual results and source/target record and media counts. Exercise backups, restore, monitoring, rate limiting and a rollback to the existing app. Have the owner approve content, public media, staff access, operating settings and the cutover window. Only then migrate production with a documented freeze/reconciliation plan, compare counts/hashes and references, deploy Vite, smoke-test and monitor. If verification fails, stop and roll back; never claim production readiness beforehand.
