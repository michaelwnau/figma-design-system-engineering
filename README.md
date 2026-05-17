# figma-design-system-engineering

A Claude skill for engineering Figma design systems as deterministic, code-mappable infrastructure. This skill treats Figma not as a vector drawing canvas but as a visual abstract syntax tree and data orchestration layer for UI engineering. Every artifact it produces — token collections, component schemas, layout conventions, handoff pipelines — maps 1:1 to a programmatic execution environment (React, TypeScript, CSS, Tailwind).

The skill operates across three modes: Author (building or extending a system), Document (producing agent-ready handoff documentation), and Audit (finding drift in an existing file). It is designed to work with or without Figma MCP connections — MCP is used as a gate check when available, and the skill degrades gracefully to advisory mode when it is not.

---

## Scope

This skill covers the full lifecycle of a Figma design system:

- Structuring W3C DTCG-compliant token hierarchies (Primitives, Semantic, Component tiers)
- Naming tokens according to the `domain.category.variant.state.scale` convention
- Mapping Figma Auto Layout properties to CSS Flexbox equivalents
- Designing Figma component properties that mirror TypeScript interfaces
- Configuring multi-theme orchestration via Figma Variable Modes
- Generating `tokens.json`, Style Dictionary configurations, and Tailwind theme objects
- Producing structured `DESIGN_SYSTEM.md` handoff documentation
- Auditing existing files for token drift, layout drift, and component drift

It is intended for design engineers working in React and Tailwind ecosystems, and for agentic workflows where downstream agents or engineers need a structured, unambiguous specification to build from.

---

## MCP Dependencies

The skill checks for MCP availability at the start of each mode and uses it when present. Neither server is required — if neither is connected, the skill runs in advisory mode and produces documentation and checklists the user applies manually.

### Figma (official)

- Server: `https://mcp.figma.com/mcp`
- Tools used: `get_design_context`, `get_variable_defs`, `search_design_system`, `use_figma`
- Used for: reading existing variable collections, inspecting component properties, executing JavaScript in the Figma plugin context to read and write file data

### figma-console-lean

- Server: local Figma Desktop Bridge plugin
- Tools used: `figma_get_design_system_kit`, `figma_get_variables`, `figma_get_styles`, `figma_lint_design`, `figma_audit_component_accessibility`
- Used for: design system kit extraction, structural linting, accessibility auditing, variable inspection

### Gate check behavior per mode

| Mode | MCP behavior |
|------|-------------|
| Author | Optional. After setup steps, runs `figma_get_design_system_kit` or `search_design_system` to verify collections landed correctly. |
| Document | Optional but recommended. Runs `figma_get_design_system_kit` + `figma_get_styles` before drafting so token tables reflect real values rather than placeholders. |
| Audit | Strongly recommended. Without MCP or a tokens.json export, the skill produces a manual checklist rather than findings. It will not invent audit results. |

---

## Core Principles

These five principles are enforced by the skill. When a user proposes something that violates one, the skill pushes back and explains the reasoning.

1. Three-tier token hierarchy is non-negotiable. Primitives carry raw values, Semantics carry intent and alias Primitives, Components scope values and alias Semantics. Components must never reference Primitives directly.

2. Auto Layout compiles to Flexbox. Every layout frame must express its structure in Auto Layout properties (direction, gap, padding, alignment, sizing mode). If a layout cannot be expressed this way, it does not belong in the system.

3. Figma component properties mirror TypeScript interfaces. Variant properties map to discriminated unions, Boolean properties map to boolean props, Instance Swap properties map to ReactNode or component refs, and Text properties map to string props.

4. Themes are variable modes, not duplicate files. Dark mode, brand variants, and density shifts are columns within a single Theme collection aliased to a Primitives collection. File duplication for theming guarantees drift.

5. Handoff is automated. The Figma REST API plus Style Dictionary compiles tokens to CSS custom properties, Tailwind theme objects, and platform-specific outputs. Visual inspection by an engineer is not a handoff strategy.

---

## Information Architecture

