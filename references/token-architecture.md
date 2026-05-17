# Token Architecture and Taxonomy

The token system is the foundation of every design-system decision downstream. Get this wrong and components leak hex codes, themes drift, and rebrands take weeks instead of hours. The taxonomy below conforms to the [W3C Design Tokens Community Group specification](https://tr.designtokens.org/format/).

## The three-tier hierarchy

```
[Primitives / Global] ──> [Semantic / Alias] ──> [Component / Override]
   (Raw values)            (Intent and context)    (Scoped overrides)
```

The flow is one-directional: Components reference Semantics, Semantics reference Primitives. Components must **never** reference Primitives directly — doing so collapses the indirection layer that makes theming possible.

### Tier definitions

| Tier | Purpose | Figma implementation | Code translation | Example |
|------|---------|----------------------|------------------|---------|
| **Primitive** | Define the raw spectrum of options. No functional meaning. | Local Variables (Collection: `Primitives`) | Flat configuration object or theme variables | `color.gray.900 → #111827` |
| **Semantic** | Assign functional meaning and intent (roles, themes). | Local Variables (Collection: `Theme`, aliased to Primitives) | CSS custom properties or design tokens JSON | `color.bg.surface-primary → var(--color-gray-900)` |
| **Component** | Scope values to specific component definitions. | Figma component properties or scoped overrides | Component-level CSS or styled-system props | `button.primary.bg → var(--color-bg-surface-primary)` |

The reason for three tiers and not two: Primitives let you change the palette without touching anything semantic. Semantics let you change the theme without touching components. Component overrides let you handle the rare cases where a component needs a one-off value without polluting the semantic layer.

## Naming convention

Use dot-notation in Figma variable names, which translates to hyphenated identifiers in CSS:

```
[domain].[category].[variant].[state].[scale]
```

| Segment | Required | Examples |
|---------|----------|----------|
| `domain` | Yes | `color`, `spacing`, `typography`, `elevation`, `radius`, `motion` |
| `category` | Yes | `bg`, `text`, `border`, `brand`, `surface`, `feedback` |
| `variant` | Optional | `primary`, `secondary`, `muted`, `accent`, `danger` |
| `state` | Optional | `default`, `hover`, `active`, `disabled`, `focus` |
| `scale` | Optional | `xs`, `sm`, `md`, `lg`, `xl`, or numeric (`50`, `100`, `900`) |

### Examples by domain

```
color.brand.primary.default
color.text.muted.hover
color.bg.surface-primary
color.feedback.danger.default

spacing.layout.md
spacing.element.xs
spacing.layout.section.lg

elevation.surface.raised
elevation.overlay.modal

radius.sm
radius.pill

typography.heading.lg
typography.body.default
```

### Hyphen vs dot

Figma stores names with `/` as the hierarchy separator (so `color/bg/surface-primary` displays as nested groups). When exported to JSON or CSS, normalize to dots in JSON keys and hyphens in CSS custom property names:

```
Figma:    color/bg/surface-primary
JSON key: color.bg.surface-primary
CSS var:  --color-bg-surface-primary
```

The bundled linter (`scripts/lint_token_names.js`) enforces this convention against an exported tokens.json.

## W3C DTCG conformance

The W3C DTCG spec requires tokens to be objects with `$value` and `$type` properties. The Style Dictionary pipeline in `references/handoff-pipeline.md` depends on this format.

```json
{
  "color": {
    "gray": {
      "900": {
        "$value": "#111827",
        "$type": "color"
      }
    },
    "bg": {
      "surface-primary": {
        "$value": "{color.gray.900}",
        "$type": "color",
        "$description": "Default page background"
      }
    }
  }
}
```

Key rules:

- `$value` is required. Primitive values are literals (`"#111827"`, `"16px"`). Semantic and Component values are alias references in curly braces (`"{color.gray.900}"`).
- `$type` is required and constrains the value format. Common types: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `shadow`.
- `$description` is optional but recommended for semantic tokens — it tells the next person why this token exists.
- Nested objects without `$value` are **groups**, not tokens. Groups can have `$type` to apply a default type to their children.

## Grouping conventions

Mirror the Figma collection structure in your tokens.json:

```
tokens/
├── primitives.json       # raw scales (color.gray.900, spacing.4, etc.)
├── semantic.light.json   # semantic tokens in Light mode
├── semantic.dark.json    # semantic tokens in Dark mode
└── components/
    ├── button.json
    ├── card.json
    └── input.json
```

Style Dictionary merges these into a single token graph, with mode-specific files producing separate build outputs (`tokens.light.css`, `tokens.dark.css`).

## Anti-patterns to flag in audits

Reviewers and auditors should escalate these:

- **Hex codes inside components.** A button referencing `#3B82F6` instead of `color.brand.primary.default` is broken.
- **Primitive references in components.** A component variable aliased directly to `color.gray.900` skips the semantic layer — when the theme changes, the component will not follow.
- **Naming that smells like categories rather than intent.** `color.blue` is a primitive; `color.brand.primary` is semantic. A semantic name should answer "what role does this play?" not "what does it look like?"
- **Multiple semantic tokens with the same value.** If `color.bg.surface-primary` and `color.bg.page` both resolve to `color.gray.900`, ask whether they are really distinct intents or whether one is redundant. Sometimes they are genuinely different (page background vs. card surface); sometimes one should be removed.
- **States as separate variables instead of mode-or-property-driven.** `button.bg.hover` as a top-level token is usually wrong — hover states belong to the component, not the token graph, unless you are intentionally designing a state-token system.
