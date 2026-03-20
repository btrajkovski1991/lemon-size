# Troubleshooting

## The Size Guide Button Does Not Appear

Check:
- the app is installed
- the app block is added to the product template
- the product resolves to a chart

## The Wrong Size Table Opens

Check:
- assignment priorities
- overlapping direct assignments
- keyword fallback rules
- whether a default chart is taking over

Use:
- `Home` preview
- `Rule tester`

to inspect the winner and conflicts

## The Guide Image Does Not Appear

Check:
- the table has a guide image saved
- `Display guide image on storefront` is enabled
- the image URL/path is valid

## Rows Are Not Filtering Correctly

Check:
- Shopify variant option values
- row labels
- size-like column names
- whether table row values actually match the product’s variants

The filtering system works best when tables use clear size-like columns such as:
- `SIZE`
- `RING SIZE`
- `FINGER SIZE`
- `NECKLACE LENGTH`
- `BRACELET LENGTH`
- `DIAMETER`
- `CIRCUMFERENCE`

## Unit Conversion Looks Wrong

Check:
- the saved base unit
- the real values in the table
- whether measurement columns are named clearly

Remember:
- `1 inch = 2.54 cm`
- `1 cm = 10 mm`
- `1 inch = 25.4 mm`

## The Guide Appears but Data Looks Empty

Check:
- the chart has columns and rows
- the product actually matches the table
- row filtering is not hiding everything because the row values do not match the product variants

## Analytics Is Empty

Check:
- the analytics migration is applied
- the storefront size guide has been opened successfully
- the selected date range is not too narrow

## Theme Setup Confusion

Lemon Size currently uses a product-template app block.

It does not appear under Shopify `App embeds`.

