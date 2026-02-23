<script lang="ts">
  /**
   * Reusable multi-line SVG chart for the Compare page.
   * Renders multiple country/state series with shared axes and crosshair tooltip.
   * Follows MonthlyFertilityChart.svelte pattern with viewBox-based responsive scaling.
   */
  import type { TimeSeriesPoint } from '../../lib/compare-line-data';
  import { scaleLinear, type ScaleLinear } from 'd3-scale';
  import { line, type Line } from 'd3-shape';
  import ChartGrid from './charts/chart/ChartGrid.svelte';
  import ChartAxes from './charts/chart/ChartAxes.svelte';
  import ChartAxisLabels from './charts/chart/ChartAxisLabels.svelte';
  import ChartCrosshair from './charts/chart/ChartCrosshair.svelte';

  const VIEWBOX = { width: 1000, height: 500 } as const;
  const MARGIN = { top: 20, right: 20, bottom: 35, left: 65 } as const;
  const CHART_TOP = MARGIN.top;
  const CHART_WIDTH = VIEWBOX.width - MARGIN.left - MARGIN.right;
  const CHART_HEIGHT = VIEWBOX.height - MARGIN.top - MARGIN.bottom;

  interface SeriesData {
    code: string;
    name: string;
    data: TimeSeriesPoint[];
  }

  interface Props {
    series: SeriesData[];
    colorMap: Map<string, string>;
    yLabel: string;
    yearRange: [number, number];
    formatValue?: (v: number) => string;
    height?: number;
  }

  let {
    series,
    colorMap,
    yLabel,
    yearRange,
    formatValue = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    height = 400,
  }: Props = $props();

  // DOM refs
  let svgElement: SVGSVGElement | null = $state(null);
  let containerWidth = $state(800);

  // Interaction state
  let hoveredX = $state<number | null>(null);
  let crosshairViewBoxX = $state<number | null>(null);
  let isTouchActive = $state(false);

  // Derived: X scale (uses yearRange prop)
  const xScale = $derived(
    scaleLinear().domain(yearRange).range([0, CHART_WIDTH])
  );

  // Derived: Y domain from all series data within year range
  const yDomain = $derived.by((): [number, number] => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const pt of s.data) {
        if (pt.x >= yearRange[0] && pt.x <= yearRange[1] + 1) {
          if (pt.y < min) min = pt.y;
          if (pt.y > max) max = pt.y;
        }
      }
    }
    if (!isFinite(min)) return [0, 1];
    const padding = (max - min) * 0.05;
    return [min - padding, max + padding];
  });

  // Derived: Y scale
  const yScale = $derived(
    scaleLinear().domain(yDomain).range([CHART_HEIGHT, 0])
  );

  // Derived: Line generator
  const lineGen = $derived(
    line<[number, number]>()
      .defined(d => !isNaN(d[1]))
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
  );

  // Derived: Series paths
  const seriesPaths = $derived(
    series.map(s => ({
      code: s.code,
      name: s.name,
      color: colorMap.get(s.code) ?? '#9ca3af',
      path: lineGen(
        s.data
          .filter(pt => pt.x >= yearRange[0] && pt.x <= yearRange[1] + 1)
          .map(pt => [pt.x, pt.y] as [number, number])
      ) || '',
    }))
  );

  // Derived: Y tick values
  const yTickValues = $derived.by(() => {
    const [min, max] = yDomain;
    const range = max - min;
    let interval: number;
    if (range <= 1) interval = 0.2;
    else if (range <= 5) interval = 1;
    else if (range <= 20) interval = 5;
    else if (range <= 50) interval = 10;
    else if (range <= 200) interval = 50;
    else if (range <= 1000) interval = 200;
    else if (range <= 10000) interval = 2000;
    else if (range <= 100000) interval = 20000;
    else if (range <= 1000000) interval = 200000;
    else interval = Math.pow(10, Math.floor(Math.log10(range / 5)));

    const startTick = Math.ceil(min / interval) * interval;
    const ticks: number[] = [];
    for (let t = startTick; t <= max; t += interval) {
      ticks.push(t);
    }
    return ticks;
  });

  // Derived: X tick values
  const xTickValues = $derived.by(() => {
    const [minY, maxY] = yearRange;
    const yearSpan = maxY - minY;
    const pixelsPerLabel = 60;
    const maxLabels = Math.floor(containerWidth / pixelsPerLabel);

    let interval: number;
    if (yearSpan <= 30) interval = yearSpan <= maxLabels * 5 ? 5 : 10;
    else if (yearSpan <= 60) interval = 10;
    else interval = yearSpan <= maxLabels * 10 ? 10 : 20;

    const startYear = Math.ceil(minY / interval) * interval;
    const ticks: { year: number; x: number; label: string }[] = [];
    for (let year = startYear; year <= maxY; year += interval) {
      ticks.push({ year, x: xScale(year), label: String(year) });
    }
    return ticks;
  });

  // Derived: Tooltip data at hovered X position
  const tooltipData = $derived.by(() => {
    if (hoveredX === null) return null;

    const entries: { code: string; name: string; color: string; value: number | null }[] = [];
    for (const s of series) {
      const color = colorMap.get(s.code) ?? '#9ca3af';
      // Find the closest data point to hoveredX
      let closest: TimeSeriesPoint | null = null;
      let closestDist = Infinity;
      for (const pt of s.data) {
        if (pt.x < yearRange[0] || pt.x > yearRange[1] + 1) continue;
        const dist = Math.abs(pt.x - hoveredX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = pt;
        }
      }
      entries.push({
        code: s.code,
        name: s.name,
        color,
        value: closest && closestDist < 1 ? closest.y : null,
      });
    }

    return {
      x: hoveredX,
      label: Math.round(hoveredX).toString(),
      entries,
    };
  });

  // Tooltip position as percentage of container
  const tooltipPosition = $derived.by(() => {
    if (crosshairViewBoxX === null) return null;
    const xPercent = (crosshairViewBoxX / VIEWBOX.width) * 100;
    const yPercent = ((CHART_TOP + CHART_HEIGHT / 2) / VIEWBOX.height) * 100;
    return { x: xPercent, y: yPercent };
  });

  // ===== Event Handlers =====
  function updateHoverFromPointer(event: PointerEvent) {
    if (!svgElement) return;
    const rect = svgElement.getBoundingClientRect();
    const scaleX = VIEWBOX.width / rect.width;
    const viewBoxX = (event.clientX - rect.left) * scaleX;
    const chartX = viewBoxX - MARGIN.left;

    if (chartX < 0 || chartX > CHART_WIDTH) {
      clearHover();
      return;
    }

    const yearVal = xScale.invert(chartX);
    hoveredX = yearVal;
    crosshairViewBoxX = viewBoxX;
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') isTouchActive = true;
    updateHoverFromPointer(event);
  }

  function handlePointerMove(event: PointerEvent) {
    updateHoverFromPointer(event);
  }

  function handlePointerLeave(event: PointerEvent) {
    if (event.pointerType !== 'touch') clearHover();
  }

  function clearHover() {
    hoveredX = null;
    crosshairViewBoxX = null;
  }

  // Touch dismiss
  $effect(() => {
    if (typeof document === 'undefined' || !isTouchActive) return;

    function handleOutside(event: PointerEvent) {
      if (svgElement && !svgElement.contains(event.target as Node)) {
        clearHover();
        isTouchActive = false;
      }
    }

    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  });

  function viewBoxToPercent(vx: number, vy: number) {
    return {
      left: `${(vx / VIEWBOX.width) * 100}%`,
      top: `${(vy / VIEWBOX.height) * 100}%`,
    };
  }
