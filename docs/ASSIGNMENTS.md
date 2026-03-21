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

What this means in practice:
- Priority is used when two or more assignment rules of the same type could match the same product.
- Lemon Size will choose the rule with the lower number first.
- A smaller number means a stronger rule.

Example:
- Product assignment `Nike Air Max` with priority `50`
- Product assignment `Nike Air Max` with priority `100`

In this case, the rule with priority `50` wins because it is checked first.

Another example:
- Collection rule `Shoes` with priority `100`
- Collection rule `Sale Shoes` with priority `200`

If a product matches both collection rules, the `100` rule wins before the `200` rule.

Good rule of thumb:
- Use lower numbers like `50` or `100` for your most important direct rules
- Use medium numbers like `200` or `300` for less important direct rules
- Keep your numbering consistent so future edits are easier to manage

Important note:
- Priority only breaks ties inside the same rule type.
- Lemon Size still checks rule types in order first, such as Product before Collection, and Collection before Product type.

Cross-rule example:
- A product called `Nike shoes` matches a Vendor assignment rule `Nike` with priority `100`
- The same product also matches a Keyword rule `shoe` with priority `500`

The Vendor assignment wins first, because direct assignments are checked before keyword fallback rules.
Inside keyword rules themselves, lower numbers still win first in the same way.

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
