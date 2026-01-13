<script lang="ts">
  /**
   * ChartCrosshair - Vertical line at hover position
   * Pure SVG component
   */

  interface Props {
    x: number | null;
    chartTop: number;
    chartHeight: number;
  }

  let {
    x,
    chartTop,
    chartHeight,
  }: Props = $props();
</script>

{#if x !== null}
  <line
    x1={x}
    y1={chartTop}
    x2={x}
    y2={chartTop + chartHeight}
    stroke="var(--color-text)"
    stroke-width="1"
    stroke-dasharray="4 2"
    opacity="0.6"
    vector-effect="non-scaling-stroke"
    class="pointer-events-none"
  />
{/if}
