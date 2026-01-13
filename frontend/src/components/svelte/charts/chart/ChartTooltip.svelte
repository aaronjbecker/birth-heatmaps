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
    const tooltipWidthEstimate = 200; // Used only for flip detection
    const tooltipHeight = 340; // Estimate: header ~32 + annual row ~28 + 12 months ~240 + padding ~24
    const offset = 12; // Gap between tooltip edge and crosshair

    // Use clientWidth to exclude scrollbar
    const viewportWidth = typeof document !== 'undefined'
      ? document.documentElement.clientWidth
      : (typeof window !== 'undefined' ? window.innerWidth : 0);

    // Check if tooltip should flip to the left
    const normalLeft = position.x + offset;
    const shouldFlip = viewportWidth > 0 &&
      normalLeft + tooltipWidthEstimate > viewportWidth - padding;

    // Vertical positioning
    let top = position.y - tooltipHeight / 2;
    if (typeof window !== 'undefined') {
      if (top < padding) top = padding;
      if (top + tooltipHeight > window.innerHeight - padding) {
        top = window.innerHeight - tooltipHeight - padding;
      }
    }

    if (shouldFlip) {
      // Use 'right' positioning so tooltip's right edge anchors near crosshair
      // Use smaller offset when flipped to match visual appearance
      const flippedOffset = 6;
      const right = viewportWidth - position.x + flippedOffset;
      return `right: ${right}px; top: ${top}px;`;
    } else {
      return `left: ${normalLeft}px; top: ${top}px;`;
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
    class="fixed z-50 bg-bg border border-border rounded-lg shadow-lg p-3 pointer-events-none"
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
