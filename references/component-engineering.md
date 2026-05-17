# Component Engineering and Prop Mapping

Figma components should reflect the TypeScript interface of the production component. Minimize component nesting layers. Maximize property usage. The goal is a one-to-one mapping between the Figma prop schema and the React `Props` interface — no translation layer between designer and engineer.

## The mapping principle

If the production button is defined as:

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'destructive';
  size: 'sm' | 'md' | 'lg';
  disabled: boolean;
  label: string;
  iconLeft?: React.ReactNode;
}
```

Then the Figma component must expose properties with the same names, same value sets, and same semantic meaning. The engineer should be able to read the Figma component and write the TypeScript interface without asking the designer questions.

## Property types and their semantic role

Figma exposes four property types. Each maps to a specific concern in the production interface.

### Variant properties

**Use for:** structural, visual, or state changes that alter geometry or token assignments.

**Production mapping:** discriminated unions in TypeScript (`variant: 'primary' | 'secondary'`).

```typescript
variant: 'primary' | 'secondary' | 'destructive';
size: 'sm' | 'md' | 'lg';
state: 'default' | 'hover' | 'active' | 'disabled';
```

In Figma, these become the columns/rows of the component variant matrix. The product of all variant properties produces the variant grid — keep this manageable. A button with 3 variants × 3 sizes × 4 states = 36 variants. Adding a fourth dimension (e.g., loading) brings it to 72 and Figma's component panel starts to suffer.

When the matrix gets too large, decompose: extract orthogonal concerns (e.g., loading state) into a Boolean property instead.

### Boolean properties

**Use for:** conditional rendering flags. Toggle the visibility of layers inside the component.

**Production mapping:** boolean props (`disabled: boolean`, `showIcon: boolean`).

```typescript
disabled: boolean;
hasIcon: boolean;
showBadge: boolean;
loading: boolean;
```

In Figma, Boolean properties bind to a layer's visibility. When `hasIcon: false`, the icon layer hides and Auto Layout reflows. This keeps the layer tree clean — no need to maintain separate variants for "with icon" and "without icon."

Boolean is preferred over Variant when the change is purely additive (a layer appears or disappears) and does not alter the geometry of the rest of the component beyond reflow.

### Instance Swap properties

**Use for:** slot allocations and dependency injections — places where a child component is interchangeable.

**Production mapping:** props that accept React elements or component references.

```typescript
iconLeft?: React.ReactNode;
iconRight?: React.ReactNode;
avatar?: React.ComponentType<AvatarProps>;
```

In Figma, the property exposes the child instance for swapping in the inspector. Designers can swap the icon component without entering the parent component's edit mode.

The Slot pattern (below) extends this for layout composition.

### Text properties

**Use for:** string inputs.

**Production mapping:** string props.

```typescript
label: string;
placeholder?: string;
helperText?: string;
```

In Figma, Text properties bind to text-layer content and become editable from the inspector sidebar. Designers can update component copy without entering the component to deep-click into the text layer.

## Decision rules for property type selection

When designing a Figma property, ask in this order:

1. **Does this affect geometry, layout structure, or token assignment beyond a simple show/hide?** → Variant.
2. **Does this toggle the visibility of a single layer (or a small set of layers) without restructuring?** → Boolean.
3. **Does this swap a child component or accept an arbitrary child?** → Instance Swap.
4. **Does this set the content of a text layer?** → Text.

If two properties seem to overlap (e.g., a Boolean `hasIcon` and an Instance Swap `iconLeft`), keep both: `hasIcon` controls whether the icon renders at all; `iconLeft` controls which icon. This mirrors the React pattern where `iconLeft` is optional and falsy values hide the icon.

## The Slot pattern for layout composition

For dynamic sub-layouts (Modal bodies, Card content blocks, Tab panels) where the consumer injects arbitrary children, use the Slot pattern. This avoids requiring designers to detach the parent component just to customize the inside.

### Setup

1. Create a generic component named `_Slot`. It is a placeholder — a single Auto Layout frame with `Fill` sizing on both axes and an obvious label like `[Content slot]`.
2. Inside the main component (e.g., `Modal`), insert the `_Slot` instance at the location where consumer content will appear.
3. On the parent component (Modal), expose an Instance Swap property bound to the `_Slot` layer. Name it `slot` or `content` to match the React convention.
4. Optionally, create a small library of preset slot fills — `_Slot/Form`, `_Slot/MediaGrid`, `_Slot/Text` — that designers can swap in.

### React equivalent

```typescript
interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode; // ← the slot
}
```

The Figma `slot` property is the design-side expression of `children`.

### When not to use slots

Slots are powerful but they break the strict prop-mapping discipline. If a component's contents are predictable (a button always has a label and optional icons), do not introduce a slot — use Text and Instance Swap properties. Reserve slots for genuinely open-ended composition.

## Component decomposition rules

Keep components shallow. Three rules that catch most over-nesting:

1. **A component with only one child layer is suspicious.** If `Button` contains a single `_ButtonInner` frame which contains the actual content, the inner frame is dead weight. Promote its properties to the parent.

2. **Repeated patterns become components.** If three different cards have an identical `CardHeader` structure, extract it. The threshold is usually "used in 2+ places and likely to be edited as a unit."

3. **One-off arrangements stay flat.** If a layout appears in exactly one place and is unlikely to be reused, do not preemptively componentize it — that creates abstraction without payoff.

## Auditing component drift

Common drift findings:

- **Properties that should be Variant are Boolean.** A button with a Boolean `isDestructive` is wrong — destructive is a variant, not a toggle. It changes both color and accessibility semantics.
- **Properties that should be Boolean are Variant.** A button with separate `Loading: True` and `Loading: False` variants doubles the variant matrix for no reason — make it Boolean.
- **Detached instances.** Detached instances do not receive updates. Detachment is sometimes legitimate (genuine one-off) but more often is a sign that the component was too rigid for the use case. Audit detached instances and ask: does the component need a new property?
- **Missing Text properties.** If the Figma component has a hard-coded label like "Button" and designers edit the inner text layer to change it, expose a Text property instead.
- **Slot proliferation.** More than one or two slots per component is usually a sign the component is doing too much. Decompose into smaller components, each with at most one slot.
