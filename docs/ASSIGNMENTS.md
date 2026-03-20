# Assignments

## What Assignments Do

Assignments are direct matching rules that connect a size table to products or catalog data.

These rules are checked before keyword rules.

## Assignment Types

You can assign a size table by:
- Product
- Collection
- Product type
- Vendor
- Tag
- Default fallback

## Matching Order

Lemon Size checks direct assignments in this order:

1. Product
2. Collection
3. Product type
4. Vendor
5. Tag

If no direct assignment matches, keyword fallback rules are checked next.

## Priority

Lower priority values win first inside the same kind of rule.

Example:
- Priority `50` wins before Priority `100`

## Bulk Assignment Helpers

Assignments support bulk creation by:
- multiple products
- multiple collections
- multiple type values
- multiple vendor values
- multiple tag values

This helps merchants create many rules in one save.

## Best Practices

- Use direct assignments first whenever possible.
- Use product assignments for highly specific cases.
- Use collection or type assignments for broad catalog structure.
- Keep priorities simple and deliberate.

## What To Be Careful With

- Too many overlapping assignment rules can make debugging harder.
- If multiple direct rules could match, the matching order and priority will decide the winner.
- Deleting a table that is still used by assignments is blocked for safety.

