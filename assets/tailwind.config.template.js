/**
 * Tailwind config template wired to Style Dictionary output.
 *
 * Prerequisites:
 *   1. Run `npx style-dictionary build` to generate build/tailwind/tokens.js
 *      and build/css/tokens.css + tokens.dark.css.
 *   2. Import the CSS files in your app entry (e.g., src/main.tsx):
 *        import './build/css/tokens.css';
 *        import './build/css/tokens.dark.css';
 *
 * Theme switching:
 *   The tokens.dark.css file scopes its variables under :root[data-theme="dark"],
 *   so toggling the theme is a single attribute change on <html>:
 *     document.documentElement.setAttribute('data-theme', 'dark');
 *
 *   We configure Tailwind's `darkMode: ['class', '[data-theme="dark"]']` so that
 *   utility variants like `dark:bg-bg-surface-elevated` also work.
 *
 * Why every Tailwind value is a CSS var:
 *   The theme.extend object below (loaded from tokens.js) maps every token to
 *   var(--token-name). This means switching the theme attribute updates every
 *   tokenized utility class instantly — no Tailwind rebuild needed at runtime.
 */

const tokens = require('./build/tailwind/tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  darkMode: ['class', '[data-theme="dark"]'],

  theme: {
    extend: {
      colors:     tokens.color     || {},
      spacing:    tokens.spacing   || {},
      borderRadius: tokens.radius  || {},
      boxShadow:  tokens.elevation || {},
      fontFamily: tokens.typography ? tokens.typography.family : {},
      fontSize:   tokens.typography ? tokens.typography.size   : {},
      fontWeight: tokens.typography ? tokens.typography.weight : {},
      transitionDuration: tokens.motion ? tokens.motion.duration : {},
      transitionTimingFunction: tokens.motion ? tokens.motion.easing : {},
    },
  },

  plugins: [
    // Add Tailwind plugins here as needed.
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
};
