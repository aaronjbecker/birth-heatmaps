<script lang="ts">
  /**
   * ChartTooltip - Displays all month values for hovered year
   * Fixed positioned HTML overlay with edge detection
   */
  import type { MonthlyFertilityTooltipData } from '../../../../lib/types';

  interface Props {
    data: MonthlyFertilityTooltipData | null;
    position: { x: number; y: number } | null;
  }

  let {
    data,
    position,
  }: Props = $props();

  // Calculate tooltip position with viewport edge detection
  let tooltipStyle = $derived.by(() => {
    if (!position) return '';

    const padding = 16;
    const tooltipWidth = 200;
    const tooltipHeight = 420; // Estimate for 13 rows

    let left = position.x + 20;
    let top = position.y - tooltipHeight / 2;

    // Adjust if near right edge
    if (typeof window !== 'undefined') {
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = position.x - tooltipWidth - 20;
      }

      // Adjust if near top/bottom
      if (top < padding) top = padding;
      if (top + tooltipHeight > window.innerHeight - padding) {
        top = window.innerHeight - tooltipHeight - padding;
      }
    }

    return `left: ${left}px; top: ${top}px;`;
  });

  // Sort month values by value descending
  let sortedMonthValues = $derived(
    data?.monthValues
      .slice()
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)) ?? []
  );
</script>

{#if data && position}
  <div
    class="fixed z-50 bg-bg border border-border rounded-lg shadow-lg p-3 pointer-events-none"
    style={tooltipStyle}
  >
    <!-- Year header -->
    <div class="text-sm font-bold text-text mb-2 border-b border-border pb-2">
      {data.year}
    </div>

    <!-- Month values -->
    <div class="space-y-1 text-xs">
      {#each sortedMonthValues as mv (mv.month)}
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

      <!-- Annual average -->
      <div class="flex justify-between items-center gap-3 pt-2 border-t border-border mt-2">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-text flex-shrink-0"></span>
          <span class="font-medium text-text">Annual Avg</span>
        </span>
        <span class="font-mono font-bold text-text">
          {data.annualValue !== null ? data.annualValue.toFixed(1) : '—'}
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Hide tooltip on touch devices when using CSS media query */
  @media (pointer: coarse) {
    /* Touch devices - we handle visibility in JS instead */
  }
</style>
