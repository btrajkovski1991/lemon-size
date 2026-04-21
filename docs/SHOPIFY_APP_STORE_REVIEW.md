# Shopify App Store Review

Last updated: April 21, 2026

## Current recommendation

Code and repo configuration are now aligned for a free Shopify App Store submission.

The remaining work is operational verification in Shopify itself:

- install
- embedded app launch
- uninstall
- reinstall
- theme app block enablement
- storefront confirmation on a real dev store

## Submission model

Lemon Size is currently treated as a free app.

Repo status:

- no paid billing flow is implemented
- no Shopify Billing API flow is required for the current release
- documentation and review notes now assume the app is free

Partner Dashboard requirement:

- set pricing to `Free`

## Fixed in code

### Embedded app bootstrap

Fixed:

- App Bridge meta tag added
- App Bridge CDN script added
- Polaris web components script added
- `shopify:navigate` handling added for Shopify web component navigation

Relevant files:

- `app/root.tsx`

### Manual shop-domain entry removed

Fixed:

- manual `myshopify.com` entry removed from the login page
- manual `myshopify.com` entry removed from the public landing page
- auth copy now directs merchants to install and open the app from Shopify surfaces

Relevant files:

- `app/routes/auth.login/route.tsx`
- `app/routes/auth.login/error.server.tsx`
- `app/routes/_index/route.tsx`

### Theme extension origin assumptions removed

Fixed:

- hardcoded `https://lemon-size.vercel.app` assumptions removed from the theme extension
- storefront guide image URLs are now resolved from the server response instead of a baked-in app origin

Relevant files:

- `extensions/size-guide/blocks/lemon_size_guide.liquid`
- `extensions/size-guide/snippets/lemon-size-now-show.liquid`
- `extensions/size-guide/assets/lemon-size.js`
- `app/routes/proxy.lemon-size.size-chart.ts`

### GraphQL Admin API handling improved

Fixed:

- current Admin GraphQL calls now handle Shopify GraphQL errors
- non-JSON responses are handled
- missing `data` responses are handled
- admin pages now surface picker/preview API failures more safely

Relevant files:

- `app/utils/shopify-admin.server.ts`
- `app/routes/app._index.tsx`
- `app/routes/app.assignments.tsx`

### Naming cleanup

Fixed:

- stale `React Router` service naming removed from web config

Relevant files:

- `shopify.web.toml`

## Good findings still confirmed

### Required webhooks are present

Configured:

- `app/uninstalled`
- `customers/data_request`
- `customers/redact`
- `shop/redact`

### Uninstall behavior looks correct in code

Current uninstall behavior:

- shop data is deleted
- session records are deleted
- cached storefront configuration is invalidated
- storefront proxy should stop returning app data once the shop record is gone

### Theme app extension exists

The app uses a theme app block, which is the correct Shopify-friendly approach for this storefront feature.

## Remaining work before submission

These items cannot be fully completed from the repo alone and still require real Shopify verification:

1. Set Partner Dashboard pricing to `Free`.
2. Install the app on a clean dev store.
3. Confirm OAuth redirects directly into the embedded app UI.
4. Confirm the app loads correctly inside Shopify Admin.
5. Add the theme app block in Theme Editor and verify the storefront modal.
6. Uninstall the app and confirm storefront behavior stops.
7. Reinstall the app and confirm the app re-authenticates correctly.

## Submission checklist

- [x] App Bridge bootstrap added
- [x] Polaris script added
- [x] auth flow no longer relies on manual shop-domain entry
- [x] app is treated as free in repo/docs
- [x] hardcoded production URLs removed from theme extension
- [x] GraphQL Admin API error handling improved for current queries
- [x] required webhooks configured in app config
- [ ] Partner Dashboard pricing set to `Free`
- [ ] embedded app verified inside Shopify Admin
- [ ] install flow verified on a dev store
- [ ] uninstall verified on a dev store
- [ ] reinstall verified on a dev store
- [ ] theme app block flow verified end-to-end

## Short conclusion

From a repo and code perspective, Lemon Size is now set up as a free Shopify embedded app and the issues previously listed in this review file have been fixed.

Before submission, the only remaining tasks are the Shopify-side pricing setting and final live QA on a real dev store.
