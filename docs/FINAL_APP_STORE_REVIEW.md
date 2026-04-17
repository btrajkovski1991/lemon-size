# Lemon Size Final App Store Review

Last updated: April 17, 2026

## Overall status

Current recommendation: ready for final submission preparation, with no obvious code-level blocker found in this review pass.

This assessment is based on:
- repository review
- current Shopify app configuration
- privacy/compliance document review
- storefront extension and app proxy review
- successful production build

## What the app does

Lemon Size is a Shopify embedded app that helps merchants create reusable size charts, assign them to products and catalog rules, and show size guides on storefront product pages through a theme app block.

Core merchant-facing functionality:
- create and edit size charts
- import charts by CSV or pasted table data
- assign charts by product, collection, vendor, product type, and tag
- define keyword fallback rules
- preview and test rule resolution before checking the storefront
- display a storefront size-guide modal with unit switching and optional guide images
- track product-level and chart-level guide-open analytics

## What was added or improved

Recent work included:
- merchant-facing app home and help flows
- stronger storefront empty/error states
- theme app block branding with the Lemon Size mark in the storefront UI
- app and navigation icon assets prepared for Shopify branding
- generated `1200x1200` app icon PNG for Shopify upload
- privacy policy and terms wording tightened to better reflect actual data handling
- duplicate root files cleaned up from the repository

Relevant prepared assets and docs:
- `branding/lemon-size-app-icon-1200.png`
- `branding/lemon-size-navigation-icon.svg`
- `branding/SHOPIFY_ICON_EXPORTS.md`
- `docs/PRIVACY_POLICY.md`
- `docs/TERMS_OF_SERVICE.md`
- `docs/DEV_STORE_QA_CHECKLIST.md`

## Review findings

### No critical code blocker found

In this review pass, no obvious critical application bug or App Store submission blocker was found in the codebase.

Confirmed positives:
- embedded Shopify app setup is present
- theme app extension exists and is wired
- app proxy verification is implemented
- uninstall and privacy compliance webhooks are present
- OAuth scope is reduced to `read_products`
- current build passes successfully

## Residual risks and final checks

These are not hard code blockers, but they are still important before submission:

### 1. Manual dev-store QA must still be treated as required

The repo includes a strong QA checklist, but local review cannot replace final real-store validation.

Final manual checks should still be signed off:
- install
- uninstall
- reinstall
- theme app block enablement
- desktop storefront behavior
- mobile storefront behavior
- analytics capture

Reference:
- `docs/DEV_STORE_QA_CHECKLIST.md`

### 2. Shopify dashboard assets and URLs must be live and correct

Before submission, confirm these are published in Shopify/Partner Dashboard:
- app icon
- navigation icon
- privacy policy URL
- terms of service URL
- support email
- listing copy
- screenshots
- review instructions
- screencast

### 3. Privacy claims must stay narrowly accurate

The app should not claim that it "does not collect data".

The more accurate statement is:
- it does collect merchant, shop, session, configuration, and operational data
- it is not designed to collect customer personal data in its normal feature set

That wording is now reflected in:
- `docs/PRIVACY_POLICY.md`
- `docs/TERMS_OF_SERVICE.md`

## Privacy and compliance review

Current privacy/compliance position appears reasonable for submission:
- mandatory privacy webhooks are configured
- uninstall deletion is implemented
- shop redaction is implemented
- customer data request and customer redact endpoints exist
- app only requests `read_products`

Important nuance:
- deleting shop data after uninstall is generally acceptable and aligned with Shopify expectations, subject to legal or operational retention obligations
- privacy copy should continue to avoid overstating deletion guarantees for backups or transient logs

## Build verification

Verified in this review pass:
- `npm run build` completed successfully

## Submission recommendation

Recommendation: proceed to final submission packaging once the remaining dashboard/legal/listing items are confirmed live.

Practical go/no-go:
- Go for App Store submission if dev-store QA is complete and public legal/support URLs are already published
- Hold submission if any of those final non-code items are still missing

## Final short summary

Lemon Size appears solid in its current product shape:
- focused scope
- clear merchant value
- embedded admin UI
- real storefront extension flow
- privacy/compliance basics in place
- no obvious critical code issue found in this pass

From a code and product-readiness perspective, it looks close to submit-ready.
