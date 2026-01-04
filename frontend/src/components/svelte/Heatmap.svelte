<script lang="ts">
  /**
   * Svelte 5 wrapper component for D3 heatmap visualization
   * Replaces HeatmapD3.tsx with better reactivity and performance
   */
  import type { CountryHeatmapData, ColorScaleConfig } from '../../lib/types';
  import { createHeatmap, type HeatmapInstance } from '../../lib/d3-heatmap';
  import ColorLegend from './ColorLegend.svelte';
  import YearRangeFilter from './YearRangeFilter.svelte';
  import { hoveredValueStore } from '../../lib/stores/heatmap-stores';

  interface Props {
    data: CountryHeatmapData;
    width?: number;
    height?: number;
    showLegend?: boolean;
    showYearFilter?: boolean;
    showControls?: boolean;
    /** Override the color scale from data (used for unified scale in Compare view) */
    colorScaleOverride?: ColorScaleConfig;
    /** Callback when cell hover state changes (used for synchronized legends in Compare view) */
    onCellHover?: (value: number | null) => void;
    /** Hide the border around the heatmap container (used in Compare view) */
    noBorder?: boolean;
  }

  const {
    data,
    width = 800,
    height = 500,
    showLegend = true,
    showYearFilter = true,
    showControls = true,
    colorScaleOverride,
    onCellHover: onCellHoverCallback,
    noBorder = false,
  }: Props = $props();

  // DOM refs
  let containerRef: HTMLDivElement | null = $state(null);
  let scrollWrapperRef: HTMLDivElement | null = $state(null);

  // D3 instance (not reactive, managed manually)
  let heatmapInstance: HeatmapInstance | null = null;

  // Component state - initialize with simple defaults
  let yearRangeStart = $state(0);
  let yearRangeEnd = $state(0);
  let containerWidth = $state(800);
  let scrollEnabled = $state(false);
  let hoveredValue = $state<number | null>(null);
  let scrollState = $state({ atStart: true, atEnd: false });

  // Derived values from props
  const effectiveData = $derived(
    colorScaleOverride ? { ...data, colorScale: colorScaleOverride } : data
  );
  const minYear = $derived(Math.min(...data.years));
  const maxYear = $derived(Math.max(...data.years));
  const hasData = $derived(data && data.data && data.data.length > 0);
  const yearRange = $derived<[number, number]>([yearRangeStart, yearRangeEnd]);

  // Initialize year range when data changes
  $effect(() => {
    const newMin = Math.min(...data.years);
    const newMax = Math.max(...data.years);
    yearRangeStart = newMin;
    yearRangeEnd = newMax;
  });

  // Handle value hover from D3 (for ColorLegend sync)
  function handleValueHover(value: number | null) {
    hoveredValue = value;
    hoveredValueStore.set(value);
    onCellHoverCallback?.(value);
  }

  // Handle year range change
  function handleYearRangeChange(start: number, end: number) {
    yearRangeStart = start;
    yearRangeEnd = end;
    if (heatmapInstance) {
      heatmapInstance.update(effectiveData, [start, end]);
      const scrollInfo = heatmapInstance.getScrollInfo();
      scrollEnabled = scrollInfo?.needsScroll ?? false;
    }
  }

  // Handle pointer leaving the heatmap container
  function handleContainerPointerLeave() {
    heatmapInstance?.hideTooltip();
  }

  // Handle pointerdown on container - for touch dismissal when tapping outside cells
  function handleContainerPointerDown(event: PointerEvent) {
    const target = event.target as Element;
    if (!target.closest('rect.cell')) {
      heatmapInstance?.hideTooltip();
    }
  }

  // Handle scroll position changes
  function updateScrollState() {
    if (!scrollWrapperRef) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollWrapperRef;
    scrollState = {
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
    };
  }

  // Initialize D3 heatmap when container is ready
  $effect(() => {
    if (!containerRef || !scrollWrapperRef) return;

    // Clean up previous instance
    if (heatmapInstance) {
      heatmapInstance.destroy();
      heatmapInstance = null;
    }

    // Get container dimensions
    const rect = containerRef.getBoundingClientRect();
    if (rect.width > 0) {
      containerWidth = rect.width;
    }

    // Create new heatmap with D3-native tooltip
    heatmapInstance = createHeatmap(
      containerRef,
      effectiveData,
      {},
      scrollWrapperRef,
      handleValueHover
    );

    // Apply initial year range
    heatmapInstance.update(effectiveData, yearRange);

    // Update scroll state
    const scrollInfo = heatmapInstance.getScrollInfo();
    scrollEnabled = scrollInfo?.needsScroll ?? false;

    return () => {
      if (heatmapInstance) {
        heatmapInstance.destroy();
        heatmapInstance = null;
      }
    };
  });

  // Handle resize via ResizeObserver
  $effect(() => {
    if (!containerRef) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0) {
          containerWidth = newWidth;
        }
        if (heatmapInstance && newWidth > 0 && newHeight > 0) {
          heatmapInstance.resize(newWidth, newHeight);
          const scrollInfo = heatmapInstance.getScrollInfo();
          scrollEnabled = scrollInfo?.needsScroll ?? false;
        }
      }
    });

    resizeObserver.observe(containerRef);

    return () => {
      resizeObserver.disconnect();
    };
  });

  // Handle scroll events
  $effect(() => {
    if (!scrollWrapperRef) return;

    function handleScroll() {
      updateScrollState();
      // Dismiss tooltip when scrolling (cell may scroll out of view)
      heatmapInstance?.hideTooltip();
    }

    updateScrollState();
    scrollWrapperRef.addEventListener('scroll', handleScroll);

    return () => {
      scrollWrapperRef?.removeEventListener('scroll', handleScroll);
    };
  });

  // Update scroll state when scrollEnabled changes
  $effect(() => {
    if (scrollEnabled) {
      updateScrollState();
    } else {
      scrollState = { atStart: true, atEnd: false };
    }
  });
