<script lang="ts">
  /**
   * Wide Heatmap for Compare page.
   * One row per country/state, months rendered sequentially within each row.
   * Compact overview with horizontal scrolling for long time series.
   */
  import type { CountryHeatmapData, ColorScaleConfig, ScaleMode } from '../../lib/types';
  import type { MetricSlug } from '../../lib/metrics';
  import type { HeatmapCell } from '../../lib/types';
  import { createColorScale, getColor, formatValue } from '../../lib/color-scales';
  import { computeCommonYearRange, computeUnifiedColorScale } from '../../lib/compare-data';
  import { getCountryColor } from '../../lib/compare-colors';
  import { getSourceDisplayName } from '../../lib/data';
  import YearRangeFilter from './YearRangeFilter.svelte';
  import ColorLegend from './ColorLegend.svelte';

  interface Props {
    countries: CountryHeatmapData[];
    colorMap: Map<string, string>;
    scaleMode: ScaleMode;
    metric: MetricSlug;
  }

  const { countries, colorMap, scaleMode, metric }: Props = $props();

  // Cell dimensions
  const CELL_WIDTH = 4;
  const CELL_HEIGHT = 28;
  const ROW_GAP = 2;
  const YEAR_LABEL_HEIGHT = 18;

  // Year range
  const commonYearRange = $derived(computeCommonYearRange(countries));
  let yearRangeStart = $state(1900);
  let yearRangeEnd = $state(2024);

  $effect(() => {
    yearRangeStart = commonYearRange[0];
    yearRangeEnd = commonYearRange[1];
  });

  const dataYears = $derived.by(() => {
    const years: number[] = [];
    for (let y = commonYearRange[0]; y <= commonYearRange[1]; y++) {
      years.push(y);
    }
    return years;
  });

  function handleYearRangeChange(start: number, end: number) {
    yearRangeStart = start;
    yearRangeEnd = end;
  }

  // Unified color scale (when in unified mode)
  const unifiedColorScale = $derived.by(() => {
    if (scaleMode !== 'unified' || countries.length === 0) return null;
    return computeUnifiedColorScale(countries, [yearRangeStart, yearRangeEnd]);
  });

  // Grid dimensions
  const totalMonths = $derived((yearRangeEnd - yearRangeStart + 1) * 12);
  const svgWidth = $derived(totalMonths * CELL_WIDTH);
  const svgHeight = $derived(
    YEAR_LABEL_HEIGHT + countries.length * (CELL_HEIGHT + ROW_GAP) - ROW_GAP
  );

  // Year markers along top
  const yearMarkers = $derived.by(() => {
    const markers: { year: number; x: number }[] = [];
    const yearSpan = yearRangeEnd - yearRangeStart + 1;
    let interval = 1;
    if (yearSpan > 10) interval = 5;
    if (yearSpan > 40) interval = 10;
    if (yearSpan > 100) interval = 20;

    const startYear = Math.ceil(yearRangeStart / interval) * interval;
    for (let y = startYear; y <= yearRangeEnd; y += interval) {
      const x = (y - yearRangeStart) * 12 * CELL_WIDTH;
      markers.push({ year: y, x });
    }
    return markers;
  });

  // Build cell lookup per country for rendering and hit testing
  function buildCellLookup(country: CountryHeatmapData): Map<string, { value: number | null }> {
    const map = new Map<string, { value: number | null }>();
    for (const cell of country.data) {
      map.set(`${cell.year}-${cell.month}`, { value: cell.value });
    }
    return map;
  }

  // Build cell data per country for rendering
  function getCellsForCountry(country: CountryHeatmapData) {
    const cellMap = buildCellLookup(country);
    const cells: { x: number; value: number | null; year: number; month: number }[] = [];

    for (let y = yearRangeStart; y <= yearRangeEnd; y++) {
      for (let m = 1; m <= 12; m++) {
        const colIndex = (y - yearRangeStart) * 12 + (m - 1);
        const cell = cellMap.get(`${y}-${m}`);
        cells.push({
          x: colIndex * CELL_WIDTH,
          value: cell?.value ?? null,
          year: y,
          month: m,
        });
      }
    }
    return cells;
  }

  // Get color scale for a country
  function getColorScaleForCountry(country: CountryHeatmapData): ReturnType<typeof createColorScale> {
    const config = (scaleMode === 'unified' && unifiedColorScale) ? unifiedColorScale : country.colorScale;
    return createColorScale(config, country.metric);
  }

  // ===== Tooltip via pointer events =====

  let svgElement: SVGSVGElement | null = $state(null);
  let isTouchActive = $state(false);

  // Tooltip state
  let tooltip = $state<{
    visible: boolean;
    svgX: number;     // X position in SVG coordinates (for positioning within scroll container)
    svgY: number;     // Y position in SVG coordinates
    name: string;
    year: number;
    month: number;
    cell: HeatmapCell | null;
  }>({
    visible: false,
    svgX: 0,
    svgY: 0,
    name: '',
    year: 0,
    month: 0,
    cell: null,
  });

  // Hovered value for legend highlight
  let hoveredValue = $state<number | null>(null);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /**
   * Hit-test: convert SVG-local coordinates to cell info.
   * Returns null if the pointer is outside any cell.
   */
  function hitTest(svgX: number, svgY: number): {
    countryIndex: number;
    year: number;
    month: number;
    cell: HeatmapCell | null;
    name: string;
    cellCenterX: number;
    cellTopY: number;
  } | null {
    // Check if within the cell grid (below year labels)
    if (svgY < YEAR_LABEL_HEIGHT) return null;

    // Determine which row (country)
    const gridY = svgY - YEAR_LABEL_HEIGHT;
    const rowHeight = CELL_HEIGHT + ROW_GAP;
    const countryIndex = Math.floor(gridY / rowHeight);
    const withinRow = gridY - countryIndex * rowHeight;

    if (countryIndex < 0 || countryIndex >= countries.length) return null;
    if (withinRow >= CELL_HEIGHT) return null; // In the gap between rows

    // Determine which column (month)
    const colIndex = Math.floor(svgX / CELL_WIDTH);
    if (colIndex < 0 || colIndex >= totalMonths) return null;

    const monthOffset = colIndex % 12;
    const yearOffset = Math.floor(colIndex / 12);
    const year = yearRangeStart + yearOffset;
    const month = monthOffset + 1;

    if (year > yearRangeEnd) return null;

    // Look up full cell data
    const country = countries[countryIndex];
    let matchedCell: HeatmapCell | null = null;
    for (const cell of country.data) {
      if (cell.year === year && cell.month === month) {
        matchedCell = cell;
        break;
      }
    }

    const cellCenterX = colIndex * CELL_WIDTH + CELL_WIDTH / 2;
    const cellTopY = YEAR_LABEL_HEIGHT + countryIndex * rowHeight;

    return {
      countryIndex,
      year,
      month,
      cell: matchedCell,
      name: country.country.name,
      cellCenterX,
      cellTopY,
    };
  }

  function updateTooltipFromPointer(event: PointerEvent) {
    if (!svgElement) return;

    // Get pointer position relative to SVG element
    const svgRect = svgElement.getBoundingClientRect();
    const svgX = event.clientX - svgRect.left;
    const svgY = event.clientY - svgRect.top;

    const hit = hitTest(svgX, svgY);

    if (hit) {
      // Offset by scroll position so tooltip is placed within the visible area.
      // Safe because we dismiss on scroll, so this value stays valid while visible.
      const scrollLeft = scrollContainer?.scrollLeft ?? 0;
      tooltip = {
        visible: true,
        svgX: hit.cellCenterX - scrollLeft,
        svgY: hit.cellTopY,
        name: hit.name,
        year: hit.year,
        month: hit.month,
        cell: hit.cell,
      };
      hoveredValue = hit.cell?.value ?? null;
    } else {
      clearTooltip();
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      isTouchActive = true;
    }
    updateTooltipFromPointer(event);
  }

  function handlePointerMove(event: PointerEvent) {
    updateTooltipFromPointer(event);
  }

  function handlePointerLeave(event: PointerEvent) {
    // Don't clear on touch — let user tap outside to dismiss
    if (event.pointerType !== 'touch') {
      clearTooltip();
    }
  }

  function clearTooltip() {
    tooltip = { ...tooltip, visible: false };
    hoveredValue = null;
  }

  // Tap outside to dismiss on touch devices
  $effect(() => {
    if (typeof document === 'undefined' || !isTouchActive) return;

    function handleOutsidePointer(event: PointerEvent) {
      if (svgElement && !svgElement.contains(event.target as Node)) {
        clearTooltip();
        isTouchActive = false;
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  });

  // Dismiss tooltip on scroll (avoids stale positioning on touch pan)
  $effect(() => {
    if (!scrollContainer) return;

    function handleScroll() {
      if (tooltip.visible) {
        clearTooltip();
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  });

  // Legend color scale config
  const legendColorScale = $derived.by(() => {
    if (scaleMode === 'unified' && unifiedColorScale) return unifiedColorScale;
    if (countries.length > 0) return countries[0].colorScale;
    return { type: 'sequential' as const, domain: [0, 1], scheme: 'turbo' };
  });

  // Scroll container ref for fade indicators
  let scrollContainer: HTMLDivElement | null = $state(null);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);

  function updateScrollIndicators() {
    if (!scrollContainer) return;
    canScrollLeft = scrollContainer.scrollLeft > 0;
    canScrollRight = scrollContainer.scrollLeft < scrollContainer.scrollWidth - scrollContainer.clientWidth - 1;
  }

  $effect(() => {
    if (!scrollContainer) return;
    updateScrollIndicators();
    scrollContainer.addEventListener('scroll', updateScrollIndicators, { passive: true });
    const observer = new ResizeObserver(updateScrollIndicators);
    observer.observe(scrollContainer);
    return () => {
      scrollContainer?.removeEventListener('scroll', updateScrollIndicators);
      observer.disconnect();
    };
  });
</script>

{#if countries.length === 0}
  <div class="flex flex-col items-center justify-center px-6 py-12 bg-bg-alt rounded-lg border border-dashed border-border text-center mt-4">
    <h3 class="text-lg font-semibold text-text m-0 mb-2">No countries selected</h3>
    <p class="text-sm text-text-muted m-0">
      Select two or more countries above to compare their birth patterns.
    </p>
  </div>
{:else}
  <div class="flex flex-col gap-2 w-full mt-4">
    <!-- Year range filter -->
    <div class="px-3 py-1.5 bg-bg-alt border border-border rounded-lg">
      <YearRangeFilter
        min={commonYearRange[0]}
        max={commonYearRange[1]}
        start={yearRangeStart}
        end={yearRangeEnd}
        onChange={handleYearRangeChange}
        {dataYears}
      />
    </div>

    <!-- Wide heatmap grid -->
    <div class="bg-bg-alt border border-border rounded-lg overflow-hidden relative">
      <div class="flex">
        <!-- Left column: country labels -->
        <div class="flex-shrink-0 w-[150px] border-r border-border z-10 bg-bg-alt" style="padding-top: {YEAR_LABEL_HEIGHT}px;">
          {#each countries as country, i (country.country.code)}
            <div
              class="flex items-center px-2 text-sm text-text truncate"
              style="height: {CELL_HEIGHT}px; {i > 0 ? `margin-top: ${ROW_GAP}px` : ''}"
              title={country.country.name}
            >
              <span
                class="inline-block w-2 h-2 rounded-full flex-shrink-0 mr-2"
                style="background-color: {getCountryColor(colorMap, country.country.code)};"
              ></span>
              <span class="truncate">{country.country.name}</span>
            </div>
          {/each}
        </div>

        <!-- Right column: scrollable SVG grid -->
        <div class="relative flex-1 min-w-0">
          <!-- Scroll fade indicators -->
          {#if canScrollLeft}
            <div class="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-bg-alt to-transparent z-10 pointer-events-none"></div>
          {/if}
          {#if canScrollRight}
            <div class="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-bg-alt to-transparent z-10 pointer-events-none"></div>
          {/if}

          <!-- Tooltip -->
          {#if tooltip.visible}
            <div
              class="absolute z-20 pointer-events-none"
              style="left: {tooltip.svgX}px; top: {tooltip.svgY - 8}px; transform: translateX(-50%) translateY(-100%);"
            >
              <div class="bg-bg-alt border border-border rounded shadow-lg px-2.5 py-1.5 text-sm whitespace-nowrap">
                <div class="font-semibold text-text">{tooltip.name}</div>
                <div class="text-text-muted mb-1">
                  {MONTH_NAMES[tooltip.month - 1]} {tooltip.year}
                </div>
                <div class="text-lg font-bold text-text mb-1">
                  {tooltip.cell?.value !== null && tooltip.cell?.value !== undefined ? formatValue(tooltip.cell.value, metric) : 'No data'}
                </div>
                {#if tooltip.cell?.births !== undefined && tooltip.cell.births !== null}
                  <div class="flex justify-between gap-4 text-xs text-text-muted">
                    <span>Births:</span>
                    <span>{tooltip.cell.births.toLocaleString()}</span>
                  </div>
                {/if}
                {#if tooltip.cell?.population !== undefined && tooltip.cell.population !== null}
                  <div class="flex justify-between gap-4 text-xs text-text-muted">
                    <span>Population:</span>
                    <span>{tooltip.cell.population.toLocaleString()}</span>
                  </div>
                {/if}
                {#if tooltip.cell?.source || tooltip.cell?.birthSource || tooltip.cell?.populationSource}
                  <div class="mt-1 pt-1 border-t border-border text-[11px] text-text-muted">
                    Source: {getSourceDisplayName(tooltip.cell.source || tooltip.cell.birthSource || tooltip.cell.populationSource || '')}
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <div
            bind:this={scrollContainer}
            class="wide-heatmap-scroll overflow-x-auto overflow-y-hidden"
          >
            <svg
              bind:this={svgElement}
              width={svgWidth}
              height={svgHeight}
              class="block"
              onpointerdown={handlePointerDown}
              onpointermove={handlePointerMove}
              onpointerleave={handlePointerLeave}
              style="cursor: crosshair; touch-action: pan-x pan-y;"
            >
              <!-- Year markers along top -->
              {#each yearMarkers as marker (marker.year)}
                <line
                  x1={marker.x}
                  y1={0}
                  x2={marker.x}
                  y2={svgHeight}
                  stroke="var(--color-border)"
                  stroke-width="1"
                  opacity="0.4"
                />
                <text
                  x={marker.x + 2}
                  y={YEAR_LABEL_HEIGHT - 4}
                  class="fill-current text-text-muted"
                  font-size="10"
                  font-family="system-ui, sans-serif"
                >
                  {marker.year}
                </text>
              {/each}

              <!-- Country rows -->
              {#each countries as country, rowIndex (country.country.code)}
                {@const scale = getColorScaleForCountry(country)}
                {@const cells = getCellsForCountry(country)}
                {@const rowY = YEAR_LABEL_HEIGHT + rowIndex * (CELL_HEIGHT + ROW_GAP)}

                {#each cells as cell (cell.x)}
                  <rect
                    x={cell.x}
                    y={rowY}
                    width={CELL_WIDTH}
                    height={CELL_HEIGHT}
                    fill={getColor(scale, cell.value)}
                  />
                {/each}
              {/each}
            </svg>
          </div>
        </div>
      </div>

      <!-- Color legend -->
      <div class="px-4 py-1.5 border-t border-border">
        <ColorLegend
          colorScale={legendColorScale}
          metric={countries[0]?.metric ?? 'fertility'}
          hoveredValue={hoveredValue}
        />
      </div>
    </div>
  </div>
{/if}
