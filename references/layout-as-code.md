# Layout Geometry as Code (Auto Layout 5.0)

Figma's Auto Layout model compiles directly to CSS Flexbox. To guarantee layout fidelity at handoff, every layout frame in the design system must explicitly map to CSS properties. Frames without Auto Layout are layout debt — they will not translate cleanly to code and they will break responsive behavior.

## Flexbox mapping matrix

| Figma Auto Layout property | Equivalent CSS property | Layout engineering intent |
|----------------------------|-------------------------|---------------------------|
| Direction: Vertical / Horizontal | `flex-direction: column;` / `row;` | Layout flow alignment |
| Gap (Horizontal / Vertical) | `gap: Xpx;` | Explicit space between elements without margin-collapse bugs |
| Padding (individual sides) | `padding: T R B L;` | Internal box boundaries |
| Alignment (9-point grid) | `justify-content` + `align-items` | Point-to-flex alignment mapping |
| Wrapping | `flex-wrap: wrap;` | Responsive structural flow for fluid grids |

### The 9-point alignment grid

Figma exposes a 3x3 grid for alignment. Each cell maps to a `justify-content` + `align-items` pair (assuming `flex-direction: row` — swap them for `column`):

| Figma cell | `justify-content` | `align-items` |
|------------|-------------------|---------------|
| Top-left | `flex-start` | `flex-start` |
| Top-center | `center` | `flex-start` |
| Top-right | `flex-end` | `flex-start` |
| Middle-left | `flex-start` | `center` |
| Middle-center | `center` | `center` |
| Middle-right | `flex-end` | `center` |
| Bottom-left | `flex-start` | `flex-end` |
| Bottom-center | `center` | `flex-end` |
| Bottom-right | `flex-end` | `flex-end` |

Figma also exposes "space between" as a separate alignment mode, which maps to `justify-content: space-between`.

## Sizing behaviors (the constraints engine)

Auto Layout exposes three sizing modes per axis. Each maps to a specific CSS pattern. Mixing them incorrectly is the most common source of broken handoff.

### Fixed (`width: Xpx` / `height: Xpx`)

Use strictly for:

- Static assets (icons, avatars at fixed sizes)
- Concrete layout containers that should not stretch (a 240px sidebar)
- Spacers and dividers with deliberate sizes

CSS:
```css
width: 240px;
flex-shrink: 0; /* prevent collapse when parent is constrained */
```

### Hug contents (`width: fit-content`)

The container's size is driven by its children. Use for:

- Buttons (size hugs the label)
- Badges, tags, chips
- Toolbars whose width depends on content

CSS:
```css
width: fit-content;
/* or for inline-flex containers: */
display: inline-flex;
```

### Fill container (`flex-grow: 1` + appropriate basis)

Forces the element to occupy the remaining allocation of the parent. Use for:

- Main content areas in a sidebar layout (sidebar Fixed, content Fill)
- Input fields that should expand to the form width
- Flexible columns in a responsive grid

CSS:
```css
flex-grow: 1;
flex-shrink: 1;
flex-basis: 0; /* or auto, depending on intent */
/* sometimes: */
width: 100%; /* if the parent is not flex */
```

## Common layout patterns and their Auto Layout setup

### Two-column sidebar layout

```
Parent frame:
  direction: horizontal
  gap: 0 (or design system spacing token)
  
  Child 1 (sidebar):
    width: Fixed 240px
    height: Fill
    
  Child 2 (content):
    width: Fill
    height: Fill
```

CSS:
```css
.layout {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
}
.sidebar {
  width: 240px;
  flex-shrink: 0;
}
.content {
  flex-grow: 1;
}
```

### Button (icon + label + icon)

```
Button frame:
  direction: horizontal
  gap: spacing.element.xs
  padding: spacing.element.sm spacing.element.md
  alignment: middle-center
  width: Hug
  height: Hug
```

CSS:
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-element-xs);
  padding: var(--spacing-element-sm) var(--spacing-element-md);
  width: fit-content;
}
```

### Responsive card grid

```
Grid frame:
  direction: horizontal
  wrap: enabled
  gap: spacing.layout.md (both axes)
  width: Fill
  
  Card (instance, repeated):
    width: Fixed (e.g., 320px) or use min-width if Figma version supports it
    height: Hug
```

CSS:
```css
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-layout-md);
}
.card {
  flex-basis: 320px;
  flex-grow: 1;
}
```

## Anti-patterns to flag in audits

- **Layers without Auto Layout.** Any container intended to be a layout primitive must use Auto Layout. Static frames with absolutely positioned children will not translate to code.
- **Fixed sizing where Fill is correct.** A header frame with `width: 1440px Fixed` instead of Fill will break on any other viewport. Fixed widths belong on intentionally constrained elements (sidebar, modal max-width container), not on top-level page sections.
- **Magic numbers in gap and padding.** `gap: 13px` is a smell — gaps and paddings should be spacing tokens. The linter will catch literal pixel values in exported tokens, but visual audit should catch them in component instances.
- **Mixed-direction nesting without need.** A vertical container with a horizontal child for a single button row is fine. A vertical container with a horizontal child for a single button is over-nested — the button should be the child directly.
- **Absolute positioning inside Auto Layout containers.** Figma allows this and it sometimes maps to CSS `position: absolute`, but it is almost always a sign that the layout intent was not thought through. Flag and ask whether sticky/relative positioning would model the intent better.

## Bridging to Flexbox limits

Flexbox handles most layouts the design system needs. For genuine 2-axis grid layouts (a calendar, a complex dashboard with rows and columns), CSS Grid is the right target. Figma does not have a native Grid layout (as of this writing) — model these as nested Auto Layout (rows of columns or columns of rows) and have the engineer translate to Grid in code. Document this translation explicitly in the handoff doc.
