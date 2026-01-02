# Heatmap Interactivity Documentation

This document describes the tooltip and cell interaction system for the heatmap visualization, including current architecture, recent changes, and outstanding issues requiring attention.

---

## Architecture Overview

### Component Hierarchy

```
HeatmapD3.tsx (React wrapper)
├── YearRangeFilter.tsx (year range controls)
├── scrollWrapperRef (div) - scrollable container with onMouseLeave
│   └── containerRef (div) - D3 renders into this
│       └── SVG.heatmap-svg (created by d3-heatmap.ts)
│           └── g.cells-group
│               └── rect.cell (one per data point)
├── ColorLegend.tsx (color scale with hover indicator)
└── Tooltip.tsx (floating tooltip, position: fixed)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/components/HeatmapD3.tsx` | React wrapper managing state (tooltip, hover, scroll) |
| `src/lib/d3-heatmap.ts` | Pure D3 rendering logic, cell event handlers |
| `src/components/Tooltip.tsx` | Tooltip display component |
| `src/components/ColorLegend.tsx` | Color scale legend with hover indicator |
| `src/lib/types.ts` | TypeScript interfaces (`HeatmapCell`, `TooltipState`, etc.) |

---

## Data Flow

### Hover/Touch Event Flow

```
User hovers/touches cell
    ↓
d3-heatmap.ts: mouseenter/touchstart handler
    ↓
Calls onCellHover(cell, event) callback
    ↓
HeatmapD3.tsx: handleCellHover()
    ↓
Sets tooltip state: { visible: true, x: event.clientX, y: event.clientY, cell }
Sets hoveredValue for ColorLegend indicator
Calls onCellHoverCallback for parent (CompareHeatmapStack)
    ↓
Tooltip.tsx renders at fixed position
ColorLegend.tsx shows indicator at value position
```

### Tooltip Dismissal Flow (Current Implementation)

```
User action (mouseleave container, click outside, scroll)
    ↓
HeatmapD3.tsx: dismissTooltip()
    ↓
Sets tooltip.visible = false
Sets hoveredValue = null
Calls heatmapRef.current.clearActiveCell()
    ↓
d3-heatmap.ts: clearActiveCell()
    ↓
Removes stroke from activeCellElement
Sets activeCellElement = null
```

---

## Current Implementation Details

### d3-heatmap.ts Cell Event Handlers

```typescript
// State tracking
let activeCellElement: SVGRectElement | null = null;

// Mouse events
.on('mouseenter', function(event, d) {
  // Clear previous cell stroke
  if (activeCellElement && activeCellElement !== this) {
    d3.select(activeCellElement).style('stroke', 'none');
  }
  activeCellElement = this;
  d3.select(this).style('stroke', getCSSVariable('--color-text')).raise();
  onCellHover?.(d, event);
})
.on('mousemove', function(event, d) {
  onCellHover?.(d, event);
})
.on('mouseleave', function() {
  if (activeCellElement === this) {
    d3.select(this).style('stroke', 'none');
    activeCellElement = null;
  }
  onCellHover?.(null, {} as MouseEvent);
})

// Touch events (added this session)
.on('touchstart', function(event, d) {
  event.preventDefault();
  // Clear previous, set new active
  if (activeCellElement && activeCellElement !== this) {
    d3.select(activeCellElement).style('stroke', 'none');
  }
  activeCellElement = this;
  d3.select(this).style('stroke', getCSSVariable('--color-text')).raise();

  const touch = event.touches[0];
  onCellHover?.(d, { clientX: touch.clientX, clientY: touch.clientY });
}, { passive: false });
```

### HeatmapD3.tsx Dismiss Handlers

