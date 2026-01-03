<script lang="ts">
  /**
   * Stack of heatmaps for comparing multiple countries.
   * Displays heatmaps vertically with shared year range and optional unified color scale.
   * Svelte 5 port of CompareHeatmapStack.tsx
   */
  import type { CountryHeatmapData, ColorScaleConfig, ScaleMode } from '../../lib/types';
  import Heatmap from './Heatmap.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import YearRangeFilter from './YearRangeFilter.svelte';
  import {
    computeCommonYearRange,
    computeUnifiedColorScale,
    createAlignedCountryData,
  } from '../../lib/compare-data';

  interface Props {
    countries: CountryHeatmapData[];
    scaleMode: ScaleMode;
    height?: number;
  }

  const { countries, scaleMode, height = 400 }: Props = $props();

  // State - initialize with defaults
  let yearRangeStart = $state(1900);
  let yearRangeEnd = $state(2024);
  let hoveredValue = $state<number | null>(null);
  let hoveredCountryCode = $state<string | null>(null);

  // Derived values
  const commonYearRange = $derived(computeCommonYearRange(countries));

  const unifiedColorScale = $derived.by(() => {
    if (scaleMode !== 'unified' || countries.length === 0) return null;
    return computeUnifiedColorScale(countries, commonYearRange);
  });

  const dataYears = $derived.by(() => {
    const years: number[] = [];
    for (let y = commonYearRange[0]; y <= commonYearRange[1]; y++) {
      years.push(y);
    }
    return years;
  });

  // Sync year range when common range changes
  $effect(() => {
    yearRangeStart = commonYearRange[0];
    yearRangeEnd = commonYearRange[1];
  });

  // Handle year range change from filter
  function handleYearRangeChange(start: number, end: number) {
    yearRangeStart = start;
    yearRangeEnd = end;
  }

  // Handle hover from any heatmap
  function handleHeatmapHover(countryCode: string, value: number | null) {
    hoveredValue = value;
    hoveredCountryCode = value !== null ? countryCode : null;
  }

  // Get the effective color scale for a country
  function getColorScaleForCountry(country: CountryHeatmapData): ColorScaleConfig | undefined {
    if (scaleMode === 'unified' && unifiedColorScale) {
      return unifiedColorScale;
    }
    return undefined; // Use country's own scale
  }

  // Get aligned data for a country
  function getAlignedData(country: CountryHeatmapData): CountryHeatmapData {
    return createAlignedCountryData(
      country,
      [yearRangeStart, yearRangeEnd],
      getColorScaleForCountry(country)
    );
  }

  // Get legend hovered value for a country
  function getLegendHoveredValue(country: CountryHeatmapData): number | null {
    if (scaleMode === 'unified') {
      return hoveredValue;
    }
    return hoveredCountryCode === country.country.code ? hoveredValue : null;
  }
</script>

{#if countries.length === 0}
  <div class="empty-state">
    <h3 class="empty-title">No countries selected</h3>
    <p class="empty-text">
      Select two or more countries above to compare their birth patterns.
    </p>
  </div>
{:else}
  <div class="container">
    <!-- Year range filter at top -->
    <div class="year-filter-container">
      <YearRangeFilter
        min={commonYearRange[0]}
        max={commonYearRange[1]}
        start={yearRangeStart}
        end={yearRangeEnd}
        onChange={handleYearRangeChange}
        {dataYears}
      />
    </div>

    <!-- Country heatmaps with individual legends -->
    {#each countries as country (country.country.code)}
      {@const alignedData = getAlignedData(country)}
      {@const legendColorScale = getColorScaleForCountry(country) || country.colorScale}
      {@const legendHoveredValue = getLegendHoveredValue(country)}

      <div class="country-section">
        <!-- Country header -->
        <div class="country-header">
          <h3 class="country-name">{country.country.name}</h3>
          <span class="country-meta">
            {Math.min(...country.years)}–{Math.max(...country.years)}
          </span>
        </div>

        <!-- Heatmap -->
        <div class="heatmap-wrapper">
          <Heatmap
            data={alignedData}
            {height}
            showLegend={false}
            showYearFilter={false}
            showControls={true}
            colorScaleOverride={getColorScaleForCountry(country)}
            onCellHover={(value) => handleHeatmapHover(country.country.code, value)}
            noBorder={true}
          />
        </div>

        <!-- Color legend below heatmap -->
        <div class="legend-container">
          <ColorLegend
            colorScale={legendColorScale}
            metric={country.metric}
            hoveredValue={legendHoveredValue}
          />
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    margin-top: 16px;
  }

  .year-filter-container {
    padding-inline: 12px;
    padding-block: 8px;
    background-color: var(--color-bg-alt);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }

  .country-section {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--color-bg-alt);
  }

  .country-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background-color: var(--color-bg-alt);
    border-bottom: 1px solid var(--color-border);
  }

  .country-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .country-meta {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  .heatmap-wrapper {
    background-color: var(--color-bg-alt);
  }

  .legend-container {
    padding: 10px 16px;
    background-color: var(--color-bg-alt);
    border-top: 1px solid var(--color-border);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    background-color: var(--color-bg-alt);
    border-radius: 8px;
    border: 1px dashed var(--color-border);
    text-align: center;
    margin-top: 16px;
  }

  .empty-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 8px 0;
  }

  .empty-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
