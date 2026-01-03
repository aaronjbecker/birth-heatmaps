<script lang="ts" module>
  /**
   * Calculate tick mark positions based on year range
   * Uses 5-year intervals for short ranges (≤ 30 years), 10-year intervals for longer ranges
   */
  export function calculateTickMarks(min: number, max: number): number[] {
    const range = max - min;
    const interval = range <= 30 ? 5 : 10;
    const ticks: number[] = [];

    for (let year = Math.ceil(min / interval) * interval; year <= max; year += interval) {
      ticks.push(year);
    }

    return ticks;
  }

  interface DataZone {
    start: number;
    end: number;
    hasData: boolean;
  }

  /**
   * Analyze data availability to create zones for dual-color track
   * Returns array of zones indicating continuous ranges of data presence/absence
   */
  export function analyzeDataZones(
    min: number,
    max: number,
    dataYears?: number[]
  ): DataZone[] {
    if (!dataYears || dataYears.length === 0) {
      return [{ start: min, end: max, hasData: false }];
    }

    const zones: DataZone[] = [];
    const sortedDataYears = [...dataYears].sort((a, b) => a - b);

    let currentYear = min;

    for (let i = 0; i < sortedDataYears.length; i++) {
      const dataYear = sortedDataYears[i];

      // Skip years outside our range
      if (dataYear < min) continue;
      if (dataYear > max) break;

      // If there's a gap before this data year, create a no-data zone
      if (dataYear > currentYear) {
        zones.push({
          start: currentYear,
          end: dataYear - 1,
          hasData: false,
        });
      }

      // Find the end of this continuous data range
      let rangeEnd = dataYear;
      while (
        i + 1 < sortedDataYears.length &&
        sortedDataYears[i + 1] === rangeEnd + 1 &&
        sortedDataYears[i + 1] <= max
      ) {
        i++;
        rangeEnd = sortedDataYears[i];
      }

      // Create data zone
      zones.push({
        start: dataYear,
        end: rangeEnd,
        hasData: true,
      });

      currentYear = rangeEnd + 1;
    }

    // If there's a gap at the end, create final no-data zone
    if (currentYear <= max) {
      zones.push({
        start: currentYear,
        end: max,
        hasData: false,
      });
    }

    return zones;
  }
</script>

<script lang="ts">
  /**
   * Year range filter component with dual range slider
   * Replaces YearRangeFilter.tsx with Svelte 5 runes
   */
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

<div class="container">
  <div class="header">
    <div class="label-group">
      <span class="label">Year Range</span>
      <div class="input-group">
        <input
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="year-input"
          value={startInput}
          oninput={handleStartInputChange}
          onfocus={handleStartFocus}
          onblur={handleStartBlur}
          onkeydown={handleKeyDown}
          data-testid="year-input-start"
          aria-label="Start year"
        />
        <span class="input-separator">–</span>
        <input
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="year-input"
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
    <div class="reset-container">
      {#if !isReset}
        <button
          class="reset-button"
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
    class="slider-container"
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
        class="zone"
        class:zone-data={zone.hasData}
        class:zone-no-data={!zone.hasData}
        style:left="{zoneStart}%"
        style:width="{zoneWidth}%"
        style:opacity={opacity}
        style:border-radius={index === 0 ? '2px 0 0 2px' : index === dataZones.length - 1 ? '0 2px 2px 0' : '0'}
        data-testid="zone-{index}"
        data-has-data={zone.hasData}
      ></div>
    {/each}

    <div
      class="slider-range"
      style:left="{rangePercent.left}%"
      style:right="{rangePercent.right}%"
    ></div>

    <!-- Tick marks -->
    <div class="ticks-container" data-testid="year-range-ticks">
      {#each tickMarks as year}
        {@const position = ((year - effectiveMin) / totalRange) * 100}
        <div class="tick-mark" style:left="{position}%" data-year={year}></div>
      {/each}
    </div>

    <input
      type="range"
      class="year-range-slider start-slider"
      min={effectiveMin}
      max={effectiveMax}
      value={start}
      oninput={handleStartSliderChange}
      data-testid="year-range-start"
    />
    <input
      type="range"
      class="year-range-slider end-slider"
      min={effectiveMin}
      max={effectiveMax}
      value={end}
      oninput={handleEndSliderChange}
      data-testid="year-range-end"
    />
  </div>

  <!-- Edge labels -->
  <div class="edge-labels">
    <span data-testid="year-range-min-label">{effectiveMin}</span>
    <span data-testid="year-range-max-label">{effectiveMax}</span>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    height: 24px;
  }

  .label-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label {
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .input-group {
    display: flex;
    align-items: center;
    margin-left: 8px;
  }

  .year-input {
    width: 60px;
    padding: 2px 4px;
    font-size: 13px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg-alt);
    color: var(--color-text);
    font-weight: 600;
    text-align: center;
    appearance: none;
    -moz-appearance: textfield;
  }

  .year-input::-webkit-inner-spin-button,
  .year-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .input-separator {
    padding: 0 4px;
    color: var(--color-text-muted);
  }

  .reset-container {
    min-height: 24px;
    display: flex;
    align-items: center;
  }

  .reset-button {
    padding: 4px 8px;
    font-size: 11px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background-color: var(--color-bg-alt);
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .slider-container {
    position: relative;
    height: 24px;
    margin-bottom: 18px;
    cursor: pointer;
  }

  .zone {
    position: absolute;
    top: 10px;
    height: 4px;
  }

  .zone-data {
    background-color: var(--color-primary);
  }

  .zone-no-data {
    background-color: var(--color-border);
  }

  .slider-range {
    position: absolute;
    top: 10px;
    height: 4px;
    background-color: var(--color-primary);
    border-radius: 2px;
    opacity: 0.6;
  }

  .ticks-container {
    position: absolute;
    top: 14px;
    left: 0;
    right: 0;
    height: 12px;
    pointer-events: none;
  }

  .tick-mark {
    position: absolute;
    width: 1px;
    height: 8px;
    background-color: var(--color-text-muted);
    opacity: 0.4;
  }

  .year-range-slider {
    position: absolute;
    top: 0;
    width: 100%;
    height: 24px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    pointer-events: none;
  }

  .start-slider {
    z-index: 2;
  }

  .end-slider {
    z-index: 1;
  }

  .year-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    pointer-events: all;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-alt);
    box-shadow: 0 1px 3px var(--color-shadow);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .year-range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .year-range-slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  .year-range-slider::-moz-range-thumb {
    pointer-events: all;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-alt);
    box-shadow: 0 1px 3px var(--color-shadow);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .year-range-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }

  .year-range-slider:focus {
    outline: none;
  }

  .year-range-slider:focus::-moz-range-thumb {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  .edge-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: -6px;
  }
</style>
