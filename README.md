# Lemon Size

Lemon Size is a Shopify embedded app for creating size tables, assigning them to products, and showing them through a theme app extension on storefront product pages.

## What the app does

- Create custom size tables with columns, rows, guide text, and optional guide images
- Assign tables by product, collection, product type, vendor, tag, or default fallback
- Add keyword-based fallback rules for broader catalog matching
- Show a storefront size-guide modal through a theme app extension
- Let shoppers switch between `CM` and `INCHES` when the chart uses supported measurement units

## Main app areas

- `Home`
  - setup checklist
  - matched-chart preview for real products
  - rule conflict explanation
- `Assignments`
  - direct product and catalog-based chart assignments
- `Keyword rules`
  - fallback matching rules when direct assignments do not apply
- `Rule tester`
  - manual matcher simulation for product data
- `Size Charts`
  - chart builder, duplication, CSV import, guide image controls
- `Help`
  - merchant setup notes and troubleshooting

## Local development

Install dependencies:

```bash
npm install
```

Start development:

```bash
shopify app dev
```

Useful checks:

```bash
npm run typecheck
npm run build
```

## Storefront setup

1. Install the app on a Shopify dev store
2. Create one or more size charts in `Size Charts`
3. Add assignment rules in `Assignments`
4. Add keyword fallback rules only if needed
5. Open the theme customizer
6. Enable the Lemon Size app block on the product template
7. Visit a product page and confirm the size guide loads

## Matching order

The app resolves charts in this order:

1. Direct product assignment
2. Collection assignment
3. Product type assignment
4. Vendor assignment
5. Tag assignment
6. Keyword fallback rule
7. Default size chart

Lower priority numbers win within assignment rules or keyword rules of the same category.

## Project notes

- OAuth scopes are trimmed to `read_products`
- Recommendation / order-data flow is not part of the current public release
- The storefront uses an app proxy route plus a theme app extension
- Compliance webhooks are configured for public-app readiness

## App Store readiness

The repo includes:

- `APP_STORE_READY_CHECKLIST.md`
- `IMPROVEMENTS_ROADMAP.md`

Use those files to track code readiness, UX improvements, and Shopify App Store submission work.

## Support documentation

For merchant-facing support and website help content, see:

- `docs/LEMON_SIZE_SUPPORT_GUIDE.md`
- `docs/README.md`
- `docs/PRIVACY_POLICY.md`
- `docs/TERMS_OF_SERVICE.md`

## Remaining non-code work

Before public App Store submission, you still need:

- Partner Dashboard listing copy
- app icon and screenshots
- privacy policy URL
- terms of service URL
- support email / support workflow
- review instructions and screencast
- real install / uninstall / theme-enable QA on a dev store
