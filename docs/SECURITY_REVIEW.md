# Lemon Size Security Review

Last updated: April 17, 2026

## Scope of this review

This review covers the application code in this repository, with a focus on:
- database access patterns
- route authentication
- app proxy verification
- webhook handling
- public URLs and endpoints that could be misused

This review does **not** prove that production infrastructure is secure. It does not verify:
- Neon/Postgres network restrictions
- production firewall or WAF settings
- Vercel/server logging retention
- secret rotation practices
- backup encryption or retention policy
- runtime monitoring or intrusion detection

## Overall assessment

Current assessment: no obvious critical code-level database exposure was found.

Good signs:
- admin routes are protected with `authenticate.admin`
- webhook routes use `authenticate.webhook`
- storefront proxy routes verify Shopify app proxy signatures
- Prisma queries are mostly standard ORM queries
- raw SQL usage is limited and parameterized
- OAuth scopes are minimal (`read_products`)

The app looks reasonably protected at the application-code level, but there are still a few areas worth hardening before or shortly after launch.

## Findings

### Medium: storefront analytics endpoint can be spammed to inflate metrics

Files:
- `app/routes/proxy.lemon-size.analytics.ts`
- `extensions/size-guide/assets/lemon-size.js`

Why it matters:
- the analytics endpoint is publicly callable from the storefront through the Shopify app proxy
- it accepts `GET` requests
- every valid request inserts an event row
- there is no rate limit, deduplication, or replay protection

Impact:
- analytics can be artificially inflated by repeated requests
- this is more of an integrity/business-abuse issue than a direct data-breach issue

Recommendation:
- add lightweight rate limiting by shop and IP where practical
- consider deduplicating repeated events for the same shop/product/chart in a short time window
- consider switching tracking to `POST` even if proxy verification still remains the main control

### Low: sensitive session and token data is stored in the database

Files:
- `prisma/schema.prisma`
- `app/shopify.server.ts`

Why it matters:
- Shopify session storage includes access tokens and refresh tokens
- merchant email and profile fields are also stored in the `Session` table

Impact:
- this is normal for Shopify app session storage, but if the database is compromised the impact is high

Recommendation:
- make sure production database access is tightly restricted
- confirm encryption at rest is enabled at the database/provider level
- restrict who can read production session tables
- if feasible later, evaluate additional application-layer encryption for especially sensitive fields

### Low: public proxy responses reveal small amounts of shop state

Files:
- `app/routes/proxy.lemon-size.size-chart.ts`

Examples:
- `Shop not configured`
- `No size chart configured`
- `Size chart not found`

Why it matters:
- these messages reveal small pieces of internal app state
- however, the route is behind Shopify app proxy signature verification, so this is not openly exposed to arbitrary unauthenticated internet traffic in the normal case

Recommendation:
- acceptable as-is for now
- if desired, reduce message specificity in production-facing error states

### Low: webhook logging is minimal but still should avoid unnecessary sensitive detail

Files:
- `app/routes/webhooks.app.scopes_update.tsx`

Why it matters:
- current logging is limited, which is good
- just keep avoiding logs that include tokens, payload dumps, or merchant PII unless necessary

Recommendation:
- leave as-is or replace with structured minimal logging later

## URLs and route review

### Protected admin routes

These appear to require authenticated Shopify admin sessions:
- `/app`
- `/app/size-charts`
- `/app/assignments`
- `/app/keyword-rules`
- `/app/rule-tester`
- `/app/analytics`
- `/app/additional`

Assessment:
- no obvious buggy unauthenticated admin URL was found in this review

### Public storefront routes

These are intentionally public-facing through Shopify app proxy:
- `/proxy/lemon-size/size-chart`
- `/proxy/lemon-size/analytics`

Assessment:
- signature verification is present
- this is the main boundary protecting these routes
- no obvious bypass was identified from code review alone

### Login and redirect behavior

Files:
- `app/routes/_index/route.tsx`
- `app/routes/auth.login/route.tsx`

Assessment:
- no obvious open redirect issue was found
- redirects observed in the code are internal relative app redirects

## Database access review

What looks good:
- Prisma ORM is used for most reads/writes
- raw SQL in analytics uses Prisma tagged template APIs rather than unsafe string concatenation
- there is no obvious route that exposes raw database contents directly

What still depends on infrastructure:
- database user permissions
- database network exposure
- secret handling for `DATABASE_URL`
- provider-side backups and retention

## App proxy verification review

Files:
- `app/untils/verifyAppProxy.ts`
- `app/routes/proxy.lemon-size.size-chart.ts`
- `app/routes/proxy.lemon-size.analytics.ts`

Assessment:
- app proxy signature verification is implemented and checked before proxy logic runs
- no obvious missing verification check was found in these routes

## Practical recommendations

Before or soon after launch:
1. Add abuse protection to the analytics proxy route.
2. Confirm Neon/Postgres is not publicly open beyond intended access paths.
3. Confirm database backups and production storage are encrypted.
4. Limit production database access to the smallest possible team set.
5. Keep privacy text accurate: the app does not normally collect customer personal data, but it does store merchant/session/configuration data.

## Final conclusion

From the code in this repository, the application does **not** appear to have an obvious critical security flaw exposing the database or leaving admin pages open without authentication.

The main issue worth addressing is **analytics abuse/spam risk**, not direct database compromise from a buggy URL.

So the short answer is:
- database protection looks acceptable from the app-code perspective
- no clearly dangerous buggy URL stood out in this review
- infrastructure security still needs to be confirmed outside the codebase
