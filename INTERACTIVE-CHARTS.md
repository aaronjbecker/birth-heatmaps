# Interactive Charts Migration

Tracking milestones for migrating static matplotlib charts to interactive Svelte 5 + D3.js visualizations.

## Chart 1: Monthly Fertility Rate Time Series

**Status**: Complete (2026-01-13)

### Description
Time series with 12 monthly lines showing daily fertility rate per 100k women aged 15-44. Highlights the month with highest (orangered) and lowest (royalblue) average fertility across all years. Black overlay shows annual average.

### Features
- 12 monthly lines with color coding (highest=orangered, lowest=royalblue, others=gray)
- Black annual average overlay line rendered on top
- Vertical crosshair follows mouse/touch position
- Tooltip displays all 12 month values + annual average for hovered year (sorted by value)
- Mobile touch support: tap to show, tap outside to dismiss
- Theme-aware: responds to light/dark mode via CSS variables
- Responsive: SVG fills container width, height configurable via prop

### Milestones

- [x] **M1.1**: Data pipeline - JSON exporter for monthly fertility data
- [x] **M1.2**: Core D3 library - `monthly-fertility-utils.ts` with viewBox rendering
- [x] **M1.3**: Svelte wrapper - `MonthlyFertilityChart.svelte` component
- [x] **M1.4**: Crosshair/tooltip - Hover interaction with value display
- [x] **M1.5**: Page integration - Add to country pages below heatmap (fertility metric only)
- [x] **M1.6**: Theme support - Light/dark mode with CSS variables
- [ ] **M1.7**: Testing - Unit tests and E2E validation (deferred)

### Technical Decisions
- SVG with viewBox coordinates (1000x500 internal space)
- `preserveAspectRatio="none"` - chart fills container without aspect ratio constraints
- HTML overlays for text positioning (percentage-based via `viewBoxToPercent()`)
- `vector-effect="non-scaling-stroke"` for consistent line widths at any scale
- Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactive state management
- Binary search for efficient year lookup on hover

### JSON Data Schema
```typescript
interface MonthlyFertilityTimeSeriesData {
  country: { code: string; name: string };
  metric: 'daily_fertility_rate';
  title: string;
  yearRange: [number, number];
  monthRanking: {
    highestAvg: number;  // Month 1-12 with highest average
    lowestAvg: number;   // Month 1-12 with lowest average
  };
  monthlySeries: Array<{
    month: number;
    monthName: string;
    data: Array<{ year: number; value: number | null }>;
  }>;
  annualAverageSeries: Array<{ year: number; value: number }>;
  yDomain: [number, number];
  sources: string[];
  generatedAt: string;
}
```

### Files Created/Modified

**New Files:**
| File | Purpose |
|------|---------|
| `frontend/src/lib/charts/monthly-fertility-utils.ts` | D3 scales, line generators, coordinate conversion |
| `frontend/src/components/svelte/charts/MonthlyFertilityChart.svelte` | Main chart component |
| `frontend/src/components/svelte/charts/chart/ChartGrid.svelte` | Horizontal grid lines (SVG) |
| `frontend/src/components/svelte/charts/chart/ChartAxes.svelte` | X-axis tick marks (SVG) |
| `frontend/src/components/svelte/charts/chart/ChartAxisLabels.svelte` | Axis labels (HTML overlay) |
| `frontend/src/components/svelte/charts/chart/ChartCrosshair.svelte` | Vertical hover line (SVG) |
| `frontend/src/components/svelte/charts/chart/ChartTooltip.svelte` | Month values tooltip (HTML fixed) |
| `frontend/src/components/svelte/charts/chart/ChartLegend.svelte` | Color legend (HTML) |

**Modified Files:**
| File | Changes |
|------|---------|
| `data-pipeline/src/config/settings.py` | Added `MONTHLY_FERTILITY_OUTPUT_DIR` and frontend paths |
| `data-pipeline/src/config/__init__.py` | Exported new path constants |
| `data-pipeline/src/exporters/json_exporter.py` | Added `export_monthly_fertility_timeseries()` function |
| `frontend/src/lib/types.ts` | Added `MonthlyFertilityTimeSeriesData` interface |
| `frontend/src/pages/[metric]/[country].astro` | Load monthly fertility data at build time |
| `frontend/src/components/EntityHeatmapPage.astro` | Render chart below heatmap (fertility metric only) |

### Reference Implementation
Based on `ZhviChart.svelte` from `~/top-down-ai/frontend`:
- Svelte 5 runes pattern for state management
- ViewBox coordinates with HTML overlay positioning
- `clientToViewBox()` for mouse coordinate conversion
- Pure D3 utilities in separate module (SSR-compatible)

---

## Future Charts (Planned)

### Chart 2: Monthly Fertility Boxplot
Violin plot showing distribution of monthly fertility ratios.

### Chart 3: Population Over Time
Line chart of childbearing population (women 15-44).

### Chart 4: Total Births Over Time
Monthly birth counts as time series.

---

## Architecture Notes

### Svelte 5 + D3 Pattern
- **Svelte**: State management (`$state`, `$derived`), DOM refs, lifecycle (`$effect`), event binding
- **D3**: Scales (`scaleLinear`), line generators (`line()`), no DOM manipulation
- **HTML overlays**: Labels, tooltips, legends positioned via CSS percentages

### Component Hierarchy
```
MonthlyFertilityChart.svelte (main)
├── ChartGrid.svelte          # Horizontal grid lines (SVG)
├── ChartAxes.svelte          # X-axis tick marks (SVG)
├── ChartAxisLabels.svelte    # Year/value labels (HTML overlay)
├── ChartCrosshair.svelte     # Vertical hover line (SVG)
├── ChartTooltip.svelte       # Month values tooltip (HTML fixed)
└── ChartLegend.svelte        # Color legend (HTML)
```

### File Structure
```
frontend/src/
├── lib/
│   └── charts/
│       └── monthly-fertility-utils.ts   # Pure D3 utilities (SSR-safe)
├── components/svelte/
│   └── charts/
│       ├── MonthlyFertilityChart.svelte # Main component
│       └── chart/                       # Sub-components
│           ├── ChartGrid.svelte
│           ├── ChartAxes.svelte
│           ├── ChartAxisLabels.svelte
│           ├── ChartCrosshair.svelte
│           ├── ChartTooltip.svelte
│           └── ChartLegend.svelte
└── pages/
    └── [metric]/[country].astro         # Page integration
```

### Data Pipeline Output
```
data-pipeline/output/monthly-fertility/          # Primary output
frontend/src/assets/data/monthly-fertility/      # Build-time imports
frontend/public/data/monthly-fertility/          # Client-side fetch
```

### Coordinate System
- **ViewBox**: Fixed 1000x500 internal coordinate space
- **Margins**: `{ top: 40, right: 80, bottom: 50, left: 60 }`
- **Chart area**: 860 x 410 (after margins)
- **Scaling**: SVG stretches to fill container; `vector-effect` keeps strokes constant

### Key Utilities
```typescript
// Convert mouse coords to viewBox coords
clientToViewBox(clientX, clientY, svgRect) → { x, y }

// Convert viewBox coords to CSS percentages for HTML overlays
viewBoxToPercent(viewBoxX, viewBoxY) → { left: "50%", top: "50%" }

// Find closest year to hover position
binarySearchClosestYear(years, targetYear) → index

// Get line color based on month ranking
getMonthColor(month, highestMonth, lowestMonth) → { color, alpha, strokeWidth }
```
