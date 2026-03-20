# Lemon Size Dev Store QA Checklist

Use this checklist before submitting Lemon Size to the Shopify App Store. It focuses on the real merchant flow, storefront behavior, and the app block setup that cannot be fully verified from local typechecking alone.

## Test Setup

- Use a clean Shopify dev store with the Online Store sales channel enabled
- Install the latest Lemon Size build
- Use a published or previewable theme with product templates
- Prepare at least 3 products with different size setups:
  - one apparel product with sizes like `S`, `M`, `L`
  - one product with a direct assignment
  - one product that should match through keyword fallback

## Install Flow

- [ ] App installs without OAuth errors
- [ ] App opens correctly inside Shopify admin
- [ ] Home page loads without UI or data errors
- [ ] Help page loads correctly
- [ ] Size Charts, Assignments, Keyword rules, Rule tester, and Analytics pages all load

## First-Time Merchant Setup

- [ ] Create a new size table manually
- [ ] Create a size table using CSV or paste import
- [ ] Duplicate an existing size table
- [ ] Save a default size table
- [ ] Add a guide image and confirm the admin shows the correct image state

## Assignment Logic

- [ ] Create a direct product assignment
- [ ] Create a collection assignment
- [ ] Create a vendor, type, or tag assignment
- [ ] Confirm assignments appear correctly in the Rules list
- [ ] Confirm the correct product title and product image are shown in assignment cards
- [ ] Disable and re-enable an assignment
- [ ] Delete an assignment

## Keyword Rule Logic

- [ ] Create a keyword rule using `ANY`
- [ ] Create a keyword rule using a specific field such as `TITLE` or `TYPE`
- [ ] Confirm keyword rules appear correctly in the rules list
- [ ] Disable and re-enable a keyword rule
- [ ] Delete a keyword rule
- [ ] Verify direct assignments still win before keyword rules

## Rule Preview and Testing

- [ ] Use `Preview Matched Chart` on the Home page with a real product
- [ ] Confirm the selected product image and product information render correctly
- [ ] Confirm the winner explanation is correct
- [ ] Confirm rule conflict explanation is readable and accurate
- [ ] Use the Rule Tester page with manual values
- [ ] Confirm Rule Tester results match the real storefront result

## Theme App Block Setup

- [ ] Open `Online Store > Themes > Customize`
- [ ] Open a product template
- [ ] Add the Lemon Size app block to the product template
- [ ] Save the theme
- [ ] Confirm the block is visible on the product page
- [ ] Confirm the app is added as an app block, not expected under App embeds

## Storefront Behavior

- [ ] Size guide button appears on assigned products
- [ ] Size guide button does not appear where no chart should match
- [ ] Modal opens and closes correctly
- [ ] Table title, guide text, tips, and disclaimer render correctly
- [ ] Guide image displays when `Display guide image on storefront` is enabled
- [ ] Guide image stays hidden when that setting is disabled
- [ ] Unit switcher works for `CM`, `MM`, and `INCHES`
- [ ] Measurement values convert correctly between supported units
- [ ] Non-measurement columns are not incorrectly converted

## Variant-Aware Row Filtering

- [ ] Product with sizes `S`, `M`, `L` does not show unavailable rows such as `XS` or `XL`
- [ ] Product with ring or jewelry variants filters to matching size rows
- [ ] If no rows match exactly, the chart still behaves gracefully

## Mobile and Desktop UX

- [ ] Storefront modal looks correct on desktop
- [ ] Storefront modal looks correct on mobile
- [ ] Sticky first column works on wide tables
- [ ] Long guides are readable on mobile
- [ ] The mobile `How to measure` collapse/expand toggle works
- [ ] Empty and failure states are readable on both desktop and mobile

## Analytics

- [ ] Open a size guide on at least one product page
- [ ] Confirm an analytics event is recorded
- [ ] Analytics page shows total opens, top tables, and top products
- [ ] Recent events list shows new events
- [ ] Date range filters work
- [ ] CSV export works

## Uninstall / Reinstall

- [ ] Uninstall the app from the dev store
- [ ] Confirm uninstall does not leave the app usable in admin
- [ ] Reinstall the app
- [ ] Confirm the app opens again correctly
- [ ] Re-add or confirm theme app block behavior after reinstall if needed

## Submission Confidence Check

- [ ] No obvious console errors in the storefront
- [ ] No obvious runtime errors in app admin
- [ ] No broken images or overlapping UI sections
- [ ] Legal/support links are ready for publication
- [ ] Screenshots and review video can be recorded from the tested build

## Result

Mark the build as submission-ready only when the full merchant flow, storefront behavior, and uninstall/reinstall behavior have all been tested successfully on a real dev store.
