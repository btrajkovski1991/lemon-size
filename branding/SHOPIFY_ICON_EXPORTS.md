# Lemon Size Icon Exports

These source files are prepared from the Lemon Dev brand mark for Shopify listing and app branding use.

## Source files

- `branding/lemon-size-app-icon-square-light.svg`
- `branding/lemon-size-app-icon-square-dark.svg`
- `branding/lemon-size-app-icon-maskable.svg`
- `branding/lemon-size-favicon.svg`
- `branding/lemon-size-navigation-icon.svg`

## Recommended exports

Export these PNG sizes from the SVG source files:

### Shopify app icon / theme-editor thumbnail

- `1200x1200` PNG

Recommended source:
- `branding/lemon-size-app-icon-square-light.svg`

Likely Shopify setting:
- `Dev Dashboard -> App -> Settings -> App icon`

This is the most likely source for the full-color image thumbnail shown beside the app block inside the theme editor. This is an inference based on Shopify's current dashboard behavior and developer forum guidance.

### Shopify App Store listing icon

- `1200x1200` PNG

Recommended source:
- `branding/lemon-size-app-icon-square-light.svg`

### Admin / general square icon variants

- `256x256`
- `128x128`

Recommended sources:
- `branding/lemon-size-app-icon-square-light.svg`
- `branding/lemon-size-app-icon-square-dark.svg`

### Favicon / small UI icon

- `64x64`
- `32x32`

Recommended source:
- `branding/lemon-size-favicon.svg`

### Maskable / padded square

- `512x512`

Recommended source:
- `branding/lemon-size-app-icon-maskable.svg`

### Shopify admin navigation icon

- `16x16` SVG
- single color
- transparent background

Recommended source:
- `branding/lemon-size-navigation-icon.svg`

Shopify setting:
- `Partner Dashboard -> App setup -> Embedded app -> Navigation icon`

## Notes

- These files use the Lemon mark only, not the full wordmark, which is better for square app icons.
- The full wordmark remains available in `public/images/lemondev-logo-black.svg`.
- Shopify's navigation icon requirements are documented as a `16x16` SVG uploaded through the Partner Dashboard.
- Shopify's app branding guidance documents app icons as `1200x1200` PNG or JPEG with square corners and padding.
- If the theme editor still shows a broken image after updating the app icon, uninstalling and reinstalling the app in the dev store may help refresh Shopify's cached metadata.
