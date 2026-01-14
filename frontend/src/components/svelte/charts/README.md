# Chart Components

Interactive SVG charts with cross-device tooltip support.

## Mobile Tooltip Patterns

These patterns ensure tooltips work intuitively on both touch and mouse devices.

### Event Handling

Use the Pointer Events API for unified mouse/touch handling:

```svelte
<svg
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerleave={handlePointerLeave}
>
```

**Key handlers:**

1. **`pointerdown`** - Shows tooltip on tap (touch) or click (mouse). Critical for mobile since `pointermove` requires dragging.

2. **`pointermove`** - Updates tooltip position as user drags (touch) or hovers (mouse).

3. **`pointerleave`** - Dismisses tooltip when mouse leaves. Skip for touch (see dismissal below).

```typescript
let isTouchActive = $state(false);

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === 'touch') {
    isTouchActive = true;
  }
  updateTooltip(event);
}

function handlePointerLeave(event: PointerEvent) {
  // Don't dismiss on touch - user taps outside to dismiss
  if (event.pointerType !== 'touch') {
    clearTooltip();
  }
}
```

### Touch Dismissal

On touch devices, dismiss the tooltip when the user taps outside the chart. Attach a document-level listener only when needed:

```typescript
$effect(() => {
  if (typeof document === 'undefined') return;
  if (!isTouchActive) return; // Only listen during touch interaction

  function handleOutsideInteraction(event: PointerEvent) {
    if (svgElement && !svgElement.contains(event.target as Node)) {
      clearTooltip();
      isTouchActive = false;
    }
  }

  document.addEventListener('pointerdown', handleOutsideInteraction);
  return () => document.removeEventListener('pointerdown', handleOutsideInteraction);
});
```

### Tooltip Positioning

**Use absolute positioning within a container**, not fixed viewport positioning. This ensures the tooltip stays anchored to the chart when the page scrolls.

```svelte
<!-- Parent must have position: relative -->
<div class="relative">
  <svg>...</svg>
  <Tooltip position={tooltipPosition} />
</div>
```

Calculate position as percentage of container:

```typescript
// In the chart component
const xPercent = (viewBoxX / VIEWBOX.width) * 100;
const yPercent = (viewBoxY / VIEWBOX.height) * 100;
tooltipPosition = { x: xPercent, y: yPercent };
```

```typescript
// In the tooltip component
const leftPercent = position.x + offsetPercent;
return `left: ${leftPercent}%; top: 50%; transform: translateY(-50%);`;
```

**Why not fixed positioning?** Fixed positioning uses viewport coordinates. When the user scrolls, the tooltip stays in place while the chart scrolls away, creating a disconnected experience.

### Touch Action CSS

Use `touch-action: pan-y` on the SVG to allow vertical page scrolling while capturing horizontal gestures for chart interaction:

```svelte
<svg style="touch-action: pan-y;">
```

| Value | Vertical Scroll | Horizontal Drag | Use Case |
|-------|-----------------|-----------------|----------|
| `none` | Blocked | Captured | Full chart control, but blocks page scroll |
| `pan-y` | Allowed | Captured | Best for inline charts in scrollable pages |
| `pan-x` | Blocked | Allowed | Horizontal scrolling containers |

### Component Structure

```
charts/
├── MonthlyFertilityChart.svelte  # Main chart with interaction logic
└── chart/
    ├── ChartTooltip.svelte       # Absolutely positioned tooltip
    ├── ChartCrosshair.svelte     # Vertical line at hovered position
    ├── ChartGrid.svelte          # Background grid lines
    ├── ChartAxes.svelte          # X-axis tick marks
    ├── ChartAxisLabels.svelte    # HTML axis labels (better text rendering)
    └── ChartLegend.svelte        # Color legend below chart
```

### Checklist for New Charts

- [ ] Use `onpointerdown` to show tooltip on tap (not just `pointermove`)
- [ ] Track `isTouchActive` state via `event.pointerType === 'touch'`
- [ ] Skip `pointerleave` dismissal for touch interactions
- [ ] Add document-level `pointerdown` listener for tap-outside dismissal
- [ ] Position tooltip absolutely within container using percentages
- [ ] Add `touch-action: pan-y` to allow page scrolling
- [ ] Test on actual mobile device (emulators don't catch all issues)