</script>

<div
  bind:clientWidth={containerWidth}
  class="relative w-full"
  style:height="{height}px"
>
  <svg
    bind:this={svgElement}
    viewBox="0 0 {VIEWBOX.width} {VIEWBOX.height}"
    class="w-full h-full overflow-visible"
    preserveAspectRatio="none"
    role="img"
    aria-label="Multi-country comparison line chart"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
    style="cursor: crosshair; touch-action: pan-y;"
  >
    <ChartGrid
      {yTickValues}
      {yScale}
      chartMarginLeft={MARGIN.left}
      chartTop={CHART_TOP}
      chartWidth={CHART_WIDTH}
      chartHeight={CHART_HEIGHT}
    />

    <ChartAxes
      {xTickValues}
      chartMarginLeft={MARGIN.left}
      chartTop={CHART_TOP}
      chartHeight={CHART_HEIGHT}
    />

    <!-- Series lines -->
    <g transform="translate({MARGIN.left}, {CHART_TOP})">
      {#each seriesPaths as sp (sp.code)}
        <path
          d={sp.path}
          fill="none"
          stroke={sp.color}
          stroke-width={2}
          opacity={0.9}
          vector-effect="non-scaling-stroke"
        />
      {/each}
    </g>

    <ChartCrosshair
      x={crosshairViewBoxX}
      chartTop={CHART_TOP}
      chartHeight={CHART_HEIGHT}
    />
  </svg>

  <!-- HTML axis labels overlay -->
  <div class="absolute inset-0 pointer-events-none overflow-hidden">
    <ChartAxisLabels
      {xTickValues}
      {yTickValues}
      {yScale}
      chartMarginLeft={MARGIN.left}
      chartTop={CHART_TOP}
      chartHeight={CHART_HEIGHT}
      viewBoxWidth={VIEWBOX.width}
      viewBoxHeight={VIEWBOX.height}
      yAxisLabel={yLabel}
    />
  </div>

  <!-- Tooltip -->
  {#if tooltipData && tooltipPosition}
    {@const isRightHalf = tooltipPosition.x > 50}
    <div
      class="absolute pointer-events-none z-10"
      style="left: {tooltipPosition.x}%; top: 8px; transform: translateX({isRightHalf ? '-105%' : '5%'});"
    >
      <div class="bg-bg-alt border border-border rounded-lg shadow-lg px-3 py-2 text-sm min-w-[140px]">
        <div class="font-semibold text-text mb-1">{tooltipData.label}</div>
        {#each tooltipData.entries as entry (entry.code)}
          <div class="flex items-center gap-2 py-0.5">
            <span
              class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style="background-color: {entry.color};"
            ></span>
            <span class="text-text-muted truncate max-w-[120px]">{entry.name}</span>
            <span class="ml-auto font-mono text-text">
              {entry.value !== null ? formatValue(entry.value) : '—'}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
