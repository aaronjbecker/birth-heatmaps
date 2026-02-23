# Expanded Compare Page: Line Chart + Wide Heatmap

## Overview

The Compare page supports three visualization modes for comparing birth patterns across countries and US states:

1. **Heatmaps** (default) — Full heatmap per country, stacked vertically with shared year range and optional unified color scale
2. **Line Chart** — Multi-line time series with annual/monthly granularity, expandable births and population sections
3. **Wide Heatmap** — One row per country/state, months rendered sequentially in a compact scrollable grid

## Implementation Status

### Phase 1: Foundation ✅
- [x] `ViewMode` type (`'heatmap' | 'line' | 'wide'`)
- [x] `LineGranularity` type (`'annual' | 'monthly'`)
- [x] `view` and `granularity` added to `CompareQueryParams`
- [x] URL parsing/serialization in `url-params.ts`
- [x] `compare-colors.ts` — 10-color categorical palette

### Phase 2: View Mode Toggle ✅
- [x] `ViewModeToggle.svelte` — three-button segmented control
- [x] `ComparePageClient.svelte` — view mode state, URL sync, conditional rendering
- [x] Scale mode toggle hidden in line chart view

### Phase 3: Multi-Line Chart ✅
- [x] `compare-line-data.ts` — data extraction utilities (annual + monthly granularity)
- [x] `CompareLineChartInner.svelte` — reusable multi-line SVG chart with crosshair tooltip
- [x] `CompareLineChart.svelte` — orchestrator with year range filter, granularity toggle, expandable sections

### Phase 4: Wide Heatmap ✅
- [x] `CompareWideHeatmap.svelte` — single-row-per-country heatmap with horizontal scroll
- [x] Year markers, scroll fade indicators, cell tooltips
- [x] Unified/per-country color scale support

### Phase 5: Testing ✅
- [x] `compare-colors.test.ts` — palette assignment and fallback behavior
- [x] `compare-line-data.test.ts` — extraction correctness, null handling, empty data
- [x] `url-params.test.ts` — view/granularity round-trip tests

## File Summary

### New files
| File | Purpose |
|------|---------|
| `frontend/src/lib/compare-colors.ts` | Categorical color palette assignment |
| `frontend/src/lib/compare-line-data.ts` | Extract time series from heatmap cells |
| `frontend/src/components/svelte/ViewModeToggle.svelte` | Three-mode segmented control |
| `frontend/src/components/svelte/CompareLineChart.svelte` | Line chart orchestrator |
| `frontend/src/components/svelte/CompareLineChartInner.svelte` | Reusable multi-line SVG chart |
| `frontend/src/components/svelte/CompareWideHeatmap.svelte` | Wide single-row-per-country heatmap |
| `frontend/src/lib/compare-colors.test.ts` | Color assignment tests |
| `frontend/src/lib/compare-line-data.test.ts` | Data extraction tests |

### Modified files
| File | Change |
|------|--------|
| `frontend/src/lib/types.ts` | Added `ViewMode`, `LineGranularity`, extended `CompareQueryParams` |
| `frontend/src/lib/url-params.ts` | Parse/serialize `view` and `granularity` params |
| `frontend/src/lib/url-params.test.ts` | Added view/granularity tests |
| `frontend/src/components/svelte/ComparePageClient.svelte` | View mode state, toggle, conditional rendering, color map |

## Architecture Notes

- All three views reuse the same data bundles loaded by `ComparePageClient` (no pipeline changes)
- Color palette wraps at 10 colors with deterministic index-based assignment
- Line chart reuses existing chart sub-components (`ChartGrid`, `ChartAxes`, `ChartAxisLabels`, `ChartCrosshair`)
- Wide heatmap uses fixed-size SVG rects (4px wide × 28px tall) with native scroll
- Worst case performance: 10 countries × 60 years × 12 months = 7,200 SVG rects
