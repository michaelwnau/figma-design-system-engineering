---
name: figma-design-system-engineering
description: Engineer Figma design systems as deterministic, code-mappable infrastructure — W3C DTCG-compliant token hierarchies, prop-matched components, mode-based theming, and Figma-to-code handoff pipelines via Style Dictionary. Use this skill whenever the user is authoring, auditing, or documenting a Figma design system — including requests to organize Figma variables, name design tokens, set up primitive/semantic/component token tiers, map Auto Layout to Flexbox, design Figma component properties that mirror TypeScript interfaces, configure dark mode or multi-brand theming via variable modes, generate tokens.json or Style Dictionary configs, wire tokens into tailwind.config.js, write DESIGN_SYSTEM.md handoff docs, or audit a Figma file for token drift, unbound values, and convention violations.
---

# Figma Design System Engineering

This skill treats Figma as a **visual AST and data orchestration layer** — not a vector drawing canvas. Every artifact in the design system (token, component, layout primitive) must map 1:1 to a programmatic execution environment (React, TypeScript, CSS, Tailwind). The framework is deterministic by design: if a value cannot be expressed as a token, prop, or Auto Layout property, it does not belong in the system.

The skill operates in three modes. Identify the user's mode before loading reference material — loading everything upfront wastes context and produces unfocused output.

## Mode selection

| Mode | When to use | Primary deliverable |
|------|-------------|---------------------|
| **Author** | User is building or extending a design system | Token collections, component schemas, mode setup steps |
| **Document** | User needs a handoff doc, README, or agent-ready spec | `DESIGN_SYSTEM.md` or equivalent structured doc |
| **Audit** | User wants to find drift in an existing file | Drift report with severity-tagged findings |

If intent spans multiple modes, run them in this order: **Audit → Author → Document**. Audit first because drift findings inform authoring priorities; document last because the doc should reflect the final state, not an aspirational one.

## MCP gate checks (optional but recommended)

Figma MCP tools ground the work in the actual file state instead of abstract advice. Check at the start of each mode whether the user has either MCP server connected:

- **Official `Figma` MCP** — tools like `Figma:get_design_context`, `Figma:get_variable_defs`, `Figma:search_design_system`, `Figma:use_figma`.
- **`figma-console-lean`** — tools like `figma_get_design_system_kit`, `figma_get_variables`, `figma_lint_design`, `figma_audit_component_accessibility`, `figma_get_styles`.

If neither is available, proceed in **advisory mode**: answer conceptually, produce code/docs the user can apply manually, and tell them which manual checks to run in Figma. Do not pretend MCP results exist.

Per-mode gate checks:

- **Author** — after setup steps, suggest `figma_get_design_system_kit` (lean) or `Figma:search_design_system` to verify the collections and aliases landed correctly.
- **Document** — before drafting, run `figma_get_design_system_kit` + `figma_get_styles` if available, so the doc reflects real token names and values rather than placeholders.
- **Audit** — Audit mode **requires** ground truth. Either run `figma_lint_design`, `figma_audit_component_accessibility`, and `figma_get_variables`, or have the user paste/upload a `tokens.json` dump or screenshots. Do not produce a drift report from imagination.

## Core principles

These five principles drive every decision. When a user proposes something that violates one, push back and explain the why.

1. **Three-tier token hierarchy is non-negotiable.** Primitives → Semantic → Component. No hardcoded values in components. No raw hex codes referenced from a button. The reason: a single rebrand or theme shift should ripple through the whole system by changing primitive aliases, not by hunting through component instances. Details in `references/token-architecture.md`.

2. **Auto Layout compiles to Flexbox.** Every Figma frame's Auto Layout properties map 1:1 to CSS. If a layout cannot be expressed in Flexbox (direction, gap, padding, justify, align, wrap), it should not exist in the system — it will break at handoff. Details in `references/layout-as-code.md`.

3. **Figma component properties mirror TypeScript interfaces.** The Figma component's prop schema should be copy-pasteable into a `Props` interface (with type narrowing on Variant unions). The reason: prop parity eliminates the translation layer between designer and engineer. Details in `references/component-engineering.md`.

4. **Themes are variable modes, not duplicate files.** Dark mode, brand variants, density shifts — all are columns within a single `Theme` collection aliased to a `Primitives` collection. Duplicating files for themes guarantees drift. Details in `references/theming-modes.md`.

5. **Handoff is automated, not visual.** Use the Figma REST API plus Style Dictionary to compile tokens to CSS custom properties, `tailwind.config.js`, or platform-specific outputs. Visual inspection by an engineer introduces translation errors. Details in `references/handoff-pipeline.md`.

## Workflow: Author mode

1. **Confirm scope.** Greenfield or extending an existing system? Single-brand or multi-theme? Web only, or web + native? Tailwind, vanilla CSS, or styled-system? These answers determine which reference files to load and which assets to bundle into the user's project.

2. **Set up Primitives collection.** Load `references/token-architecture.md` and walk the user through creating the raw scales: color ramps, spacing scale, elevation, type ramp. No semantic meaning at this tier — these are the palette.

3. **Set up Theme (Semantic) collection.** Load `references/theming-modes.md`. Aliased to Primitives. Define modes (Light, Dark, etc.) as columns. Semantic names follow the convention `[domain].[category].[variant].[state].[scale]`.

4. **Engineer component schema.** Load `references/component-engineering.md`. For each component, define Figma properties that match the production TypeScript interface — Variant for structural changes, Boolean for conditional rendering, Instance Swap for slots, Text for string inputs.

5. **Enforce layout discipline.** Load `references/layout-as-code.md`. Every container uses Auto Layout. Sizing uses Fixed / Hug / Fill — these correspond to specific Flexbox patterns.

