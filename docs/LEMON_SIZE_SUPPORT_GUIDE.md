# Lemon Size Support Guide

## Overview

Lemon Size is a Shopify embedded app for building size tables, assigning them to products, and showing a storefront size-guide modal on product pages.

It is designed to help merchants:
- create reusable size tables
- match the right table to the right product
- show clearer measurement guidance on storefront
- let shoppers switch supported measurement units
- review analytics for size-guide usage

## What Lemon Size Includes

### Home

Use `Home` to:
- see the onboarding checklist
- review setup progress
- preview which chart matches a real product
- inspect why a chart matched
- inspect rule conflicts

### Assignments

Use `Assignments` for direct matching rules.

Assignments can match by:
- Product
- Collection
- Product type
- Vendor
- Tag
- Default fallback

These rules are checked before keyword rules.

### Keyword Rules

Use `Keyword rules` for fallback matching.

Keyword rules can match product data by:
- Any field
- Title
- Handle
- Product type
- Vendor
- Tag

Keyword rules are useful when merchants want broader automatic matching after direct assignments fail.

### Rule Tester

Use `Rule tester` to simulate matching before a product is live or before changing real assignments.

It helps merchants test:
- title
- handle
- product type
- vendor
- tags
- collections
- product numeric ID

### Size Tables

Use `Size tables` to:
- create and edit tables
- add guide text and guide images
- duplicate tables
- import tables from CSV or pasted text
- use quick templates
- manage unit settings

### Analytics

Use `Analytics` to see:
- how often size guides are opened
- which tables are opened most
- which products trigger the most guide opens
- recent activity
- date-range trends
- hourly and weekday insights

### Help

Use `Help` for:
- setup instructions
- troubleshooting
- support details

## Basic Merchant Flow

### 1. Create a Size Table

Go to `Size tables`.

Create a new table and fill in:
- title
- unit
- columns
- rows
- optional guide title
- optional guide text
- optional guide image
- optional tips
- optional disclaimer

### 2. Assign the Table

Go to `Assignments`.

Create a rule that links the table to:
- a specific product
- a collection
- a vendor
- a product type
- a tag

If the merchant wants a default fallback, they can set one table as the default.

### 3. Add Keyword Rules Only If Needed

Go to `Keyword rules`.

Keyword rules should usually be used only when:
- direct assignments would be too time-consuming
- matching is broad and content-based
- a backup fallback is needed

### 4. Add the App Block in the Theme

Open:
- `Online Store`
- `Themes`
- `Customize`

Then add the Lemon Size app block to the product template.

Important:
- Lemon Size currently uses an app block on product templates
- it is not an App Embed

### 5. Test on a Product Page

Open a storefront product page and confirm:
- the size-guide button appears
- the correct table opens
- units switch correctly
- guide image displays correctly when enabled
- only relevant size rows appear when variant filtering is available

## Matching Order

Lemon Size resolves tables in this order:

1. Direct product assignment
2. Collection assignment
3. Product type assignment
4. Vendor assignment
5. Tag assignment
6. Keyword rule fallback
7. Default size chart

Inside the same rule type, lower priority values win first.

## Size Tables

### Recommended Table Structure

A table should usually contain:
- one identifying column, such as `SIZE`, `RING SIZE`, or `FIT`
- one or more measurement columns

Examples:

#### Clothing

- `SIZE`
- `CHEST`
- `WAIST`
- `HIP`
- `LENGTH`

#### Shoes

- `SIZE`
- `FOOT LENGTH`

#### Rings

- `RING SIZE`
- `DIAMETER`
- `CIRCUMFERENCE`

#### Necklaces

- `STYLE`
- `NECKLACE LENGTH`
- `DROP LENGTH`
- `THICKNESS`

#### Bracelets

- `FIT`
- `WRIST`
- `BRACELET LENGTH`
- `WIDTH`

## Units and Conversion

Lemon Size supports:
- `cm`
- `mm`
- `in`

Shoppers can switch between:
- `MM`
- `CM`
- `INCHES`

### Conversion Notes

The storefront conversion uses standard measurement rules:
- `1 inch = 2.54 cm`
- `1 cm = 10 mm`
- `1 inch = 25.4 mm`

### Important Rule

The table unit must match the unit the merchant actually entered in the table.

Examples:
- if values are entered in `cm`, set the table unit to `cm`
- if values are entered in `mm`, set the table unit to `mm`
- if values are entered in `in`, set the table unit to `in`

If the wrong base unit is saved, storefront conversion will be wrong.

### Which Columns Convert Automatically

Lemon Size converts measurement-style columns, including:
- `LENGTH`
- `CHEST`
- `WAIST`
- `HIP`
- `INSEAM`
- `SHOULDER`
- `SLEEVE`
- `BUST`
- `UNDERBUST`
- `NECK`
- `WRIST`
- `FOOT`
- `HEIGHT`
- `DIAMETER`
- `CIRCUMFERENCE`
- `FINGER SIZE`
- `CHAIN LENGTH`
- `NECKLACE LENGTH`
- `BRACELET LENGTH`
- `THICKNESS`
- `WIDTH`
- `DROP LENGTH`
- `GIRTH`
- `BAND`

Columns like these are usually treated as labels and not converted:
- `SIZE`
- `US`
- `UK`
- `EU`
- `EUR`
- `JP`

