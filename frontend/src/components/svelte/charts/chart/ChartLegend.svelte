<script lang="ts">
  /**
   * ChartLegend - Color legend showing month highlighting
   */
  import { getMonthName, MONTH_COLORS } from '../../../../lib/charts/monthly-fertility-utils';

  interface Props {
    highestMonth: number;
    lowestMonth: number;
  }

  let {
    highestMonth,
    lowestMonth,
  }: Props = $props();
</script>

<div class="chart-legend flex flex-wrap gap-4 text-xs text-text-muted mt-2 justify-end">
  <div class="flex items-center gap-1.5">
    <span
      class="w-3 h-0.5 inline-block"
      style="background-color: {MONTH_COLORS.highest};"
    ></span>
    <span>{getMonthName(highestMonth)} (highest birth rate)</span>
  </div>
  <div class="flex items-center gap-1.5">
    <span
      class="w-3 h-0.5 inline-block"
      style="background-color: {MONTH_COLORS.lowest};"
    ></span>
    <span>{getMonthName(lowestMonth)} (lowest birth rate)</span>
  </div>
  <div class="flex items-center gap-1.5">
    <span
      class="w-3 h-0.5 inline-block bg-text"
    ></span>
    <span>Annual Average</span>
  </div>
</div>