6. **Wire the handoff pipeline.** Load `references/handoff-pipeline.md`. Copy `assets/tokens.template.json`, `assets/style-dictionary.config.js`, and `assets/tailwind.config.template.js` into the user's project. Adjust paths and target outputs.

7. **MCP gate check.** Suggest running `figma_get_design_system_kit` or `Figma:search_design_system` to verify variable collections look right. Optionally run `scripts/lint_token_names.js` on the exported tokens.json to catch naming-convention violations.

## Workflow: Document mode

Produce a `DESIGN_SYSTEM.md` (filename adjustable per user preference — `BRAND.md`, `DS_HANDOFF.md`, etc.). Use this canonical structure. Adjust section depth based on what the user actually has set up — do not invent content for sections the system does not implement.

```
# [Project] Design System

## Overview
- Scope, theme/brand variants, target platforms, target frameworks

## Token Architecture
- Three-tier hierarchy explanation
- Naming convention: domain.category.variant.state.scale
- Primitive table (pull from MCP if available)
- Semantic table (pull from MCP if available)
- Component overrides (if used)

## Component Conventions
- Property design patterns (Variant / Boolean / Instance Swap / Text)
- Slot pattern usage for dynamic sub-layouts
- Component → TypeScript interface mapping (with example)

## Layout System
- Auto Layout → Flexbox mapping reference
- Sizing behaviors: Fixed / Hug / Fill and their CSS equivalents
- Grid and wrapping rules

## Theming
- Mode list (Light, Dark, density variants, brand variants)
- Alias mapping per mode
- How to add a new mode

## Handoff Pipeline
- Token export workflow (Figma REST API → tokens.json)
- Style Dictionary configuration
- Build outputs (Tailwind, CSS custom properties, native)
- CI integration

## Verification & Linting
- Required Figma plugins (Design Lint, Select Layers, Tokens Studio)
- Token naming linter (scripts/lint_token_names.js)
- Audit cadence and ownership
```

Pull the canonical mapping tables from the reference files directly — do not paraphrase. The Auto Layout → Flexbox matrix in `references/layout-as-code.md` and the token-tier table in `references/token-architecture.md` are reusable as-is.

If MCP is available, generate the Primitive and Semantic token tables from real file data using `figma_get_design_system_kit` or `Figma:get_variable_defs`. If not, leave a placeholder block and tell the user where to paste their exported token JSON.

## Workflow: Audit mode

Produce a structured drift report. Use this template:

```
# Design System Audit — [File or Component]

## Token Drift
- Unbound hardcoded values (hex, rem, px literals) — location + suggested token
- Unaliased primitive references from semantic-tier variables
- Naming-convention violations (regex: domain.category.variant.state.scale)

## Layout Drift
- Layers without Auto Layout
- Fixed sizing where Fill or Hug is structurally correct
- Magic numbers in padding/gap that should be spacing tokens

## Component Drift
- Detached instances
- Properties using the wrong primitive (Boolean where Variant fits, etc.)
- Missing prop mappings vs. production TypeScript interface

## Theming Drift
- Variables not aliased to primitives
- Missing modes (component works in Light but not Dark)
- Component-tier variables referencing Primitives directly (skipping Semantic)

## Severity & Recommendations
- Blocking (will break in code or theme switch)
- Warning (works today but introduces future drift)
- Nice-to-have (cleanup, consistency)
```

Audit workflow:

1. **Gate check.** Confirm MCP availability or a tokens.json/screenshot upload from the user. Without ground truth, refuse to invent findings — instead, give the user a checklist of manual checks.

2. **Run automated tools** (if MCP available): `figma_lint_design` for accessibility and structural issues, `figma_audit_component_accessibility` for components, `figma_get_variables` to inspect token bindings.

3. **Run the naming linter.** If the user can export tokens.json, run `scripts/lint_token_names.js` to validate the naming convention.

4. **Synthesize.** Map findings into the drift report template above. Severity-tag each finding. Recommend specific fixes — point to the relevant reference file section.

## Bundled assets

Copy these into the user's project when running Author mode, or reference them in Document mode.

- `assets/tokens.template.json` — W3C DTCG-compliant skeleton with color, spacing, typography, elevation tiers.
- `assets/style-dictionary.config.js` — Style Dictionary config that transforms tokens.json into CSS custom properties, a Tailwind theme object, and TypeScript exports.
- `assets/tailwind.config.template.js` — Tailwind config with `theme.extend` wired to CSS custom properties from Style Dictionary output.
- `scripts/lint_token_names.js` — Validates token names against `domain.category.variant.state.scale`. Invoke: `node scripts/lint_token_names.js path/to/tokens.json`.

## Reference files

Load only what the current task needs. SKILL.md is intentionally a router.

- `references/token-architecture.md` — Token tiers, naming, W3C DTCG conformance, grouping conventions.
- `references/layout-as-code.md` — Auto Layout → Flexbox matrix, sizing behaviors, the constraints engine.
- `references/component-engineering.md` — Property types, the Slot pattern, prop-to-TypeScript-interface mapping.
- `references/theming-modes.md` — Variable modes, alias setup, multi-brand orchestration, density shifts.
- `references/handoff-pipeline.md` — Figma REST API → Style Dictionary → build targets, verification and linting.

## Output style

Match the user's documentation register — most users of this skill are design engineers who want structured, scannable output. Default to:

- Headings + horizontal rules for major sections
- Tables for mapping matrices (Figma property → CSS, token tier → example)
- Fenced code blocks for token JSON, TypeScript interfaces, and config snippets
- Bullet lists for conventions and rules, prose for the *why*

Avoid prose-heavy explanations when a table will do. Avoid markdown padding (no decorative emojis, no horizontal rules every five lines). End deliverables with a single, focused next step — the next action the user should take, not a summary of what you just produced.