```typescript
// Centralized dismiss function
const dismissTooltip = useCallback(() => {
  setTooltip((prev) => ({ ...prev, visible: false }));
  setHoveredValue(null);
  onCellHoverCallback?.(null);
  heatmapRef.current?.clearActiveCell();
}, [onCellHoverCallback]);

// Container mouse leave
const handleContainerMouseLeave = useCallback(() => {
  dismissTooltip();
}, [dismissTooltip]);

// Click outside (document level)
useEffect(() => {
  if (!tooltip.visible) return;
  const handleClickOutside = (event) => {
    if (scrollWrapperRef.current && !scrollWrapperRef.current.contains(event.target)) {
      dismissTooltip();
    }
  };
  document.addEventListener('mousedown', handleClickOutside, true);
  document.addEventListener('touchstart', handleClickOutside, true);
  return () => { /* cleanup */ };
}, [tooltip.visible, dismissTooltip]);

// Scroll dismiss (NEEDS REVISION - see issues below)
useEffect(() => {
  if (!tooltip.visible) return;
  const handleScroll = () => dismissTooltip();
  window.addEventListener('scroll', handleScroll, true);
  return () => { /* cleanup */ };
}, [tooltip.visible, dismissTooltip]);
```

### Tooltip.tsx Positioning

```typescript
// Uses position: fixed with clientX/clientY from mouse event
const tooltipStyle = {
  position: 'fixed',
  left: position.x,
  top: position.y,
  pointerEvents: 'none',
  zIndex: 1000,
};

// Position calculation accounts for viewport bounds
function calculateTooltipPosition(cursorX, cursorY, tooltipWidth, tooltipHeight) {
  // Positions tooltip offset from cursor
  // Flips to opposite side if would overflow viewport
  // Returns { x, y } for fixed positioning
}
```

---

## Outstanding Issues

### 1. Mouse Leave Not Always Triggering (Desktop)

**Problem:** The `onMouseLeave` handler on `scrollWrapperRef` doesn't always fire when the mouse quickly exits the container. This may be due to:
- React event throttling/batching
- Mouse moving faster than event polling
- Event not bubbling correctly from D3-managed SVG elements

**Current behavior:** Tooltip can remain visible after mouse has left the chart area.

**Expected behavior:** Tooltip should always close when mouse leaves the heatmap container.

**Investigation areas:**
- Consider using `mouseleave` event listener directly on DOM element instead of React's `onMouseLeave`
- Add `mouseleave` handler at the SVG level in d3-heatmap.ts
- Use `requestAnimationFrame` or debouncing to ensure handler fires
- Check if `pointer-events` CSS on child elements is interfering

### 2. Tooltip Should Track Cell Position During Scroll

**Problem:** Currently, tooltip closes on any scroll. User requested that tooltip remain visible during scroll but stay attached to its cell.

**Current behavior:** Tooltip dismisses immediately on scroll.

**Expected behavior:**
- Tooltip remains visible during scroll
- Tooltip position updates to stay relative to the highlighted cell
- Tooltip only disappears when the cell scrolls out of viewport

**Implementation approach:**
1. Store reference to the hovered cell's DOM element (the `rect.cell`)
2. On scroll, get cell's current `getBoundingClientRect()`
3. Recalculate tooltip position relative to cell (not original cursor position)
4. If cell is outside viewport, dismiss tooltip

**Required changes:**
- `d3-heatmap.ts`: Return cell element reference in hover callback or expose getter
- `TooltipState` type: Add optional `cellElement?: SVGRectElement`
- `HeatmapD3.tsx`: On scroll, recalculate position instead of dismissing
- `Tooltip.tsx`: Accept cell element ref for position updates

**Pseudocode:**
```typescript
// In HeatmapD3.tsx scroll handler
const handleScroll = () => {
  if (!tooltip.cellElement) return;

  const cellRect = tooltip.cellElement.getBoundingClientRect();

  // Check if cell is in viewport
  if (cellRect.top > window.innerHeight || cellRect.bottom < 0 ||
      cellRect.left > window.innerWidth || cellRect.right < 0) {
    dismissTooltip();
    return;
  }

  // Update tooltip position relative to cell
  setTooltip(prev => ({
    ...prev,
    x: cellRect.left + cellRect.width / 2,
    y: cellRect.top,
  }));
};
```

