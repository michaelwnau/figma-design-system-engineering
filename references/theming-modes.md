# Multi-Theme Orchestration via Modes

Figma Variables with Modes are the right primitive for managing dark mode, multi-brand themes, and density shifts. The pattern: one `Primitives` collection holds raw values, one `Theme` collection holds semantic aliases, and Modes within the Theme collection swap the underlying primitive references per theme.

The wrong pattern: duplicating files or pages per theme. This guarantees drift — the moment two files exist, they will diverge.

## The structural pattern

```
Primitives collection (one mode: "Default")
├── color.gray.50  → #F9FAFB
├── color.gray.900 → #111827
├── color.brand.500 → #3B82F6
├── spacing.4 → 4px
└── ...

Theme collection (modes: Light, Dark, [optional: HighContrast, BrandX])
├── color.bg.page             [Light: → color.gray.50] [Dark: → color.gray.900]
├── color.bg.surface-primary  [Light: → color.white]   [Dark: → color.gray.800]
├── color.text.primary        [Light: → color.gray.900][Dark: → color.gray.50]
└── ...
```

Components reference only the Theme collection. Switching modes swaps the theme variable resolution without touching any component.

## Step-by-step setup

### 1. Isolate primitives

Create a `Primitives` collection. Populate with the full color ramp, spacing scale, radius scale, type scale, elevation scale. No semantic names at this tier — `color.gray.900`, not `color.bg.primary`.

Primitives have a single mode named `Default`. Only the Theme collection uses multiple modes.

### 2. Create the Theme collection

Create a `Theme` collection. Define variables by **function**, not appearance:

```
color.bg.page
color.bg.surface-primary
color.bg.surface-elevated
color.text.primary
color.text.secondary
color.text.muted
color.text.inverse
color.border.subtle
color.border.default
color.border.strong
color.feedback.danger
color.feedback.success
color.feedback.warning
color.brand.primary
```

The names should answer "what role does this play?" not "what does it look like?"

### 3. Alias variables

For each Theme variable, right-click the value field and select **Create Alias**. Link it to the corresponding Primitives variable. The value field now displays the primitive name instead of a raw hex code.

### 4. Add modes

Click the `+` icon in the Theme collection header to add columns. Common modes:

- `Light` (default)
- `Dark`
- `HighContrast` (accessibility variant — typically AAA contrast ratios)
- `BrandX` (for multi-brand systems — `BrandA`, `BrandB`, etc.)
- `Compact` / `Comfortable` (density shifts — typically spacing-focused)

### 5. Shift values per mode

In each mode column, update the alias to point to the appropriate primitive:

```
Variable: color.bg.page
├─ Mode (Light): → primitive.white   (#FFFFFF)
├─ Mode (Dark):  → primitive.gray.900 (#111827)
└─ Mode (HighContrast): → primitive.black (#000000)
```

Repeat for every semantic variable. The mode-switching test: select a frame and switch the mode in the inspector — every color should update without any component edits.

## Multi-domain modes

Modes are not limited to color. Three common patterns:

### Density modes (spacing-driven)

Create a `Density` collection with modes `Comfortable` / `Compact` / `Dense`. Theme variables for spacing alias to primitives that differ per mode:

```
Variable: spacing.element.md
├─ Comfortable: → primitive.spacing.16 (16px)
├─ Compact:     → primitive.spacing.12 (12px)
└─ Dense:       → primitive.spacing.8  (8px)
```

### Brand modes (multi-tenant systems)

For a platform serving multiple brands (white-label SaaS, multi-product suites), put brand-specific primitives in a `BrandPrimitives` collection with modes per brand. The Theme collection aliases to these:

```
BrandPrimitives collection (modes: BrandA, BrandB):
  brand.color.500 [BrandA: #FF6B35] [BrandB: #6B5BD3]
  brand.font.heading [BrandA: "Inter"] [BrandB: "Söhne"]

Theme collection:
  color.brand.primary → brand.color.500 (resolves per brand mode)
  typography.heading.family → brand.font.heading
```

### Platform modes (web vs. native)

Some token values legitimately differ between web and native (e.g., font size base — 16px on web, 17pt on iOS). Modes can express this, though it is often cleaner to handle via separate Style Dictionary build outputs rather than runtime modes.

## Mode resolution rules

Figma resolves modes hierarchically. A frame uses the mode set on it, or inherits from its parent if not explicitly set. The top-level Page has a default mode for each collection.

When auditing, common mistakes:

- **Mode set on the wrong level.** A `Dark` mode applied to a single button instead of the page — the button looks correct in isolation but breaks when nested.
- **Inconsistent mode across collections.** Theme is `Dark` but Density is left at default — fine if intentional, drift if accidental.
- **Variables not aliased.** A Theme variable with a literal value (`#111827`) instead of an alias to `color.gray.900` — it will not respond to mode switching. The naming linter cannot catch this; only inspection can.

## Code-side resolution

Style Dictionary builds separate output files per mode:

```
build/
├── tokens.light.css   (--color-bg-page: #FFFFFF;)
├── tokens.dark.css    (--color-bg-page: #111827;)
└── tokens.compact.css (--spacing-element-md: 12px;)
```

The application loads the appropriate file based on user preference (Tailwind's `dark:` variant, a `data-theme` attribute, or a JavaScript theme provider). The CSS custom property names stay identical across modes — only the values differ.

```css
/* tokens.light.css */
:root {
  --color-bg-page: #FFFFFF;
  --color-text-primary: #111827;
}

/* tokens.dark.css */
:root[data-theme="dark"] {
  --color-bg-page: #111827;
  --color-text-primary: #F9FAFB;
}
```

## Adding a new mode (post-launch)

The most common operation after initial setup. The steps:

1. Add a new column to the Theme collection (e.g., `Sepia`).
2. For each variable, set the alias for the new mode. If most values are identical to an existing mode, duplicate that column first and then adjust deltas.
3. Re-export tokens.json.
4. Run the Style Dictionary build to produce the new output file.
5. Wire the new mode into the app's theme switcher.
6. Audit components in the new mode — typically reveals semantic tokens that were under-specified (e.g., a "muted" text that looks fine in Light and Dark but illegible in Sepia).

## Anti-patterns

- **Modes used to express variant state.** `Hover` as a Theme mode is wrong — hover is a component state, not a theme. The token graph should not encode interaction state.
- **Too many modes.** Four modes is a lot. Eight modes is usually a sign that some of them should be separate collections (Density and Theme should be separate collections, not nested modes within one collection).
- **Mode-specific tokens.** If a token only makes sense in one mode (`color.dark.something`), it does not belong in the Theme collection — either reshape it to be cross-mode semantic, or move it to component-tier overrides.
- **Forgetting to alias.** A Theme variable with literal values per mode (instead of aliasing to primitives) works, but it duplicates the primitive layer's job and makes palette refactors painful. Always alias.
