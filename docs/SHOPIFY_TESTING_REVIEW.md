# Shopify Testing Review

Last updated: April 21, 2026

## Scope

This document combines the Shopify-specific findings gathered from the recent code review and submission-readiness testing pass.

Areas checked:

- authentication and install flow
- embedded app requirements
- App Bridge usage
- session token readiness
- GraphQL Admin API usage
- required webhooks
- theme app extension setup
- uninstall behavior
- billing readiness
- naming and listing consistency

## Overall status

Current status: not fully ready for Shopify App Store submission.

The app has a solid base:

- embedded app configuration exists
- OAuth and authenticated admin routes are in place
- mandatory compliance webhooks are configured
- uninstall cleanup is implemented
- a theme app extension exists
- GraphQL Admin API is being used instead of legacy REST Admin API

However, there are still several Shopify-specific risks and gaps that should be resolved or verified before submission.

## Main findings

### 1. App Bridge setup is missing from the document head

The current app root does not include the Shopify App Bridge CDN bootstrap expected by current Shopify embedded app requirements.

Observed in:

- `app/root.tsx`

What is missing:

- `<meta name="shopify-api-key" ...>`
- `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>`

Why this matters:

- Shopify requires embedded apps to use the latest App Bridge loaded from Shopify's CDN.
- Shopify App Store embedded app checks may fail if this setup is missing.
- Current Shopify docs also recommend placing this in the document head before other scripts.

Risk:

- high

### 2. Polaris web components script is also missing

The admin UI uses Shopify web components such as:

- `<s-page>`
- `<s-section>`
- `<s-link>`
- `<s-app-nav>`
- `<s-button>`

Observed in:

- `app/routes/app.tsx`
- `app/routes/auth.login/route.tsx`
- `app/routes/app._index.tsx`
- several other app routes

But the root document does not load:

- `https://cdn.shopify.com/shopifycloud/polaris.js`

Why this matters:

- Shopify’s current App Home guidance expects Polaris web components to be loaded via the Shopify CDN when using these `s-*` components.
- Without the script, admin UI behavior can be incomplete or broken.

Risk:

- high

### 3. Session token readiness is not proven

Server-side auth is set up through:

- `@shopify/shopify-app-react-router`
- `authenticate.admin(request)`

Observed in:

- `app/shopify.server.ts`
- `app/routes/app.tsx`
- `app/routes/app.assignments.tsx`
- `app/routes/app._index.tsx`
- other app routes

This is a good sign, but because the App Bridge bootstrap is missing from the root document, the app is not clearly meeting Shopify’s current embedded session-token expectations from the browser side.

What I did not find:

- manual outdated token exchange logic
- old `createApp()` initialization
- npm-based legacy App Bridge setup

Why this matters:

- Shopify requires all apps rendered in Shopify admin to use session tokens.
- Review checks for embedded apps are based on real telemetry and runtime behavior, not only server code.

Status:

- likely incomplete or at least not review-safe until live verification is done

Risk:

- high

### 4. Manual shop-domain login page is a review risk

Observed in:

- `app/routes/auth.login/route.tsx`

The page renders a text field asking for:

- `example.myshopify.com`

Why this matters:

- Shopify App Store requirements say installation and initiation must happen from Shopify-owned surfaces.
- Shopify also says the app must not require manual entry of a `myshopify.com` domain during install or configuration flow.

This page may still work for manual development or edge cases, but for App Store review it is risky.

Risk:

- medium to high

### 5. Billing is not implemented

I did not find billing configuration or code for:

- Managed Pricing
- Shopify Billing API
- recurring subscriptions
- one-time charges
- billing plan checks

Observed in:

- `shopify.app.toml`
- `app/shopify.server.ts`
- `app/` code search

Why this matters:

- if the app is truly free, this is acceptable
- if the app will charge merchants in any way, Shopify requires Managed Pricing or the Shopify Billing API for App Store distribution

Current conclusion:

- acceptable only if the app is listed and operated as fully free

Risk:

- low if free
- critical if paid plans are intended

### 6. GraphQL Admin API usage is generally correct, but error handling is thin

Good findings:

- Admin API access uses `admin.graphql(...)`
- GraphQL queries are used instead of REST Admin API
- no obvious legacy REST usage was found

Examples:

- `app/routes/app._index.tsx`
- `app/routes/app.assignments.tsx`

Concern:

Responses are usually parsed with:

- `const json = await response.json()`

But the code generally does not explicitly handle:

- top-level GraphQL `errors`
- partial failure cases
- Shopify throttling or admin API error messaging

Why this matters:

- this is not an outdated API usage problem
- it is a reliability and review-risk problem if Shopify returns an error during testing

Risk:

- medium

### 7. Required webhooks are present

Configured in:

- `shopify.app.toml`

Present subscriptions:

- `app/uninstalled`
- `customers/data_request`
- `customers/redact`
- `shop/redact`

Webhook route files found:

- `app/routes/webhooks.app.uninstalled.tsx`
- `app/routes/webhooks.customers.data_request.tsx`
- `app/routes/webhooks.customers.redact.tsx`
- `app/routes/webhooks.shop.redact.tsx`
- `app/routes/webhooks.app.scopes_update.tsx`

Good findings:

- mandatory compliance webhooks are configured in TOML
- webhook routes use `authenticate.webhook(request)`

This area looks broadly correct from the repo review.

Risk:

- low, pending live verification

### 8. Uninstall cleanup is implemented correctly at a code level

Observed in:

- `app/routes/webhooks.app.uninstalled.tsx`

Current behavior:

- verifies the webhook through Shopify auth helpers
- finds the shop row
- invalidates size-chart cache
- deletes the shop row
- deletes stored sessions

