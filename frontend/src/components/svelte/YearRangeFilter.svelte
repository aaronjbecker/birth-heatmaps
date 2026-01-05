<script lang="ts">
  /**
   * Year range filter component with dual range slider
   * Replaces YearRangeFilter.tsx with Svelte 5 runes
   */
  import { calculateTickMarks, analyzeDataZones } from '../../lib/year-range-utils';
  interface Props {
    min: number;
    max: number;
    start?: number;
    end?: number;
    onChange: (start: number, end: number) => void;
    dataYears?: number[];
  }

  const {
    min,
    max,
    start: initialStart,
    end: initialEnd,
    onChange,
    dataYears,
  }: Props = $props();

  // Determine effective range based on data availability
  const effectiveMin = $derived.by(() => {
    if (!dataYears || dataYears.length === 0) return min;
    const dMin = Math.min(...dataYears);
    return Math.max(min, dMin);
  });

  const effectiveMax = $derived.by(() => {
    if (!dataYears || dataYears.length === 0) return max;
    const dMax = Math.max(...dataYears);
    return Math.min(max, dMax);
  });

  // State for range values - initialize with defaults, then sync via effect
  let start = $state(0);
  let end = $state(0);

  // Local state for numeric inputs to allow intermediate typing states
  let startInput = $state('');
  let endInput = $state('');
  let isInteractingWithStart = $state(false);
  let isInteractingWithEnd = $state(false);

  let containerRef: HTMLDivElement | null = $state(null);

  // Initialize state when props change
  $effect(() => {
    const newStart = Math.max(effectiveMin, Math.min(effectiveMax, initialStart ?? effectiveMin));
    const newEnd = Math.max(effectiveMin, Math.min(effectiveMax, initialEnd ?? effectiveMax));
    start = newStart;
    end = newEnd;
    if (!isInteractingWithStart) {
      startInput = newStart.toString();
    }
    if (!isInteractingWithEnd) {
      endInput = newEnd.toString();
    }
  });

  // Sync inputs when start/end changes (e.g. from slider)
  $effect(() => {
    if (!isInteractingWithStart) {
      startInput = start.toString();
    }
  });

  $effect(() => {
    if (!isInteractingWithEnd) {
      endInput = end.toString();
    }
  });

  // Derived values
  const totalRange = $derived(effectiveMax - effectiveMin || 1);
  const rangePercent = $derived({
    left: ((start - effectiveMin) / totalRange) * 100,
    right: ((effectiveMax - end) / totalRange) * 100,
  });
  const isReset = $derived(start === effectiveMin && end === effectiveMax);
  const tickMarks = $derived(calculateTickMarks(effectiveMin, effectiveMax));
  const dataZones = $derived(analyzeDataZones(effectiveMin, effectiveMax, dataYears));

  // Handlers
  function handleStartSliderChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    if (!isNaN(value) && value >= effectiveMin && value < end) {
      start = value;
      onChange(value, end);
    }
  }

  function handleEndSliderChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    if (!isNaN(value) && value > start && value <= effectiveMax) {
      end = value;
      onChange(start, value);
    }
  }

  function handleStartInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const rawValue = target.value;
    // Only allow digits
    const sanitizedValue = rawValue.replace(/\D/g, '');
    startInput = sanitizedValue;

    if (sanitizedValue === '') return;

    const value = parseInt(sanitizedValue, 10);
    if (!isNaN(value) && value >= effectiveMin && value < end) {
      start = value;
      onChange(value, end);
    }
  }

  function handleEndInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const rawValue = target.value;
    // Only allow digits
    const sanitizedValue = rawValue.replace(/\D/g, '');
    endInput = sanitizedValue;

    if (sanitizedValue === '') return;

    const value = parseInt(sanitizedValue, 10);
    if (!isNaN(value) && value > start && value <= effectiveMax) {
      end = value;
      onChange(start, value);
    }
  }

  function handleStartFocus() {
    isInteractingWithStart = true;
  }

  function handleStartBlur() {
    isInteractingWithStart = false;
    startInput = start.toString();
  }

  function handleEndFocus() {
    isInteractingWithEnd = true;
  }

  function handleEndBlur() {
    isInteractingWithEnd = false;
    endInput = end.toString();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleTrackInteraction(clientX: number) {
    if (!containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const clickedYear = Math.round(effectiveMin + percentage * (effectiveMax - effectiveMin));

    const distToStart = Math.abs(clickedYear - start);
    const distToEnd = Math.abs(clickedYear - end);

    if (distToStart <= distToEnd) {
      const newStart = Math.min(clickedYear, end - 1);
      start = newStart;
      onChange(newStart, end);
    } else {
      const newEnd = Math.max(clickedYear, start + 1);
      end = newEnd;
      onChange(start, newEnd);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    handleTrackInteraction(e.clientX);
  }

  function handleTouchStart(e: TouchEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.touches[0]) {
      handleTrackInteraction(e.touches[0].clientX);
    }
  }

  function handleReset() {
    start = effectiveMin;
    end = effectiveMax;
    onChange(effectiveMin, effectiveMax);
  }
</script>

<div class="flex flex-col gap-1 p-0">
  <div class="flex justify-between items-center text-sm">
    <div class="flex items-center gap-3">
      <span class="text-text-muted font-medium uppercase text-[0.8125rem] tracking-wider">Year Range</span>
      <div class="flex items-center gap-1">
        <input
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-[70px] px-1.5 py-1.5 text-sm border border-border rounded bg-bg text-text font-semibold text-center appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={startInput}
          oninput={handleStartInputChange}
          onfocus={handleStartFocus}
          onblur={handleStartBlur}
          onkeydown={handleKeyDown}
          data-testid="year-input-start"
          aria-label="Start year"
        />
        <span class="px-2 text-text-muted font-medium">–</span>
        <input
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-[70px] px-1.5 py-1.5 text-sm border border-border rounded bg-bg text-text font-semibold text-center appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={endInput}
          oninput={handleEndInputChange}
          onfocus={handleEndFocus}
          onblur={handleEndBlur}
          onkeydown={handleKeyDown}
          data-testid="year-input-end"
          aria-label="End year"
        />
      </div>
    </div>
    <div class="min-h-8 flex items-center">
      {#if !isReset}
        <button
          class="px-3 py-1.5 text-xs border border-border rounded bg-bg text-text-muted cursor-pointer hover:border-primary hover:text-text"
          onclick={handleReset}
          type="button"
          data-testid="year-range-reset"
        >
          Reset
        </button>
      {/if}
    </div>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={containerRef}
    class="relative h-7 mb-3 cursor-pointer"
    onmousedown={handleMouseDown}
    ontouchstart={handleTouchStart}
    data-testid="year-range-container"
    role="group"
    aria-label="Year range slider"
  >
    <!-- Multi-zone track showing data availability -->
    {#each dataZones as zone, index}
      {@const zoneStart = ((zone.start - effectiveMin) / totalRange) * 100}
      {@const zoneEnd = ((zone.end - effectiveMin) / totalRange) * 100}
      {@const zoneWidth = Math.max(zoneEnd - zoneStart, zone.hasData ? 0.5 : 0)}
      {@const isInSelection = zone.end >= start && zone.start <= end}
      {@const opacity = isInSelection ? 0.4 : 0.2}
      <div
        class="absolute top-3 h-1"
        class:bg-primary={zone.hasData}
        class:bg-border={!zone.hasData}
        style:left="{zoneStart}%"
        style:width="{zoneWidth}%"
        style:opacity={opacity}
        style:border-radius={index === 0 ? '2px 0 0 2px' : index === dataZones.length - 1 ? '0 2px 2px 0' : '0'}
        data-testid="zone-{index}"
        data-has-data={zone.hasData}
      ></div>
    {/each}

    <div
      class="absolute top-3 h-1 bg-primary rounded-sm opacity-60"
      style:left="{rangePercent.left}%"
      style:right="{rangePercent.right}%"
    ></div>

    <!-- Tick marks -->
    <div class="absolute top-4 left-0 right-0 h-3 pointer-events-none" data-testid="year-range-ticks">
      {#each tickMarks as year}
        {@const position = ((year - effectiveMin) / totalRange) * 100}
        <div class="absolute w-px h-2 bg-text-muted opacity-40" style:left="{position}%" data-year={year}></div>
      {/each}
    </div>

    <input
      type="range"
      class="year-range-slider absolute top-0 w-full h-7 appearance-none bg-transparent pointer-events-none z-[2]"
      min={effectiveMin}
      max={effectiveMax}
      value={start}
      oninput={handleStartSliderChange}
      data-testid="year-range-start"
    />
    <input
      type="range"
      class="year-range-slider absolute top-0 w-full h-7 appearance-none bg-transparent pointer-events-none z-[1]"
      min={effectiveMin}
      max={effectiveMax}
      value={end}
      oninput={handleEndSliderChange}
      data-testid="year-range-end"
    />
  </div>

  <!-- Edge labels -->
  <div class="flex justify-between text-xs text-text-muted -mt-1">
    <span data-testid="year-range-min-label">{effectiveMin}</span>
    <span data-testid="year-range-max-label">{effectiveMax}</span>
  </div>
</div>
