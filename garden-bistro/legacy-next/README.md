> **Archived rollback application.** The official application is `../vite-app`; this Next.js code is preserved for migration and rollback only. Do not deploy it as the active site. Its public assets are linked to the Vite app’s public directory. See the repository-root README for current instructions.

# Garden Bistro — Kigali

A Next.js App Router / React / strict TypeScript hospitality application for the combined hotel and restaurant at **KN 159 St, Nyamirambo, Kigali, Rwanda**.

## Delivery status

This is a working application foundation, **not a fully commissioned production service**. Public pages render without infrastructure credentials. Persistence and administration require PostgreSQL and authentication configuration. Ordering is intentionally off. No real rooms, prices, photographs, opening hours, reviews, policies or delivery arrangements have been invented.

### Implemented

- Botanical green / ivory / gold responsive interface, original decorative SVG artwork (not a photograph of the property), mobile navigation, accessible focus styles, reduced-motion support.
- `/en`, `/fr`, `/sw`, language-preserving navigation, localized forms, locale document language, metadata and contact controls.
- Hotel, rooms/details, restaurant, searchable/filterable HTML menu/details, order/cart/checkout, reservations, events enquiry, gallery, about, contact, FAQ and legal routes.
- Independently published translations; no automatic cross-language content fallback.
- PostgreSQL-backed reservation, hotel and event requests, unique references, pending defaults, duplicate-submission keys, server validation, honeypot and database-backed rate limits.
- Ordering with trusted server prices, integer RWF totals, quantity constraints, price/name snapshots, transactionally stored items and status history, configurable delivery fees and minimums. No card data collected.
- Protected admin login, signed HTTP-only sessions, administrator and permission-scoped staff accounts, immediate database-account deactivation, content create/edit/publish/unpublish/delete, operational filtering/pagination, status management, settings and audit logs.
- Authenticated image uploads: JPEG/PNG/WebP <=5 MB, decoding/pixel limits, resize/re-encode to WebP, metadata removal, private by default. Published-content references control public access. Gallery images include translated alt text.
- WhatsApp button with localized contextual message, verified phone/email links, Organization JSON-LD with only supplied NAP information. No coordinates or directions claims.
- Indexing blocked by default; canonical/hreflang require configured domain. Sitemap excludes drafts.

### Deliberate limitations / remaining commissioning work

- No live availability, online payments, SMS, automated WhatsApp messaging, or transactional email integration. Staff must contact customers manually. Status changes do not send messages.
- Image bytes currently reside in PostgreSQL, not external object storage. Suitable for a small initial gallery; migrate to private object storage/CDN before high-volume use. Backups include images.
- Editorial modules share a structured content editor; advanced content is edited as JSON. There is no rich-text editor, image cropper, side-by-side preview, nested category editor, configurable item variations, business-hours enforcement or pickup-time scheduling yet. Do not enable services requiring those features until implemented.
- Content types/translations use one relational content table with JSON extensions rather than separate normalized room/menu/translation tables. Transactional customer/order tables are separate and constrained. Extend the schema for richer inventory and variation needs.
- Settings edit operational services, payment instructions, zones/fees, minimum order and WhatsApp. Verified NAP details currently live in source and require a code update. Homepage layout and marketing strings are source-managed; general pages, room/menu entries, FAQs and translations are dashboard-managed.
- Admin interface is English. Public browser-native validation text follows the browser's language. Custom API field-error translations, localized status-tracking pages and richer customer notifications remain to be implemented.
- Event enquiry does not establish that event space or packages are available. Gallery and rooms show no invented inventory; legal pages explicitly state documents await approval. Commission approved privacy notices **before accepting real personal information**.
- Native-speaker review of French/Swahili content, legal review, real-device accessibility/performance testing, live PostgreSQL end-to-end tests and independent security review remain launch gates.

## Local setup

Requirements: Node.js 22+, npm, PostgreSQL 15+.

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET.
# Generate secret locally: openssl rand -hex 32
# Generate password hash locally: npx tsx scripts/password.ts 'a-long-unique-password'
```

The application reads `.env.local` through Next.js. CLI migration scripts use process environment, so run migrations with environment variables explicitly exported, or:

```sh
node --env-file=.env.local --import tsx scripts/migrate.ts
npm run dev
```

Visit `http://localhost:3000/en` and `/admin/login`. There is **no default password** and no fake successful submissions. Without a database, public writes return an explicit 503; records are never silently saved to memory or local browser storage.

Use a password manager rather than shell history for production credential generation. Never commit `.env.local`. Set `SESSION_SECRET` to at least 32 random characters. Bootstrap admin credentials live only in the server environment. Create individual accounts in `/admin/users`; `orders` and `requests` permissions are staff's only operational scopes. Administrators can edit all content/settings/users. Rotate `SESSION_SECRET` to invalidate all sessions. Rotate bootstrap credentials if compromised; changing only its password does not invalidate existing cookies.

## Database and migration model

Migrations in `migrations/` are ordered and recorded in `schema_migrations`; migration runner uses an advisory lock. Run migration before serving a new release. Migrations are forward-only: restore a tested backup for rollback, or ship a compensating migration. Do not edit applied migrations. Do not run migrations against the wrong environment.

