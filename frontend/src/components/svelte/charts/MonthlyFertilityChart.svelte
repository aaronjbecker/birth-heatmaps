<script lang="ts">
  /**
   * MonthlyFertilityChart - Interactive time series chart
   * Shows 12 monthly lines + annual average with hover interaction
   */
  import type { MonthlyFertilityTimeSeriesData, MonthlyFertilityTooltipData } from '../../../lib/types';
  import {
    VIEWBOX,
    CHART_MARGIN,
    CHART_TOP,
    CHART_HEIGHT,
    CHART_WIDTH,
    createXScale,
    createYScale,
    createLineGenerator,
    computeYTickValues,
    computeXTickValues,
    clientToViewBox,
    binarySearchClosestYear,
    getMonthColor,
  } from '../../../lib/charts/monthly-fertility-utils';

  // Calculate legend padding to align with chart area right edge
  const legendRightPadding = `${(CHART_MARGIN.right / VIEWBOX.width) * 100}%`;
  const legendLeftPadding = `${(CHART_MARGIN.left / VIEWBOX.width) * 100}%`;

  import ChartGrid from './chart/ChartGrid.svelte';
  import ChartAxes from './chart/ChartAxes.svelte';
  import ChartAxisLabels from './chart/ChartAxisLabels.svelte';
  import ChartCrosshair from './chart/ChartCrosshair.svelte';
  import ChartTooltip from './chart/ChartTooltip.svelte';
  import ChartLegend from './chart/ChartLegend.svelte';

  interface Props {
    data: MonthlyFertilityTimeSeriesData;
    height?: number;
  }

  let {
    data,
    height = 400,
  }: Props = $props();

  // DOM refs
  let svgElement: SVGSVGElement | null = $state(null);
  let containerWidth = $state(800);

  // Interaction state
  let hoveredYear = $state<number | null>(null);
  let crosshairX = $state<number | null>(null);
  let tooltipPosition = $state<{ x: number; y: number } | null>(null);
  let isTouchActive = $state(false);

  // Derived: Years array from data
  let years = $derived(
    data.yearRange
      ? Array.from(
          { length: data.yearRange[1] - data.yearRange[0] + 1 },
          (_, i) => data.yearRange[0] + i
        )
      : []
  );

  // Derived: Scales
  let xScale = $derived(createXScale(years));
  let yScale = $derived(createYScale(data.yDomain));
  let line = $derived(createLineGenerator(xScale, yScale));

  // Derived: Tick values
  let yTickValues = $derived(computeYTickValues(data.yDomain));
  let xTickValues = $derived(computeXTickValues(years, containerWidth));

  // Derived: Month line paths with colors
  let monthPaths = $derived(
    data.monthlySeries.map(series => {
      const { color, alpha, strokeWidth } = getMonthColor(
        series.month,
        data.monthRanking.highestAvg,
        data.monthRanking.lowestAvg
      );
      return {
        month: series.month,
        monthName: series.monthName,
        path: line(series.data.map(d => [d.year, d.value ?? NaN] as [number, number])) || '',
        color,
        alpha,
        strokeWidth,
      };
    })
  );

  // Derived: Sort paths so highlighted lines render on top
  let sortedMonthPaths = $derived(
    [...monthPaths].sort((a, b) => a.strokeWidth - b.strokeWidth)
  );

  // Derived: Annual average path
  let annualPath = $derived(
    line(data.annualAverageSeries.map(d => [d.year, d.value] as [number, number])) || ''
  );

  // Derived: Tooltip data for hovered year
  let tooltipData = $derived.by((): MonthlyFertilityTooltipData | null => {
    if (hoveredYear === null) return null;

    const monthValues = data.monthlySeries.map(series => {
      const point = series.data.find(d => d.year === hoveredYear);
      const { color } = getMonthColor(
        series.month,
        data.monthRanking.highestAvg,
        data.monthRanking.lowestAvg
      );
      return {
        month: series.month,
        monthName: series.monthName,
        value: point?.value ?? null,
        color,
      };
    });

    const annualValue = data.annualAverageSeries.find(d => d.year === hoveredYear)?.value ?? null;

    return { year: hoveredYear, monthValues, annualValue };
  });

  // Event handlers
  function handlePointerMove(event: PointerEvent) {
    if (!svgElement) return;

    const svgRect = svgElement.getBoundingClientRect();
    const { x } = clientToViewBox(event.clientX, event.clientY, svgRect);

    // Convert viewBox X to year
    const adjustedX = x - CHART_MARGIN.left;
    if (adjustedX < 0 || adjustedX > CHART_WIDTH) {
      clearHover();
      return;
    }

    const yearFromX = xScale.invert(adjustedX);
    const closestIndex = binarySearchClosestYear(years, yearFromX);
    const closestYear = years[closestIndex];

    if (closestYear !== undefined) {
      hoveredYear = closestYear;
      const viewBoxX = xScale(closestYear) + CHART_MARGIN.left;
      crosshairX = viewBoxX;
      // Convert crosshair viewBox X to screen coordinates for tooltip positioning
      const crosshairScreenX = svgRect.left + (viewBoxX / VIEWBOX.width) * svgRect.width;

      // Position tooltip Y at chart area vertical midpoint
      const chartCenterY = CHART_TOP + CHART_HEIGHT / 2;
      const tooltipScreenY = svgRect.top + (chartCenterY / VIEWBOX.height) * svgRect.height;

      tooltipPosition = { x: crosshairScreenX, y: tooltipScreenY };
    }
  }

  function handlePointerLeave(event: PointerEvent) {
    // Don't clear on touch - let user tap outside to dismiss
    if (event.pointerType !== 'touch') {
      clearHover();
    }
  }

  function handleTouchStart() {
    isTouchActive = true;
  }

  function handleClick(event: MouseEvent) {
    // On touch devices, clicking outside the chart clears the tooltip
    if (isTouchActive) {
      const target = event.target as HTMLElement;
      if (!target.closest('svg')) {
        clearHover();
        isTouchActive = false;
      }
    }
  }

  function clearHover() {
    hoveredYear = null;
    crosshairX = null;
    tooltipPosition = null;
  }

  // Handle click outside to dismiss tooltip on touch devices
  $effect(() => {
    if (typeof document === 'undefined') return;

    function handleDocumentClick(event: MouseEvent) {
      if (isTouchActive && svgElement && !svgElement.contains(event.target as Node)) {
        clearHover();
        isTouchActive = false;
      }
    }

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  });
</script>