Storefront impact:

- the app proxy returns a null/no-config result when the shop no longer exists
- this should prevent storefront functionality from continuing after uninstall

This is a positive implementation detail.

Risk:

- low, pending real uninstall/reinstall QA

### 9. Theme app extension exists, but has integration risks

Extension exists:

- `extensions/size-guide/shopify.extension.toml`
- `extensions/size-guide/blocks/lemon_size_guide.liquid`

Good findings:

- the app uses a theme app extension rather than requiring direct theme code edits
- the app block is targeted to product templates

Observed concern:

The extension hardcodes:

- `https://lemon-size.vercel.app`

Found in:

- `extensions/size-guide/blocks/lemon_size_guide.liquid`
- `extensions/size-guide/snippets/lemon-size-now-show.liquid`
- `extensions/size-guide/assets/lemon-size.js`

Why this matters:

- if the production app domain changes, extension behavior can drift
- this creates environment coupling between the theme extension and one exact app origin
- it is safer if storefront assets rely on app config or relative logic where possible

Additional review note:

- onboarding currently tells merchants to enable the app block, but does not appear to include a Theme Editor deep link
- Shopify strongly recommends detailed setup instructions and deep links for theme app extensions

Risk:

- medium

### 10. Embedded app shell is mostly present

Good findings:

- `embedded = true` is set in `shopify.app.toml`
- the main app route uses `AppProvider embedded`
- admin routes use `authenticate.admin(request)`
- response headers are added through `addDocumentResponseHeaders`

Observed in:

- `shopify.app.toml`
- `app/routes/app.tsx`
- `app/shopify.server.ts`
- `app/entry.server.tsx`

This gives the app a solid embedded foundation.

Main blocker in this area:

- missing App Bridge and Polaris CDN scripts in the root document

Risk:

- medium, becomes high because of the missing head bootstrap

### 11. Naming is mostly consistent, but one config name is stale

Primary app naming looks consistent:

- app name: `Lemon Size`
- handle: `lemon-size`
- documentation and UI mostly use `Lemon Size`

Observed mismatch:

- `shopify.web.toml` still says `name = "React Router"`

Why this matters:

- probably not a direct App Store rejection point
- still worth cleaning up to avoid confusion in tooling, release workflows, or internal setup

Risk:

- low

## Files reviewed

Core config and auth:

- `shopify.app.toml`
- `shopify.web.toml`
- `app/shopify.server.ts`
- `app/root.tsx`
- `app/entry.server.tsx`
- `app/routes/app.tsx`
- `app/routes/auth.$.tsx`
- `app/routes/auth.login/route.tsx`

Webhook and uninstall behavior:

- `app/routes/webhooks.app.uninstalled.tsx`
- `app/routes/webhooks.customers.data_request.tsx`
- `app/routes/webhooks.customers.redact.tsx`
- `app/routes/webhooks.shop.redact.tsx`
- `app/routes/webhooks.app.scopes_update.tsx`

GraphQL Admin API usage:

- `app/routes/app._index.tsx`
- `app/routes/app.assignments.tsx`
- related authenticated admin routes

Theme extension:

- `extensions/size-guide/shopify.extension.toml`
- `extensions/size-guide/blocks/lemon_size_guide.liquid`
- `extensions/size-guide/snippets/lemon-size-now-show.liquid`
- `extensions/size-guide/assets/lemon-size.js`

Docs and naming:

- `README.md`
- support and App Store prep docs under `docs/`

## Priority fixes before submission

### Critical

1. Add App Bridge CDN bootstrap to `app/root.tsx`
2. Add Polaris web components script to `app/root.tsx`
3. Verify embedded app checks pass on a real dev store
4. Decide and lock pricing model:
   - fully free, or
   - Shopify Managed Pricing / Billing API

### Important

1. Remove or de-emphasize manual shop-domain login for App Store review safety
2. Add stronger GraphQL error handling for admin queries
3. Remove hardcoded production-origin assumptions inside the theme extension
4. Add better theme app extension onboarding, ideally including a Theme Editor deep link

### Cleanup

1. Rename `shopify.web.toml` service name from `React Router` to something app-specific
2. Re-run full install, uninstall, reinstall, and theme-enable QA on a dev store

## Suggested submission checklist

- [ ] `app/root.tsx` includes Shopify App Bridge meta + CDN script
- [ ] `app/root.tsx` includes Shopify Polaris web components script
- [ ] embedded app opens correctly inside Shopify admin iframe
- [ ] Shopify embedded checks pass for App Bridge and session tokens
- [ ] install flow does not depend on manual shop-domain entry
- [ ] all core admin pages load without UI/runtime issues
- [ ] GraphQL queries handle Shopify API errors safely
- [ ] mandatory compliance webhooks are deployed and working
- [ ] uninstall removes app data and storefront behavior stops
- [ ] reinstall works cleanly
- [ ] theme app block can be enabled from Theme Editor
- [ ] storefront modal works on desktop and mobile
- [ ] app pricing is accurately configured as free or Shopify-managed paid
- [ ] naming is consistent across config, UI, and listing materials

## Short summary

Lemon Size is close in overall shape, but not yet submission-safe from a Shopify platform perspective.

The biggest technical issues found in this testing pass are:

- missing current App Bridge bootstrap
- missing Polaris web components script
- unproven session-token readiness in live embedded review checks
- risky manual shop-domain login flow
- no billing implementation if the app is intended to be paid
- hardcoded production domain usage inside the theme extension

The webhook and uninstall foundations look good, and GraphQL usage is modern, but the embedded-app bootstrap should be fixed before submission.
