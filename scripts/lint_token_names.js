#!/usr/bin/env node
/**
 * lint_token_names.js
 *
 * Validates a tokens.json file (W3C DTCG format) against the design-system
 * naming convention: domain.category.variant.state.scale
 *
 * Domains:   color | spacing | typography | elevation | radius | motion | (custom)
 * Categories vary by domain (see DOMAIN_RULES below).
 *
 * Usage:
 *   node lint_token_names.js path/to/tokens.json
 *   node lint_token_names.js path/to/tokens.json --strict
 *
 * Flags:
 *   --strict    Treat warnings as errors (exit 1 on any finding).
 *   --quiet     Suppress passing-token output, only show findings.
 *
 * Exit codes:
 *   0  No findings (or only warnings without --strict)
 *   1  Errors found
 *   2  Usage error (bad args, missing file)
 */

const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const quiet  = args.includes('--quiet');
const filePath = args.find((a) => !a.startsWith('--'));

if (!filePath) {
  console.error('Usage: node lint_token_names.js <tokens.json> [--strict] [--quiet]');
  process.exit(2);
}

const absPath = path.resolve(filePath);
if (!fs.existsSync(absPath)) {
  console.error(`File not found: ${absPath}`);
  process.exit(2);
}

let tokens;
try {
  tokens = JSON.parse(fs.readFileSync(absPath, 'utf-8'));
} catch (e) {
  console.error(`Failed to parse JSON: ${e.message}`);
  process.exit(2);
}

// ─────────────────────────────────────────────────────────────────────
// Convention rules
// ─────────────────────────────────────────────────────────────────────

// Allowed characters in any path segment: lowercase alphanumeric + hyphen.
// Reasoning: Figma allows broader characters but CSS custom property names
// must match this charset, and we want 1:1 parity.
const SEGMENT_RE = /^[a-z0-9][a-z0-9-]*$/;

// Allowed top-level domains. Extend as your system grows.
const DOMAINS = new Set([
  'color', 'spacing', 'typography', 'elevation', 'radius', 'motion',
  'border', 'opacity', 'sizing', 'zindex', 'breakpoint',
]);

// Per-domain category expectations. A token that uses an unknown category
// produces a warning, not an error — the system may have intentionally added
// new categories. Hardcoded primitives (color.gray.900) are also allowed.
const DOMAIN_RULES = {
  color: {
    primitiveCategories: new Set(['gray', 'brand', 'feedback', 'neutral', 'accent']),
    semanticCategories: new Set(['bg', 'text', 'border', 'surface', 'feedback', 'brand', 'state']),
  },
  spacing: {
    primitiveCategories: null, // primitives are bare numbers (spacing.4, spacing.8)
    semanticCategories: new Set(['element', 'layout', 'section', 'inset']),
  },
  typography: {
    semanticCategories: new Set(['family', 'weight', 'size', 'lineheight', 'tracking', 'heading', 'body', 'display']),
  },
  elevation: {
    semanticCategories: new Set(['surface', 'overlay', 'sticky']),
  },
};

// ─────────────────────────────────────────────────────────────────────
// Walk the token tree
// ─────────────────────────────────────────────────────────────────────

const findings = []; // { path, severity, message }

function isToken(obj) {
  return obj && typeof obj === 'object' && '$value' in obj;
}

function isMetaKey(key) {
  // Skip DTCG metadata and template comment fields.
  return key.startsWith('$') || key.startsWith('_');
}

function walk(node, currentPath) {
  if (!node || typeof node !== 'object') return;

  if (isToken(node)) {
    validateToken(currentPath);
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (isMetaKey(key)) continue;
    walk(value, [...currentPath, key]);
  }
}

function validateToken(tokenPath) {
  const fullName = tokenPath.join('.');

  // Rule 1: Each segment must match the charset.
  for (const seg of tokenPath) {
    if (!SEGMENT_RE.test(seg)) {
      findings.push({
        path: fullName,
        severity: 'error',
        message: `Segment "${seg}" contains disallowed characters. Use [a-z0-9-] only.`,
      });
    }
  }

  // Rule 2: Top-level segment must be a known domain.
  const [domain] = tokenPath;
  if (!DOMAINS.has(domain)) {
    findings.push({
      path: fullName,
      severity: 'warning',
      message: `Top-level domain "${domain}" is not in the known set [${[...DOMAINS].join(', ')}]. Add it to DOMAINS if intentional.`,
    });
  }

  // Rule 3: At least two segments. A token at the top level
  // (e.g. "color" with $value) is almost certainly a mistake.
  if (tokenPath.length < 2) {
    findings.push({
      path: fullName,
      severity: 'error',
      message: 'Token name has fewer than 2 segments. Use at minimum domain.name.',
    });
  }

  // Rule 4: Reject "primary", "secondary" etc. as the last segment when they
  // could be category instead. Heuristic: a 2-segment name like color.primary
  // is ambiguous — is "primary" a brand color or a semantic role? Prefer
  // color.brand.primary or color.text.primary.
  if (tokenPath.length === 2 && /^(primary|secondary|tertiary|accent)$/.test(tokenPath[1])) {
    findings.push({
      path: fullName,
      severity: 'warning',
      message: `Ambiguous 2-segment name. "${tokenPath[1]}" should be a variant or category, not a token name. Consider ${domain}.brand.${tokenPath[1]} or ${domain}.text.${tokenPath[1]}.`,
    });
  }

  // Rule 5: Domain-specific category check.
  const rules = DOMAIN_RULES[domain];
  if (rules && tokenPath.length >= 2) {
    const category = tokenPath[1];
    const isNumericPrimitive = /^[0-9]+$/.test(category);
    const isKnownPrimitive = rules.primitiveCategories?.has(category);
    const isKnownSemantic  = rules.semanticCategories?.has(category);

    if (!isNumericPrimitive && !isKnownPrimitive && !isKnownSemantic) {
      findings.push({
        path: fullName,
        severity: 'warning',
        message: `Category "${category}" under domain "${domain}" is not in the known set. If intentional, add it to DOMAIN_RULES.`,
      });
    }
  }
}

walk(tokens, []);

// ─────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────

const errors   = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warning');

if (!quiet || findings.length > 0) {
  console.log(`\nToken-name lint report for: ${path.relative(process.cwd(), absPath)}`);
  console.log('─'.repeat(70));
}

if (findings.length === 0) {
  if (!quiet) console.log('  All token names pass convention checks.');
} else {
  for (const f of findings) {
    const tag = f.severity === 'error' ? '✗ ERROR  ' : '! WARN   ';
    console.log(`  ${tag} ${f.path}`);
    console.log(`           ${f.message}`);
  }
  console.log('─'.repeat(70));
  console.log(`  ${errors.length} error(s), ${warnings.length} warning(s)`);
}

if (errors.length > 0) process.exit(1);
if (strict && warnings.length > 0) process.exit(1);
process.exit(0);
