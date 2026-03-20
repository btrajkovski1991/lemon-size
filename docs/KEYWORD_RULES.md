# Keyword Rules

## What Keyword Rules Are For

Keyword rules are fallback matching rules.

They are only used after direct assignments do not match.

## Supported Match Fields

Keyword rules can match:
- Any field
- Title
- Handle
- Product type
- Vendor
- Tag

## Best Use Cases

Use keyword rules when:
- the catalog is large
- naming patterns are predictable
- a broad fallback is needed

## Best Practices

- Keep keywords specific
- Avoid very broad generic words
- Use lower priority values for the keyword rule that should win first
- Prefer direct assignments when exact control matters

## What To Be Careful With

- Too many broad keyword rules can create confusing matches
- Keyword rules should not replace all direct assignments
- If multiple keyword rules match, lower priority values win first

## Helpful Tools

Use:
- `Home` preview matched chart
- `Rule tester`

to understand why a keyword rule won or lost

