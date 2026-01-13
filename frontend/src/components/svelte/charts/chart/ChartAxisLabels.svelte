<script lang="ts">
  /**
   * ChartAxisLabels - HTML overlay for axis labels
   * Positions labels using percentage-based CSS for responsive scaling
   */
  import type { ScaleLinear } from 'd3-scale';
  import { viewBoxToPercent } from '../../../../lib/charts/monthly-fertility-utils';

  interface XTick {
    year: number;
    x: number;
    label: string;
  }

  interface Props {
    xTickValues: XTick[];
    yTickValues: number[];
    yScale: ScaleLinear<number, number>;
    chartMarginLeft: number;
    chartTop: number;
    chartHeight: number;
    viewBoxWidth: number;
    viewBoxHeight: number;
    yAxisLabel?: string;
  }

  let {
    xTickValues,
    yTickValues,
    yScale,
    chartMarginLeft,
    chartTop,
    chartHeight,
    viewBoxWidth,
    viewBoxHeight,
    yAxisLabel = 'Daily Fertility Rate',
  }: Props = $props();

  // Compute Y-axis label positions
  let yLabels = $derived(
    yTickValues.map(value => ({
      value,
      viewBoxY: chartTop + yScale(value),
      label: value.toFixed(0),
    }))
  );

  // Compute X-axis label positions
  let xLabels = $derived(
    xTickValues.map(tick => ({
      year: tick.year,
      viewBoxX: chartMarginLeft + tick.x,
      label: tick.label,
    }))
  );

  // Compute Y-axis title position (centered in left margin)
  let yTitlePos = $derived(viewBoxToPercent(chartMarginLeft * 0.35, chartTop + chartHeight / 2));
</script>

<div class="axis-labels pointer-events-none">
  <!-- Y-axis labels (left side) -->
  {#each yLabels as label (label.value)}
    {@const pos = viewBoxToPercent(chartMarginLeft - 8, label.viewBoxY)}
    <div
      class="absolute text-xs text-text-muted font-mono"
      style="left: {pos.left}; top: {pos.top}; transform: translate(-100%, -50%);"
    >
      {label.label}
    </div>
  {/each}

  <!-- X-axis labels (bottom) -->
  {#each xLabels as label (label.year)}
    {@const pos = viewBoxToPercent(label.viewBoxX, chartTop + chartHeight + 10)}
    <div
      class="absolute text-xs text-text-muted"
      style="left: {pos.left}; top: {pos.top}; transform: translate(-50%, 0);"
    >
      {label.label}
    </div>
  {/each}

  <!-- Y-axis title (rotated) -->
  <div
    class="absolute text-xs text-text-muted whitespace-nowrap"
    style="left: {yTitlePos.left}; top: {yTitlePos.top}; transform: translate(-50%, -50%) rotate(-90deg);"
  >
    {yAxisLabel}
  </div>
</div>
