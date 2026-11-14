# Garden Bistro — test report

Date: 2026-11-11. Environment: Node 22, Next.js 15.5.29, Linux sandbox. No live PostgreSQL connection, business-approved menu/rooms, email provider, payment configuration or domain was supplied.

## Passed

- `npm run build`: optimized Next.js production build, TypeScript checking and route compilation.
- `npm run typecheck`: strict TypeScript validation.
- `npm test`: **11 tests passed**, covering valid request input, honeypot/past-date/missing-time/invalid-phone rejection, hotel date ordering, required email for email contact, integer RWF totals, negative-price/fractional/excess-quantity rejection, empty orders, salted password verification, same-origin checks and dictionary key parity.
- The eleventh test applies all three SQL migrations to **PGlite (embedded PostgreSQL)**, checks pending request defaults, unique idempotency constraints, status constraints, disabled ordering defaults and draft content exclusion. This does **not** substitute for deployment PostgreSQL integration tests or RLS role tests.
- `npx tsx scripts/smoke.ts` against the running production server without database configuration: **45 localized public routes return 200**, 3 invalid/unpublished detail paths return 404, unauthenticated admin redirects to login, four admin write endpoints return 403, hostile-origin requests return 403, unavailable persistence returns 503, preview robots disallows indexing.
- `npm audit --omit=dev`: zero reported vulnerabilities at test time. A PostCSS override addresses the advisory in Next.js's transitive dependency.
- No invented menu entries, room prices, availability counts, coordinates, customer reviews, amenities, opening hours, event capacity or business history are seeded.

## Failed / blocked attempts

- Browser automation could not launch: standard Playwright browser is not installed. An attempted packaged Chromium also failed due to missing `libnspr4.so`. The extra packaged-browser dependency was removed. **No screenshots or browser-level passes are claimed.**
- Initial implementation checks exposed a TypeScript unknown-value JSX guard and an origin/host mismatch. Both were corrected; subsequent build/typecheck/HTTP checks passed.
- Running a production build while the dev server used the same `.next` directory caused transient missing-chunk errors. The dev server was stopped, a clean successful build was produced, and HTTP smoke checks were run against `next start` instead. Do not build concurrently with `next dev` in one directory.

## Untested / release-blocking

- Live PostgreSQL migration execution through `pg`, successful customer submissions reaching the dashboard, duplicate/concurrent HTTP submissions and complete ordering transaction rollback tests.
- Authenticated admin login/cookie behavior over the deployed HTTPS proxy, administrator/staff permission matrix, deactivation, user management, content CRUD and audit attribution end to end.
- Authenticated image uploads, corrupt-file rejection, public/private image access and gallery rendering against real PostgreSQL storage. Implementation exists, but these have not been exercised end to end.
- Real delivery zones, pickup instructions, preparation estimates, service-hour restrictions, payment arrangements and confirmed business policies. **Ordering remains disabled.** Variations and service-hour enforcement are not implemented.
- Automated email/SMS/WhatsApp status notifications: **not implemented**. Staff must contact customers manually.
- Live room/menu data, approved property photography, map entrance verification, approved legal content and professional French/Swahili review.
- External object storage: **not integrated**. Images use PostgreSQL byte storage.
- Browser console/hydration errors, real Android/iOS layout, keyboard/screen-reader tests, WCAG 2.2 audit, measured contrast, Core Web Vitals and constrained-network performance. Responsive CSS and accessibility features are implemented but are not a conformance claim.
- Production canonical/hreflang against a selected domain, indexed sitemap inventory and local search validation.
- Backup restore drill, production monitoring, penetration testing, trusted-proxy IP controls and abuse/load testing.
- GitHub Actions run results after push (workflow is provided, not represented as already passing remotely).

## Reproduction

```sh
npm ci
npm run typecheck
npm test
npm run build
npm start
# Separate terminal, no database configured:
npx tsx scripts/smoke.ts
```

For browser checks on a machine with supported browser dependencies:

```sh
npx playwright install --with-deps chromium
npx tsx scripts/browser-test.ts
```

The browser script checks 360px and 1280px viewports in all three locales: HTML language, horizontal overflow, navigation, form field presence, WhatsApp URL and page errors. It only reports success after execution. Screenshots go to ignored `test-artifacts/`. Set `CHROMIUM_PATH` to an existing compatible browser if needed.

## Acceptance conclusion

Public pages and core implementation compile and pass the checks listed above. **The full production acceptance criteria are not yet satisfied.** Configure infrastructure, complete remaining features outlined in README, supply approved business content and execute all deployment/end-to-end tests before launch or collection of real customer information.
