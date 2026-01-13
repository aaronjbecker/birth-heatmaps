<script lang="ts">
  /**
   * ChartAxes - Renders X-axis tick marks in SVG
   * Pure SVG component with no state management
   */

  interface XTick {
    year: number;
    x: number;
    label: string;
  }

  interface Props {
    xTickValues: XTick[];
    chartMarginLeft: number;
    chartTop: number;
    chartHeight: number;
  }

  let {
    xTickValues,
    chartMarginLeft,
    chartTop,
    chartHeight,
  }: Props = $props();

  // Tick mark length
  const TICK_LENGTH = 6;
</script>

<g class="chart-axes">
  <!-- X-axis tick marks -->
  {#each xTickValues as tick (tick.year)}
    <line
      x1={chartMarginLeft + tick.x}
      y1={chartTop + chartHeight}
      x2={chartMarginLeft + tick.x}
      y2={chartTop + chartHeight + TICK_LENGTH}
      stroke="var(--color-svg-axis)"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
  {/each}
</g>
