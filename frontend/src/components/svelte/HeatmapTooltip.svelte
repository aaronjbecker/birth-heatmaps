<script lang="ts">
  /**
   * Tooltip component for heatmap cells
   * Uses floating-ui for intelligent positioning
   */
  import type { HeatmapCell } from '../../lib/types';
  import { getMonthName } from '../../lib/d3-heatmap';
  import { formatValue } from '../../lib/color-scales';
  import { getSourceDisplayName } from '../../lib/data';
  import { positionTooltip } from '../../lib/utils/tooltipPosition.svelte';

  interface Props {
    cell: HeatmapCell | null;
    referenceElement: SVGRectElement | null;
    metric: string;
    show: boolean;
  }

  const { cell, referenceElement, metric, show }: Props = $props();

  let tooltipRef: HTMLDivElement | null = $state(null);
  let arrowRef: HTMLDivElement | null = $state(null);
  let visible = $state(false);

  // Format values for display
  const monthName = $derived(cell ? getMonthName(cell.month) : '');
  const formattedValue = $derived(cell ? formatValue(cell.value, metric) : '');
  const sourceName = $derived(cell ? getSourceDisplayName(cell.source) : '');

  // Position tooltip synchronously before render
  $effect.pre(() => {
    if (show && cell && referenceElement && tooltipRef) {
      positionTooltip({
        tooltipRef,
        arrowRef,
        referenceElement,
        placement: 'top',
        offsetPx: 10,
        arrowSizePx: 8,
        showTooltip: true,
      });
    }
  });

  // Show/hide with slight delay for smooth transitions
  $effect(() => {
    if (show && cell && referenceElement) {
      visible = true;
    } else {
      visible = false;
    }
  });
</script>

{#if visible && cell}
  <div
    bind:this={tooltipRef}
    class="absolute top-0 left-0 pointer-events-none z-[1000] opacity-100 transition-opacity duration-100 ease-out"
    data-testid="tooltip"
  >
    <div class="rounded min-w-[140px] max-w-[220px] text-[13px] leading-[1.4] px-3 py-2 border shadow-lg" style="background-color: var(--color-tooltip-bg); border-color: var(--color-tooltip-border); box-shadow: 0 2px 8px var(--color-shadow);">
      <div class="font-semibold mb-1 text-text">
        {monthName} {cell.year}
      </div>
      <div class="text-lg font-bold text-text mb-1">
        {formattedValue}
      </div>

      {#if cell.births !== undefined && cell.births !== null}
        <div class="flex justify-between mb-0.5 text-text-muted text-xs">
          <span>Births:</span>
          <span>{cell.births.toLocaleString()}</span>
        </div>
      {/if}

      {#if cell.population !== undefined && cell.population !== null}
        <div class="flex justify-between mb-0.5 text-text-muted text-xs">
          <span>Population:</span>
          <span>{cell.population.toLocaleString()}</span>
        </div>
      {/if}

      <div class="mt-1.5 pt-1.5 border-t text-[11px] text-text-muted" style="border-color: var(--color-border-light);">
        Source: {sourceName}
      </div>
    </div>

    <div bind:this={arrowRef} class="absolute w-2 h-2 rotate-45 pointer-events-none border" style="background-color: var(--color-tooltip-bg); border-color: var(--color-tooltip-border);"></div>
  </div>
{/if}
