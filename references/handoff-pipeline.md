# Automated Handoff Pipeline

Visual inspection by an engineer is the slowest, most error-prone way to translate design tokens into code. Treat Figma as a **headless database** — export tokens via the REST API, transform them with Style Dictionary, and ship platform-specific build outputs. Every value in the codebase should trace back to a Figma variable via a deterministic pipeline.

## The data flow

```
┌──────────────────┐      ┌──────────────┐      ┌────────────────────┐
│ Figma Variables  │ ───> │ tokens.json  │ ───> │ Build outputs:     │
│ (source of truth)│      │ (W3C DTCG)   │      │  • Tailwind config │
└──────────────────┘      └──────────────┘      │  • CSS variables   │
       Figma REST API       Style Dictionary    │  • TypeScript      │
       or Tokens Studio                         │  • iOS / Android   │
                                                └────────────────────┘
```

Each step is automated. The engineer's job is to wire the pipeline once and run it in CI on every design change.

## Step 1: Extract from Figma

Two viable paths:

### Path A: Tokens Studio plugin (recommended for most teams)

Install the [Tokens Studio for Figma](https://tokens.studio) plugin. It reads Figma Variables and pushes tokens.json to a connected Git repo on demand or on a schedule.

Pros: visual config, handles the W3C DTCG format natively, supports multi-mode export.
Cons: adds a tool to the toolchain, requires Tokens Studio Pro for advanced features.

### Path B: Custom Node script using the Figma REST API

Hit the `GET /v1/files/:file_key/variables/local` endpoint, transform the response into W3C DTCG format, write to disk.

Pros: no third-party plugin, full control over the transformation.
Cons: more code to maintain; the Figma API response format is verbose and requires explicit aliasing logic.

Minimal Node sketch:

```javascript
import fetch from 'node-fetch';
import fs from 'node:fs/promises';

const FILE_KEY = process.env.FIGMA_FILE_KEY;
const TOKEN = process.env.FIGMA_TOKEN;

const res = await fetch(
  `https://api.figma.com/v1/files/${FILE_KEY}/variables/local`,
  { headers: { 'X-Figma-Token': TOKEN } }
);
const { meta } = await res.json();

// Transform meta.variables into W3C DTCG format here.
// Resolve VARIABLE_ALIAS values to alias strings ({color.gray.900}).

await fs.writeFile('tokens.json', JSON.stringify(dtcgTokens, null, 2));
```

For a complete implementation, see the bundled `assets/tokens.template.json` for the expected output format and `assets/style-dictionary.config.js` for the downstream config.

### MCP shortcut

If the user has the official Figma MCP server connected, `Figma:get_variable_defs` returns the variable graph directly without writing any code. For one-time extraction or prototyping, this is the fastest path. Production pipelines still want a scripted approach for reproducibility.

## Step 2: Format as W3C DTCG

The output must conform to the W3C Design Tokens Community Group format:

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
        "$description": "Default surface background, used for cards and panels"
      }
    }
  },
  "spacing": {
    "4": {
      "$value": "4px",
      "$type": "dimension"
    }
  }
}
```

Key requirements:

- Every leaf must have `$value` and `$type`.
- Aliases use curly-brace syntax: `"{color.gray.900}"`.
- Groups (objects without `$value`) can have `$type` to apply a default type to descendants.
- Mode-specific files (`tokens.light.json`, `tokens.dark.json`) override the same paths with different values.

See `assets/tokens.template.json` for a complete starter file.

## Step 3: Transform with Style Dictionary

Style Dictionary is the canonical tool for the transformation step. It reads W3C DTCG JSON, applies platform-specific transforms (color format conversion, unit normalization, alias resolution), and writes build outputs.

Install:

```bash
npm install --save-dev style-dictionary
```

The bundled `assets/style-dictionary.config.js` produces:

- `build/css/tokens.css` — CSS custom properties at `:root` scope
- `build/css/tokens.dark.css` — Dark mode overrides at `:root[data-theme="dark"]`
- `build/ts/tokens.ts` — TypeScript exports of every token (typed)
- `build/tailwind/tokens.js` — A `theme.extend` object for `tailwind.config.js`