### 3. Mobile Hover Indicator Not Showing

**Problem:** On mobile devices, tapping a cell does not show the stroke indicator around the cell, even though the tooltip appears.

**Current implementation:** `touchstart` handler in d3-heatmap.ts should apply stroke, but it's not working.

**Investigation areas:**
- Verify `touchstart` event is actually firing (add console.log)
- Check if `event.preventDefault()` is causing issues
- Verify `passive: false` option is being applied correctly
- Check if CSS `touch-action` property is interfering
- Test if stroke is applied but immediately removed by another handler
- Check mobile browser's handling of D3 event listeners

**Debugging steps:**
1. Add `console.log` inside touchstart handler to confirm it fires
2. Log `activeCellElement` before and after assignment
3. Check if `mouseleave` is firing immediately after `touchstart` on mobile
4. Test with different `touch-action` CSS values on the SVG/container

**Potential fix:** Mobile browsers may fire synthetic mouse events after touch events. The sequence might be:
```
touchstart → (applies stroke)
mouseenter → (no change, same cell)
mouseleave → (removes stroke) ← Problem!
```

If this is the case, need to debounce or ignore mouseleave events that occur immediately after touchstart.

---

## Changes Made This Session

### ColorLegend Improvements (Prior task)

1. **Responsive width**: Added ResizeObserver to track container width
2. **Legend positioning**: Moved from top of compare page to below each heatmap
3. **Hover synchronization**: Lifted hover state to CompareHeatmapStack for synchronized indicators
4. **Reduced spacing**: Container gap 24px→12px, section gap 8px→0

### Tooltip Interactivity (This task)

1. **d3-heatmap.ts**:
   - Added `activeCellElement` tracking
   - Added `touchstart` event handler (not fully working on mobile)
   - Added `clearActiveCell()` method to HeatmapInstance interface
   - Modified mouseenter/mouseleave to track active cell

2. **HeatmapD3.tsx**:
   - Added `dismissTooltip()` centralized function
   - Added `handleContainerMouseLeave` handler
   - Added `onMouseLeave` to scroll wrapper div
   - Added click-outside listener (mousedown/touchstart on document)
   - Added scroll listener (currently dismisses tooltip, needs revision)

---

## Testing Notes

### Automated Tests

- All 108 unit tests pass
- 145/150 E2E tests pass (4 failures are pre-existing unrelated issues)
- All 18 tooltip/hover-related E2E tests pass

### Manual Testing Checklist

- [ ] Desktop: Tooltip appears on cell hover
- [ ] Desktop: Tooltip follows cursor on mousemove within cell
- [ ] Desktop: Tooltip closes when mouse leaves chart area
- [ ] Desktop: Tooltip closes on click outside chart
- [ ] Desktop: Tooltip stays attached to cell during scroll
- [ ] Desktop: Tooltip disappears when cell scrolls out of viewport
- [ ] Mobile: Tooltip appears on cell tap
- [ ] Mobile: Cell shows stroke indicator on tap
- [ ] Mobile: Tooltip closes on tap outside chart
- [ ] Mobile: Stroke indicator remains visible while tooltip is open
- [ ] Compare page: All heatmaps show/hide tooltips independently
- [ ] Compare page: Unified mode shows indicator on all legends

---

## Related Types

```typescript
// src/lib/types.ts
interface HeatmapCell {
  year: number;
  month: number;
  value: number;
  births?: number;
  population?: number;
  source?: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cell: HeatmapCell | null;
  // TODO: Add cellElement?: SVGRectElement for scroll tracking
}

// src/lib/d3-heatmap.ts
interface HeatmapInstance {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  update: (data: CountryHeatmapData, yearRange?: [number, number]) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
  getScrollInfo: () => ScrollInfo | null;
  clearActiveCell: () => void;
  // TODO: Add getActiveCellElement?: () => SVGRectElement | null
}
```

---

## Environment

- Framework: Astro with React components
- D3 version: See package.json
- Testing: Vitest (unit), Playwright (E2E)
- Build: Vite
