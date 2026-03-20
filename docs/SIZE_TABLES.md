# Size Tables

## What Size Tables Are For

Use `Size tables` to:
- create new tables
- edit saved tables
- duplicate existing tables
- import table data from CSV or pasted text
- add guide text and guide images
- manage the base measurement unit

## Recommended Table Structure

A table should usually include:
- one identifying column, such as `SIZE`, `RING SIZE`, or `FIT`
- one or more measurement columns

### Clothing Example

- `SIZE`
- `CHEST`
- `WAIST`
- `HIP`
- `LENGTH`

### Shoe Example

- `SIZE`
- `FOOT LENGTH`

### Ring Example

- `RING SIZE`
- `DIAMETER`
- `CIRCUMFERENCE`

### Necklace Example

- `STYLE`
- `NECKLACE LENGTH`
- `DROP LENGTH`
- `THICKNESS`

### Bracelet Example

- `FIT`
- `WRIST`
- `BRACELET LENGTH`
- `WIDTH`

## Units

Lemon Size supports:
- `cm`
- `mm`
- `in`

Important:
- the base unit must match the values entered in the table
- if the table is entered in `mm`, the base unit must be `mm`
- if the table is entered in `cm`, the base unit must be `cm`
- if the table is entered in `in`, the base unit must be `in`

## Storefront Unit Switching

Shoppers can switch between:
- `MM`
- `CM`
- `INCHES`

## Which Columns Convert Automatically

Lemon Size converts measurement-style columns such as:
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

These are usually treated as labels and not converted:
- `SIZE`
- `US`
- `UK`
- `EU`
- `EUR`
- `JP`

## Jewelry Best Practices

### Rings

Best fields:
- `RING SIZE`
- `DIAMETER`
- `CIRCUMFERENCE`

### Necklaces

Best fields:
- `NECKLACE LENGTH`
- `CHAIN LENGTH`
- `DROP LENGTH`
- optional `THICKNESS`

Best practice:
- use length as the main sizing field
- use thickness as a secondary spec field

### Bracelets

Best fields:
- `WRIST`
- `BRACELET LENGTH`
- optional `WIDTH`

Best practice:
- use wrist and bracelet length as the main sizing logic
- do not rely on clasp thickness as the main fit field

## Guide Images

Each size table can include:
- an optional guide image
- a storefront visibility toggle

If `Display guide image on storefront` is enabled:
- the image will appear in the storefront size-guide modal

If disabled:
- the image stays saved but hidden on storefront

## Built-in Templates

The editor includes quick templates for:
- `Ring size`
- `Necklace size`
- `Bracelet size`

Templates fill in:
- title
- recommended unit
- starter guide text
- built-in guide image
- starter rows and columns

Templates are shortcuts only. They do not replace existing saved tables unless you save them.

## Importing Tables

Merchants can import using:
- CSV
- tab-separated text
- semicolon-separated text

Example:

```text
SIZE,CHEST,LENGTH
S,88,62
M,94,65
L,100,68
```

## Duplicate Tables

Duplicated tables:
- receive a unique copied title
- open directly in the editor
- can be changed and saved as a new table

## What To Be Careful With

- Do not save the wrong base unit.
- Do not use overly generic column names for measurement columns.
- Keep row labels clear and predictable.
- For jewelry, use real measured values where possible.

