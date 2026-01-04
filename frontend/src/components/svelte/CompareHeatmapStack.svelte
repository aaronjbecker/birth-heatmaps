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
  <div class="flex flex-col items-center justify-center px-6 py-12 bg-bg-alt rounded-lg border border-dashed border-border text-center mt-4 dark:bg-bg-alt dark:border-border">
    <h3 class="text-lg font-semibold text-text m-0 mb-2 dark:text-text">No countries selected</h3>
    <p class="text-sm text-text-muted m-0 dark:text-text-muted">
      Select two or more countries above to compare their birth patterns.
    </p>
  </div>
{:else}
  <div class="flex flex-col gap-4 w-full mt-4">
    <!-- Year range filter at top -->
    <div class="px-3 py-2 bg-bg-alt border border-border rounded-lg dark:bg-bg-alt dark:border-border">
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

      <div class="flex flex-col gap-0 border border-border rounded-lg overflow-hidden bg-bg-alt dark:bg-bg-alt dark:border-border">
        <!-- Country header -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-bg-alt border-b border-border dark:bg-bg-alt dark:border-border">
          <h3 class="text-lg font-semibold text-text m-0 dark:text-text">{country.country.name}</h3>
          <span class="text-[0.8125rem] text-text-muted dark:text-text-muted">
            {Math.min(...country.years)}–{Math.max(...country.years)}
          </span>
        </div>

        <!-- Heatmap -->
        <div class="bg-bg-alt dark:bg-bg-alt">
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
        <div class="px-4 py-2.5 bg-bg-alt border-t border-border dark:bg-bg-alt dark:border-border">
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