Run:

```bash
npx style-dictionary build
```

In CI:

```yaml
# .github/workflows/tokens.yml
on:
  push:
    paths: ['tokens/**']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx style-dictionary build
      - run: git diff --exit-code build/  # fail if outputs are stale
```

## Step 4: Wire build outputs into the app

### Tailwind

```javascript
// tailwind.config.js
const tokens = require('./build/tailwind/tokens.js');

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: tokens, // tokens.colors, tokens.spacing, etc.
  },
};
```

After this, classes like `bg-bg-surface-primary` and `text-text-primary` work, and they point to CSS custom properties that swap on theme change.

### Vanilla CSS

```typescript
// In the app entry:
import './build/css/tokens.css';
import './build/css/tokens.dark.css';
```

The `:root[data-theme="dark"]` selector activates when a theme provider sets the attribute on `<html>`.

### TypeScript (for non-CSS contexts)

```typescript
import { color, spacing } from './build/ts/tokens';

const styles = {
  background: color.bg.surfacePrimary,
  padding: spacing.element.md,
};
```

Useful for inline styles in canvas-based renderers, email templates, or environments where CSS variables are not available.

## Verification and component auditing

Automated pipelines do not catch every drift. Layer these checks:

### Token-name linting

Run `scripts/lint_token_names.js` against the exported tokens.json:

```bash
node scripts/lint_token_names.js tokens.json
```

This flags names that violate the `domain.category.variant.state.scale` convention. See `references/token-architecture.md` for the convention.

### Hardcoded-value detection (in code)

Add an ESLint rule (`eslint-plugin-no-hardcoded-colors`) or a custom regex check to fail CI when a `.tsx` file contains hex codes or raw px/rem values that should be tokens.

### Figma structural audit

Use the Figma MCP tools or plugins:

- `figma_lint_design` (lean) — full accessibility + structural lint
- `figma_audit_component_accessibility` (lean) — per-component a11y audit
- Plugin: [Design Lint](https://www.figma.com/community/plugin/801195587640428208) — finds detached styles
- Plugin: [Select Layers](https://www.figma.com/community/plugin/740272003522387221) — targets layout nodes missing Auto Layout

### Component contract tests

In the codebase, add tests that assert components only use tokens (no hardcoded values):

```typescript
// Example: snapshot test that captures computed CSS and grep for hex codes
test('Button has no hardcoded colors', () => {
  const html = renderToStaticMarkup(<Button variant="primary">Hi</Button>);
  expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}/);
});
```

## Failure modes to watch for

- **Stale build outputs.** Engineers edit `build/css/tokens.css` directly instead of regenerating. Add a git pre-commit hook or CI check that fails on manual edits to build/.
- **Alias chains that exceed Style Dictionary's resolution depth.** Long chains (Component → Semantic → Brand → Primitive) can hit resolver limits. Keep chains to 2-3 hops.
- **Mode-specific tokens leaking into primitives.** A primitive named `color.gray.dark900` is wrong — it encodes a mode in the primitive layer. The mode swap belongs in the Theme collection.
- **Unicode normalization on token names.** Some tools choke on em-dashes or non-ASCII characters in token names. Stick to `[a-z0-9.-]` in all token names.
- **CI not running on design-only PRs.** If designers push token changes via Tokens Studio and the CI does not rerun Style Dictionary, the build outputs drift. The CI workflow above guards against this.

## Adding a new platform (e.g., iOS or Android)

Style Dictionary supports platform-specific transforms out of the box. Extend the config:

```javascript
// In style-dictionary.config.js, add:
platforms: {
  // ... existing platforms
  ios: {
    transformGroup: 'ios-swift',
    buildPath: 'build/ios/',
    files: [{
      destination: 'Tokens.swift',
      format: 'ios-swift/class.swift',
      options: { className: 'DesignTokens' }
    }]
  },
  android: {
    transformGroup: 'android',
    buildPath: 'build/android/',
    files: [{
      destination: 'colors.xml',
      format: 'android/colors'
    }]
  }
}
```

The tokens.json source does not change — only the output transforms do. This is the payoff of the pipeline.
