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
    class="tooltip"
    data-testid="tooltip"
  >
    <div class="content">
      <div class="header">
        {monthName} {cell.year}
      </div>
      <div class="value">
        {formattedValue}
      </div>

      {#if cell.births !== undefined && cell.births !== null}
        <div class="detail-row">
          <span>Births:</span>
          <span>{cell.births.toLocaleString()}</span>
        </div>
      {/if}

      {#if cell.population !== undefined && cell.population !== null}
        <div class="detail-row">
          <span>Population:</span>
          <span>{cell.population.toLocaleString()}</span>
        </div>
      {/if}

      <div class="source">
        Source: {sourceName}
      </div>
    </div>

    <div bind:this={arrowRef} class="arrow"></div>
  </div>
{/if}

<style>
  .tooltip {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1000;
    opacity: 1;
    transition: opacity 0.1s ease-out;
  }

  .content {
    background-color: var(--color-tooltip-bg);
    border: 1px solid var(--color-tooltip-border);
    border-radius: 4px;
    padding: 8px 12px;
    box-shadow: 0 2px 8px var(--color-shadow);
    font-size: 13px;
    line-height: 1.4;
    min-width: 140px;
    max-width: 220px;
  }

  .header {
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--color-text);
  }

  .value {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 4px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
    color: var(--color-text-muted);
    font-size: 12px;
  }

  .source {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--color-border-light);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .arrow {
    position: absolute;
    background-color: var(--color-tooltip-bg);
    border: 1px solid var(--color-tooltip-border);
    width: 8px;
    height: 8px;
    transform: rotate(45deg);
    pointer-events: none;
  }
</style>
