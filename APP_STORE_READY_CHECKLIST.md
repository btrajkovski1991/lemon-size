# Lemon Size App Store Readiness

Status key:
- `[ ]` Not ready
- `[~]` In progress
- `[x]` Ready 

## Code Readiness

- [x] App is embedded and uses Shopify app auth.
- [x] Theme app extension exists for storefront rendering.
- [x] App proxy exists for storefront chart loading.
- [x] Privacy compliance webhooks are configured.
- [x] Typecheck passes.
- [x] Remove all leftover Shopify template/demo pages and actions from the main app home/help flow.
- [x] Replace placeholder app copy with merchant-facing Lemon Size copy on the main app home/help flow.
- [x] Reduce OAuth scopes to the minimum required by the final feature set.
- [x] Decide whether order-based recommendation remains in the public app.
- [ ] If recommendation remains, verify end-to-end order data flow and scope justification.
- [x] If recommendation is removed, remove dormant recommendation UX/code and `read_orders`.
- [x] Add a production-ready app home page with setup steps and status guidance.
- [x] Add a merchant help/support page inside the app.
- [x] Verify all empty/error states across charts, assignments, keyword rules, and storefront proxy.
- [~] Test extension UX on desktop and mobile themes.
- [ ] Verify install, uninstall, reinstall, and app block enablement on a dev store.
- [x] Replace template README content with Lemon Size project documentation.
- [x] Create a dev-store QA checklist for manual release testing.

## Shopify App Review Readiness

- [ ] Partner Dashboard listing content is prepared.
- [ ] App icon is prepared.
- [ ] App screenshots are prepared.
- [ ] App description and short description are written.
- [ ] Pricing is set to `Free`.
- [ ] Support email is configured.
- [ ] Privacy policy URL is published.
- [ ] Terms of service URL is published.
- [ ] Merchant support process is ready.
- [ ] Review testing instructions are written.
- [ ] Review screencast is recorded.
- [ ] Listing clearly explains theme app extension setup.
- [ ] Listing clearly explains that the app is for Online Store merchants.

## Scope Review

Current scopes in `shopify.app.toml`:
- `read_products`

Target guidance:
- Keep `read_products` if product context is needed.
- Remove `write_products` unless Lemon Size edits or creates product data.
- Remove `read_orders` unless the recommendation feature is fully shipped and justified.

## Immediate Next Steps

1. Verify install, uninstall, reinstall, and theme app block enablement on a dev store.
2. Test the theme extension on real desktop and mobile storefront themes.
3. Prepare Partner Dashboard assets and legal/support links.
4. Write review instructions and record the review screencast.

Manual QA guide:
- `docs/DEV_STORE_QA_CHECKLIST.md`

## Current Status Summary

Ready now:
- Embedded app shell
- Theme extension
- Storefront proxy route
- Compliance webhooks
- Merchant-facing home page
- Merchant-facing help page
- Merchant-facing rule tester
- Non-template Lemon Size README
- Passing typecheck

Main blockers now:
- Partner Dashboard listing/legal/support assets are still missing
- Real end-to-end merchant testing still needs to be completed
