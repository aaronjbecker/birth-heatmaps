<script lang="ts">
  /**
   * ChartTooltip - Displays all month values for hovered year
   * Absolutely positioned within parent container with edge detection
   */
  import type { MonthlyFertilityTooltipData } from '../../../../lib/types';

  interface Props {
    data: MonthlyFertilityTooltipData | null;
    /** Position as percentage of container (x%, y%) */
    position: { x: number; y: number } | null;
  }

  let {
    data,
    position,
  }: Props = $props();

  // Tooltip ref for measuring actual width
  let tooltipRef: HTMLDivElement | null = $state(null);

  // Calculate tooltip position with container edge detection
  // Position values are percentages of the container
  let tooltipStyle = $derived.by(() => {
    if (!position) return '';

    const offsetPercent = 1.5; // Gap between tooltip and crosshair as % of container width

    // Check if tooltip would overflow right edge (estimate: tooltip ~25% of container width)
    const tooltipWidthPercent = 25;
    const shouldFlip = position.x + offsetPercent + tooltipWidthPercent > 100;

    if (shouldFlip) {
      // Position from right edge
      const rightPercent = 100 - position.x + offsetPercent;
      return `right: ${rightPercent}%; top: 50%; transform: translateY(-50%);`;
    } else {
      // Position from left edge
      const leftPercent = position.x + offsetPercent;
      return `left: ${leftPercent}%; top: 50%; transform: translateY(-50%);`;
    }
  });

  // Keep months in calendar order
  let orderedMonthValues = $derived(
    data?.monthValues
      .slice()
      .sort((a, b) => a.month - b.month) ?? []
  );
</script>

{#if data && position}
  <div
    bind:this={tooltipRef}
    class="absolute z-50 bg-bg border border-border rounded-lg shadow-lg p-3 pointer-events-none"
    style={tooltipStyle}
  >
    <!-- Year header -->
    <div class="text-sm font-bold text-text mb-2 border-b border-border pb-2">
      {data.year}
    </div>

    <!-- Annual average (on top) -->
    <div class="flex justify-between items-center gap-3 text-xs pb-2 border-b border-border mb-2">
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-text flex-shrink-0"></span>
        <span class="font-medium text-text">Annual Avg</span>
      </span>
      <span class="font-mono font-bold text-text">
        {data.annualValue !== null ? data.annualValue.toFixed(1) : '—'}
      </span>
    </div>

    <!-- Month values in calendar order -->
    <div class="space-y-1 text-xs">
      {#each orderedMonthValues as mv (mv.month)}
        <div class="flex justify-between items-center gap-3">
          <span class="flex items-center gap-1.5">
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              style="background-color: {mv.color};"
            ></span>
            <span class="text-text-muted">{mv.monthName}</span>
          </span>
          <span class="font-mono text-text">
            {mv.value !== null ? mv.value.toFixed(1) : '—'}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* Hide tooltip on touch devices when using CSS media query */
  @media (pointer: coarse) {
    /* Touch devices - we handle visibility in JS instead */
  }
</style>