</script>

<div class="flex flex-col w-full">
  {#if !hasData}
    <div class="flex items-center justify-center min-h-[400px] text-red-600 flex-col gap-2">
      <span>No data available</span>
      <span class="text-xs text-gray-500">
        Run the data pipeline to generate JSON files
      </span>
    </div>
  {:else}
    {#if showControls && showYearFilter}
      <div class="w-full mb-4 px-4">
        <YearRangeFilter
          min={minYear}
          max={maxYear}
          start={yearRangeStart}
          end={yearRangeEnd}
          onChange={handleYearRangeChange}
          dataYears={data.years}
        />
      </div>
    {/if}

    <div class="relative">
      <!-- Scrolling container - also serves as tooltip container -->
      <div
        bind:this={scrollWrapperRef}
        class="relative w-full min-h-[400px] border border-border rounded overflow-hidden"
        class:border-none={noBorder}
        class:rounded-none={noBorder}
        style:height="{height}px"
        style:overflow-x={scrollEnabled ? 'auto' : 'hidden'}
        onpointerleave={handleContainerPointerLeave}
        onpointerdown={handleContainerPointerDown}
      >
        <!-- D3 will render SVG and tooltip into this container -->
        <div bind:this={containerRef} class="w-full h-full"></div>
      </div>

      <!-- Left scroll indicator -->
      <div
        class="absolute bottom-0 left-0 h-7 w-[90px] pointer-events-none flex items-center text-[11px] font-medium text-text-muted transition-opacity duration-200 z-10 bg-gradient-to-r from-bg to-transparent pl-2.5 dark:from-bg"
        style:opacity={scrollEnabled && !scrollState.atStart ? 1 : 0}
      >
        ← more left
      </div>

      <!-- Right scroll indicator -->
      <div
        class="absolute bottom-0 right-0 h-7 w-[110px] pointer-events-none flex items-center justify-end text-[11px] font-medium text-text-muted transition-opacity duration-200 z-10 bg-gradient-to-l from-bg to-transparent pr-2.5 dark:from-bg"
        style:opacity={scrollEnabled && !scrollState.atEnd ? 1 : 0}
      >
        more right →
      </div>
    </div>

    {#if showControls && showLegend}
      <div class="w-full mt-4 px-4">
        <ColorLegend
          colorScale={effectiveData.colorScale}
          width={containerWidth - 32}
          metric={effectiveData.metric}
          {hoveredValue}
        />
      </div>
    {/if}
  {/if}
</div>