```
figma-design-system-engineering/
│
├── README.md
│   This file.
│
├── SKILL.md
│   The primary entry point. Claude reads this first on every invocation.
│   Contains the mode router (Author / Document / Audit), per-mode workflows,
│   MCP gate check instructions, output style conventions, and pointers to all
│   reference files and bundled assets. Does not contain detailed reference
│   material — it delegates to the references/ directory to keep context lean.
│
├── references/
│   Loaded selectively based on the active mode and task. Claude loads only
│   the files relevant to the current step rather than all five upfront.
│
│   ├── token-architecture.md
│   │   W3C DTCG-compliant token taxonomy. Covers the three-tier hierarchy
│   │   (Primitives, Semantic, Component), the domain.category.variant.state.scale
│   │   naming convention, grouping conventions, DTCG JSON schema requirements,
│   │   and anti-patterns to flag during audits.
│   │
│   ├── layout-as-code.md
│   │   Auto Layout 5.0 to CSS Flexbox mapping. Covers the full property
│   │   mapping matrix, the three sizing behaviors (Fixed, Hug, Fill) and their
│   │   CSS equivalents, common layout patterns with code examples, and audit
│   │   anti-patterns including layers missing Auto Layout and magic-number gaps.
│   │
│   ├── component-engineering.md
│   │   Figma component property design and TypeScript interface parity. Covers
│   │   the four property types (Variant, Boolean, Instance Swap, Text), decision
│   │   rules for choosing between them, the Slot pattern for dynamic sub-layouts,
│   │   component decomposition rules, and common drift findings.
│   │
│   ├── theming-modes.md
│   │   Multi-theme orchestration via Figma Variable Modes. Covers the structural
│   │   pattern (Primitives collection + Theme collection with mode columns),
│   │   step-by-step mode setup, multi-domain modes (density, brand, platform),
│   │   mode resolution rules, code-side resolution via CSS custom properties,
│   │   and the process for adding a new mode post-launch.
│   │
│   └── handoff-pipeline.md
│       Automated token export and compilation. Covers the full data flow
│       (Figma Variables to tokens.json to Style Dictionary to build outputs),
│       both export paths (Tokens Studio plugin and Figma REST API), W3C DTCG
│       formatting requirements, Style Dictionary platform targets (CSS, TypeScript,
│       Tailwind, iOS, Android), CI integration, and verification tooling.
│
├── assets/
│   Bundled project assets. Copied into the user's project during Author mode
│   or referenced in Document mode as the canonical pipeline starting point.
│
│   ├── tokens.template.json
│   │   W3C DTCG-compliant token skeleton. Covers color (gray ramp, brand ramp,
│   │   feedback), spacing (primitive scale + semantic aliases), radius, elevation
│   │   (shadow objects), typography (family, weight, size), and motion
│   │   (duration, easing). Validated clean by the bundled linter.
│   │
│   ├── style-dictionary.config.js
│   │   Style Dictionary configuration targeting four build outputs: CSS custom
│   │   properties at :root (light mode), CSS custom properties scoped to
│   │   :root[data-theme="dark"] (dark mode), typed TypeScript exports, and a
│   │   Tailwind theme.extend object. Includes custom format registrations for
│   │   the scoped CSS selector and Tailwind output, and documentation of the
│   │   multi-mode build pattern.
│   │
│   └── tailwind.config.template.js
│       Tailwind configuration wired to Style Dictionary build output. Imports
│       the tokens.js build artifact into theme.extend, configures dark mode via
│       the data-theme attribute selector, and documents the CSS variable
│       indirection that enables runtime theme switching without a Tailwind rebuild.
│
├── scripts/
│
│   └── lint_token_names.js
│       Node.js script that validates a tokens.json file against the
│       domain.category.variant.state.scale naming convention. Checks segment
│       charset ([a-z0-9-] only), known top-level domains, minimum segment count,
│       ambiguous two-segment names, and per-domain category validation. Exits
│       with code 0 on a clean pass, code 1 on errors. Supports --strict (treat
│       warnings as errors) and --quiet flags.
│
│       Usage:
│         node scripts/lint_token_names.js path/to/tokens.json
│         node scripts/lint_token_names.js path/to/tokens.json --strict
│
└── evals/
    
    └── evals.json
        Three qualitative test cases for validating skill behavior across modes.
        Each case includes a prompt written in realistic user voice, the mode it
        targets, and a description of expected output behavior.

        Eval 1 — Author: Greenfield token setup for a nonprofit web platform,
        React + Tailwind, warm teal brand, Light + Dark from day one, agent-
        handoff-ready. Tests whether the skill produces concrete primitive values,
        semantic alias tables, pipeline setup steps, and a linter invocation.

        Eval 2 — Document: Generate DESIGN_SYSTEM.md from a described system
        with a blue brand ramp, semantic tokens, three components, and a Tailwind
        target. Tests whether the output is genuinely agent-readable without
        follow-up questions.

        Eval 3 — Audit: Manual button component audit with no MCP. Tests whether
        the skill correctly pivots to a checklist rather than inventing findings,
        provides the drift report template, and explains the linter workflow.
```

---

## Triggering the Skill

The skill fires when the user's message matches any of the following intent patterns. Explicit mention of "design system" is not required.

- Authoring: organizing Figma variables, setting up token collections, creating primitive or semantic tiers, configuring variable modes for dark mode or multi-brand, building component properties in Figma
- Handoff: converting tokens to Tailwind or CSS, running Style Dictionary, wiring a tailwind.config.js to design tokens, writing a DESIGN_SYSTEM.md
- Auditing: reviewing a Figma file for consistency, finding hardcoded values, checking whether components follow the prop schema, validating token names

---

## Output Conventions

The skill produces output in the register of a design engineer, not a generalist assistant. Defaults:

- Tables for mapping matrices (Figma property to CSS, token tier to example)
- Fenced code blocks for JSON, TypeScript, and configuration snippets
- Bullet lists for conventions and rules, prose for the reasoning behind them
- No decorative formatting, no emojis, no horizontal rules used as decoration
- Each deliverable ends with a single focused next step, not a summary

---

## Compatibility

Designed for use in Claude chat (claude.ai), Claude Cowork (desktop), and Claude Code. MCP availability varies by surface — the skill handles all three gracefully via the advisory mode fallback.

Token pipeline targets: CSS custom properties, Tailwind CSS, TypeScript, iOS Swift, Android Compose (via Style Dictionary platform configs).

Component targets: React with TypeScript. Property schemas are framework-agnostic but examples use React conventions.

---

## License & Copyright

© 2026 Michael Nau / Bornless Studio. Licensed under the MIT License.