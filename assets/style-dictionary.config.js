/**
 * Style Dictionary configuration template.
 *
 * Transforms tokens.json (W3C DTCG format) into:
 *   - build/css/tokens.css            CSS custom properties at :root
 *   - build/css/tokens.dark.css       Dark mode overrides at :root[data-theme="dark"]
 *   - build/ts/tokens.ts              Typed TypeScript exports
 *   - build/tailwind/tokens.js        theme.extend object for tailwind.config.js
 *
 * Usage:
 *   npm install --save-dev style-dictionary
 *   npx style-dictionary build
 *
 * For mode files (Dark, etc.), place them under tokens/ alongside the base file:
 *   tokens/
 *     primitives.json
 *     semantic.light.json   (default, included in base build)
 *     semantic.dark.json    (overrides for dark mode)
 *
 * The 'dark' platform below loads semantic.dark.json on top of primitives and
 * writes a separate output file scoped to the data-theme attribute.
 */

const StyleDictionary = require('style-dictionary');

// Custom format: emit CSS variables scoped to a selector
StyleDictionary.registerFormat({
  name: 'css/variables-scoped',
  formatter: ({ dictionary, options }) => {
    const selector = options.selector || ':root';
    const lines = dictionary.allTokens.map(
      (t) => `  --${t.name}: ${t.value};`
    );
    return `${selector} {\n${lines.join('\n')}\n}\n`;
  },
});

// Custom format: emit a Tailwind theme.extend object
StyleDictionary.registerFormat({
  name: 'javascript/tailwind-theme',
  formatter: ({ dictionary }) => {
    const theme = {};
    dictionary.allTokens.forEach((token) => {
      // Group by top-level domain: color, spacing, radius, etc.
      const [domain, ...rest] = token.path;
      const key = rest.join('-');
      if (!theme[domain]) theme[domain] = {};
      // Reference the CSS variable so theme switching works at runtime
      theme[domain][key] = `var(--${token.name})`;
    });
    return `module.exports = ${JSON.stringify(theme, null, 2)};\n`;
  },
});

module.exports = {
  source: ['tokens/primitives.json', 'tokens/semantic.light.json', 'tokens/components/**/*.json'],

  platforms: {
    // ─────────────────────────────────────────────────────────────
    // CSS custom properties (default / light mode)
    // ─────────────────────────────────────────────────────────────
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables-scoped',
          options: { selector: ':root' },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // CSS custom properties (dark mode override)
    // Configure a separate build invocation for each mode by swapping
    // the 'source' file. See README at bottom for the multi-build pattern.
    // ─────────────────────────────────────────────────────────────
    'css-dark': {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'tokens.dark.css',
          format: 'css/variables-scoped',
          options: { selector: ':root[data-theme="dark"]' },
          // Filter to only semantic-tier tokens that change in dark mode.
          // Primitives are mode-invariant, so they only need to live in tokens.css.
          filter: (token) => token.filePath.includes('semantic.'),
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // TypeScript exports
    // ─────────────────────────────────────────────────────────────
    ts: {
      transformGroup: 'js',
      buildPath: 'build/ts/',
      files: [
        {
          destination: 'tokens.ts',
          format: 'javascript/es6',
        },
        {
          destination: 'tokens.d.ts',
          format: 'typescript/es6-declarations',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Tailwind theme.extend
    // ─────────────────────────────────────────────────────────────
    tailwind: {
      transformGroup: 'js',
      buildPath: 'build/tailwind/',
      files: [
        {
          destination: 'tokens.js',
          format: 'javascript/tailwind-theme',
        },
      ],
    },
  },
};

/*
 * Multi-mode build pattern
 * ─────────────────────────
 * Style Dictionary builds all platforms in a single run from a single source set.
 * To produce per-mode outputs, run the build multiple times with different sources:
 *
 *   // build-tokens.js
 *   const StyleDictionary = require('style-dictionary');
 *   const baseConfig = require('./style-dictionary.config.js');
 *
 *   // Light (default)
 *   StyleDictionary.extend(baseConfig).buildAllPlatforms();
 *
 *   // Dark
 *   StyleDictionary.extend({
 *     ...baseConfig,
 *     source: ['tokens/primitives.json', 'tokens/semantic.dark.json'],
 *     platforms: { 'css-dark': baseConfig.platforms['css-dark'] }
 *   }).buildAllPlatforms();
 *
 * Then in package.json:
 *   "scripts": { "build:tokens": "node build-tokens.js" }
 */