- `001_initial.sql`: editorial content, business settings, customer requests, orders/items/history, audit logs, rate limits.
- `002_images.sql`: private image storage.
- `003_users.sql`: user accounts and role permissions.

Private tables have RLS enabled with no anonymous policies. **DATABASE_URL is a trusted server-only database connection**; use a dedicated application role with the necessary table privileges and RLS policies, or a dedicated database owner connection during initial controlled setup. A non-owner without explicit policies cannot access private tables. Do not use these credentials in a browser or expose this database via a public REST service. Separate migration and runtime credentials in hardened deployments. Review role grants and RLS with your hosting provider; do not disable RLS to enable anonymous clients.

Customer data is never available through unauthenticated list APIs. Public reads only retrieve published editorial content. Customer references alone are not public access tokens. API writes validate origin and roles server-side. Deploy behind a trusted reverse proxy that overwrites forwarding headers; rate limiting relies on its trusted `X-Forwarded-For`. Also configure upstream request body limits (6 MB for image upload, smaller limits for JSON), TLS and a WAF or managed challenge for stronger bot protection.

## Publish content

1. Configure database/auth and sign in as an administrator.
2. Use `/admin/content` (or menu/rooms/pages/translations) to create a draft per locale. Slugs are lowercase letters/numbers/hyphens.
3. Set a confirmed integer RWF price or leave blank. Never substitute zero for an unknown price.
4. Page `data`: `{"body":"Approved plain text"}`. Menu `data`: `{"category":"Approved category","soldOut":false,"labels":[]}`. Confirm all allergens/dietary labels explicitly.
5. Upload approved property images. Copy returned `imageId` into content `data`, plus an accurate translated `alt`. Gallery publication requires both.
6. Check “Approved for publication” only after business/native-language review. Uncheck to unpublish. Publishing another language requires a separate record.
7. Do not publish invented room inventory or service policies. Legal page slugs: `privacy`, `terms`, `policies`.

## Enable ordering only after approval

In `/admin/settings`, set payment instructions independently for each language and enable only approved fulfilment modes. An enabled language without instructions still cannot order. Example structure (not real business terms):

```json
{
  "orderingEnabled": false,
  "pickupEnabled": false,
  "deliveryEnabled": false,
  "whatsappEnabled": true,
  "minimumOrder": 0,
  "paymentInstructions": {"en":"", "fr":"", "sw":""},
  "deliveryZones": []
}
```

Delivery zone shape: `{ "id": "approved-zone-id", "name": "Approved zone name", "fee": 0, "enabled": false }`. Obtain actual fees before activation. Customers must select a configured zone; the server calculates its fee, not the browser. Staff must manually verify addresses fall inside that zone. Contact customers manually for acceptance, timing, payment instructions and status updates.

## Build / deployment

```sh
npm run typecheck
npm test
npm run build
npm start
# Against running server, with no database configured:
npx tsx scripts/smoke.ts
```

Deploy to a Node-compatible Next.js host with PostgreSQL reachable over TLS. Supply environment variables from `.env.example`. Set `SITE_URL` only after choosing the real HTTPS domain (no trailing slash). Keep `ALLOW_INDEXING=false` in every preview/staging environment. Set it to `true` **only** on the approved production environment. Robots/sitemap are dynamic and reflect current environment/content. Do not run `next build` while a development server uses the same `.next` directory.

CI is in `.github/workflows/ci.yml`. Images require the `sharp` native binary supported by the selected runtime. No persistent local filesystem is needed for customer records or images. Monitor database availability and 5xx error counts; logging deliberately omits customer payloads.

## Backup / recovery

Enable encrypted daily managed PostgreSQL backups and point-in-time recovery; define retention and a recovery objective with the business. Restrict backup access. Include `images`, content, settings, users, requests, orders and audit data. Use `pg_dump --format=custom` with credentials supplied securely, not in Git or chat. Test restoration into an isolated database at least monthly, run migrations, check references/counts and ordering totals, then verify application login and a test request. Rotate secrets after any compromise. Purge test customer records and expired rate-limit rows according to approved retention rules. Customer-data export/deletion procedures must be agreed before launch.

See **TEST_REPORT.md** for exact tested and untested areas. No full production-readiness or legal-compliance claim is made.

## Supplied photography and brand commissioning

The public gallery includes a curated set of client-supplied property photographs in `public/images` and also displays published gallery records uploaded through administration. The bundled photographs are currently source-managed, not individually removable from the dashboard. To replace a page hero, upload a photo and publish a localized `page` record using the matching page slug, with `data` such as `{"imageId":"<uploaded UUID>","alt":"Approved description"}`. Home uses its `home` page record. Uploaded menu photos use the same `imageId` and `alt` fields. Image access remains restricted to images referenced by published content.

The client-supplied green-leaf logo is preserved as `public/images/garden-bistro-logo.png`. The homepage and contact page use the exact Google Maps embed supplied by the client; the directions link uses its supplied coordinates. The static gallery and some page-banner defaults remain source-managed. Product-specific photographs must be assigned to the correct approved menu records by staff; the system does not infer dishes or prices from photographs.
