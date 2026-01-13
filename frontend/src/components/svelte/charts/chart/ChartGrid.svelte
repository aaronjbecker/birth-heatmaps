<script lang="ts">
  /**
   * ChartGrid - Renders horizontal grid lines for the chart
   * Pure SVG component with no state management
   */
  import type { ScaleLinear } from 'd3-scale';

  interface Props {
    yTickValues: number[];
    yScale: ScaleLinear<number, number>;
    chartMarginLeft: number;
    chartTop: number;
    chartWidth: number;
    chartHeight: number;
  }

  let {
    yTickValues,
    yScale,
    chartMarginLeft,
    chartTop,
    chartWidth,
    chartHeight,
  }: Props = $props();

  // Compute grid line positions
  let gridLines = $derived(
    yTickValues.map(value => ({
      value,
      y: yScale(value),
    }))
  );
</script>

<g class="chart-grid">
  <!-- Background rect -->
  <rect
    x={chartMarginLeft}
    y={chartTop}
    width={chartWidth}
    height={chartHeight}
    fill="var(--color-bg)"
    stroke="var(--color-border)"
    stroke-width="1"
    vector-effect="non-scaling-stroke"
  />

  <!-- Horizontal grid lines -->
  {#each gridLines as line (line.value)}
    <line
      x1={chartMarginLeft}
      y1={chartTop + line.y}
      x2={chartMarginLeft + chartWidth}
      y2={chartTop + line.y}
      stroke="var(--color-svg-axis)"
      stroke-width="0.5"
      stroke-dasharray="4 2"
      opacity="0.3"
      vector-effect="non-scaling-stroke"
    />
  {/each}
</g>