### Best Practice for Rings

Use:
- `RING SIZE` for the labeled size system
- `DIAMETER` and `CIRCUMFERENCE` for measured values

### Best Practice for Necklaces

Use:
- `NECKLACE LENGTH`
- `CHAIN LENGTH`
- `DROP LENGTH`
- optional `THICKNESS`

Recommended:
- use length as the main sizing field
- use thickness as a product-spec field, not the main fit field

### Best Practice for Bracelets

Use:
- `WRIST`
- `BRACELET LENGTH`
- optional `WIDTH`

Recommended:
- use wrist and bracelet length as the main sizing logic
- do not rely on clasp thickness as the main fit field

## Row Filtering by Product Variants

Lemon Size can filter visible size-table rows using the product’s available variant options.

This helps prevent showing rows for sizes the product does not actually offer.

Example:
- if a product only has `M`, `L`, and `XL`
- the storefront should avoid showing `XS`, `S`, or `XXL`

### How It Works

The storefront collects product option values from Shopify and sends them to the app proxy.

The app proxy then tries to keep only rows that match the available product sizes.

The matcher now prefers size-like columns first, such as:
- `SIZE`
- `RING SIZE`
- `FINGER SIZE`
- `SHOE SIZE`
- `NECKLACE LENGTH`
- `BRACELET LENGTH`
- `CHAIN LENGTH`
- `CIRCUMFERENCE`
- `DIAMETER`
- `WRIST`

If no size-like columns exist, it falls back to broader row scanning.

### Important Merchant Note

For row filtering to work well:
- row values should actually match Shopify variant values
- size rows should be clearly labeled
- measurement rows should not be mixed with unrelated product text

## Guide Images

Each size table can have:
- an optional guide image
- a storefront visibility toggle

If `Display guide image on storefront` is enabled:
- the image is shown in the size-guide modal

If disabled:
- the image remains saved but hidden on storefront

### Built-in Image Presets

Lemon Size currently supports built-in preset images for categories such as:
- Tops
- Dress
- Ring
- Bracelet
- Necklace

Merchants can also paste their own image URL or path.

## Built-in Templates

The size-table editor includes quick templates for:
- Ring size
- Necklace size
- Bracelet size

Templates fill in:
- title
- recommended unit
- starter guide text
- guide image
- starter rows and columns

Templates are shortcuts only.

They do not replace or overwrite existing saved tables unless the merchant saves the edited template as a table.

## CSV / Paste Import

Merchants can import table data using:
- CSV
- tab-separated content
- semicolon-separated content

The first row is treated as the header row.

Example:

```text
SIZE,CHEST,LENGTH
S,88,62
M,94,65
L,100,68
```

## Duplicate Tables

Merchants can duplicate an existing table.

Duplicated tables:
- receive a unique copied title
- open directly in the editor
- can be edited and saved as a new table

## Analytics

Analytics tracks successful storefront size-guide opens.

### What Analytics Can Show

- total guide opens
- top size tables
- top products
- recent trend
- hourly breakdown
- best day
- best hour
- best weekday + hour
- recent events
- previous-period comparison

### Recent Events

Recent events show:
- product name
- product handle
- size table opened
- timestamp

Recent events support:
- pagination
- row numbering
- event-only date/time filtering

## Things to Be Careful With

### 1. Unit Mismatch

If a merchant enters values in one unit but saves a different base unit, storefront conversion will be incorrect.

### 2. Generic Column Names

If measurement columns are too generic, storefront conversion and row filtering may be less accurate.

Prefer clear names like:
- `CHEST`
- `WAIST`
- `DIAMETER`
- `CIRCUMFERENCE`
- `WRIST`
- `NECKLACE LENGTH`

### 3. Overusing Keyword Rules

Too many broad keyword rules can create confusing matches.

Best practice:
- use direct assignments first
- use keyword rules only as fallback

### 4. Multiple Matching Rules

If several rules match the same product:
- lower-priority values win within the same rule type
- direct assignments still beat keyword rules

### 5. Hidden Guide Images

A guide image can exist in the table but still be hidden on storefront if:
- `Display guide image on storefront` is turned off

### 6. Theme Setup Confusion

Lemon Size currently requires the app block to be added to the product template.

It does not appear under `App embeds`.

## Troubleshooting

### The size-guide button is not visible

Check:
- the app is installed
- the app block is added to the product template
- the product actually resolves to a size chart

### The wrong chart appears

Check:
- assignment priorities
- keyword rules
- whether a default chart is taking over
- Home preview and Rule tester explanations

### The guide image does not appear

Check:
- the table has a guide image saved
- `Display guide image on storefront` is enabled
- the image URL/path is valid

### Rows are not filtering correctly

Check:
- Shopify variant values
- table row labels
- size-like column names
- whether the table uses values that match the product’s actual variants

### Unit conversion looks wrong

Check:
- the saved base unit
- the actual values inside the table
- whether measurement columns are named clearly

## Support Contact

Support email:

`hello@lemon.dev`

## Recommended Website Support Sections

For a support website, this guide can be split into pages like:

1. Getting Started
2. Creating Size Tables
3. Assignments and Matching
4. Keyword Rules
5. Unit Conversion
6. Jewelry Tables
7. Storefront Setup
8. Analytics
9. Troubleshooting
10. FAQ