<div
  bind:clientWidth={containerWidth}
  class="monthly-fertility-chart relative w-full"
  style:height="{height}px"
>
  <svg
    bind:this={svgElement}
    viewBox="0 0 {VIEWBOX.width} {VIEWBOX.height}"
    class="w-full h-full overflow-visible"
    preserveAspectRatio="none"
    role="img"
    aria-label="Monthly fertility rate time series chart for {data.country?.name || data.state?.name}"
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
    ontouchstart={handleTouchStart}
    style="cursor: crosshair;"
  >
    <ChartGrid
      {yTickValues}
      {yScale}
      chartMarginLeft={CHART_MARGIN.left}
      chartTop={CHART_TOP}
      chartWidth={CHART_WIDTH}
      chartHeight={CHART_HEIGHT}
    />

    <ChartAxes
      {xTickValues}
      chartMarginLeft={CHART_MARGIN.left}
      chartTop={CHART_TOP}
      chartHeight={CHART_HEIGHT}
    />

    <!-- Month lines (sorted: gray first, then highlighted) -->
    <g transform="translate({CHART_MARGIN.left}, {CHART_TOP})">
      {#each sortedMonthPaths as mp (mp.month)}
        <path
          d={mp.path}
          fill="none"
          stroke={mp.color}
          stroke-width={mp.strokeWidth}
          opacity={mp.alpha}
          vector-effect="non-scaling-stroke"
        />
      {/each}

      <!-- Annual average on top -->
      <path
        d={annualPath}
        fill="none"
        stroke="var(--color-text)"
        stroke-width={3}
        opacity={1}
        vector-effect="non-scaling-stroke"
      />
    </g>

    <ChartCrosshair
      x={crosshairX}
      chartTop={CHART_TOP}
      chartHeight={CHART_HEIGHT}
    />
  </svg>

  <!-- HTML Overlays -->
  <div class="absolute inset-0 pointer-events-none overflow-hidden">
    <ChartAxisLabels
      {xTickValues}
      {yTickValues}
      {yScale}
      chartMarginLeft={CHART_MARGIN.left}
      chartTop={CHART_TOP}
      chartHeight={CHART_HEIGHT}
      viewBoxWidth={VIEWBOX.width}
      viewBoxHeight={VIEWBOX.height}
    />
  </div>

  <ChartTooltip
    data={tooltipData}
    position={tooltipPosition}
  />
</div>

<!-- Legend aligned with chart area edges -->
<div style="padding-left: {legendLeftPadding}; padding-right: {legendRightPadding};">
  <ChartLegend
    highestMonth={data.monthRanking.highestAvg}
    lowestMonth={data.monthRanking.lowestAvg}
  />
</div>
