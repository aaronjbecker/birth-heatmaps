<script lang="ts">
  /**
   * Compare Line Chart orchestrator.
   * Shows a main metric chart with optional expandable births/population sections.
   * Includes year range filter and granularity toggle.
   */
  import type { CountryHeatmapData, LineGranularity } from '../../lib/types';
  import type { MetricSlug } from '../../lib/metrics';
  import type { TimeSeriesPoint } from '../../lib/compare-line-data';
  import {
    extractAnnualAverages,
    extractAnnualBirths,
    extractAnnualPopulation,
    extractMonthlyValues,
    extractMonthlyBirths,
    extractMonthlyPopulation,
    hasRawCounts,
  } from '../../lib/compare-line-data';
  import { computeCommonYearRange } from '../../lib/compare-data';
  import { formatValue } from '../../lib/color-scales';
  import { getCountryColor } from '../../lib/compare-colors';
  import YearRangeFilter from './YearRangeFilter.svelte';
  import CompareLineChartInner from './CompareLineChartInner.svelte';

  interface Props {
    countries: CountryHeatmapData[];
    colorMap: Map<string, string>;
    metric: MetricSlug;
    granularity: LineGranularity;
    onGranularityChange: (g: LineGranularity) => void;
  }

  const { countries, colorMap, metric, granularity, onGranularityChange }: Props = $props();

  // Year range state
  const commonYearRange = $derived(computeCommonYearRange(countries));
  let yearRangeStart = $state(1900);
  let yearRangeEnd = $state(2024);

  // Sync year range when common range changes
  $effect(() => {
    yearRangeStart = commonYearRange[0];
    yearRangeEnd = commonYearRange[1];
  });

  const dataYears = $derived.by(() => {
    const years: number[] = [];
    for (let y = commonYearRange[0]; y <= commonYearRange[1]; y++) {
      years.push(y);
    }
    return years;
  });

  function handleYearRangeChange(start: number, end: number) {
    yearRangeStart = start;
    yearRangeEnd = end;
  }

  // Determine Y-axis label based on metric
  const yLabel = $derived.by(() => {
    if (metric === 'fertility') return 'Daily Fertility Rate';
    if (metric === 'seasonality') return 'Seasonality Ratio';
    if (metric === 'conception') return 'Daily Conceptions Rate';
    return 'Value';
  });

  // Extract metric series for main chart
  function extractMetricExtractor(): (data: CountryHeatmapData) => TimeSeriesPoint[] {
    return granularity === 'monthly' ? extractMonthlyValues : extractAnnualAverages;
  }

  const metricSeries = $derived.by(() => {
    const extractor = extractMetricExtractor();
    return countries.map(c => ({
      code: c.country.code,
      name: c.country.name,
      data: extractor(c),
    }));
  });

  // Extract births series
  const birthsSeries = $derived.by(() => {
    const extractor = granularity === 'monthly' ? extractMonthlyBirths : extractAnnualBirths;
    return countries.map(c => ({
      code: c.country.code,
      name: c.country.name,
      data: extractor(c),
    }));
  });

  // Extract population series
  const populationSeries = $derived.by(() => {
    const extractor = granularity === 'monthly' ? extractMonthlyPopulation : extractAnnualPopulation;
    return countries.map(c => ({
      code: c.country.code,
      name: c.country.name,
      data: extractor(c),
    }));
  });

  // Whether raw counts are available (hidden for seasonality)
  const showRawCounts = $derived(
    metric !== 'seasonality' && countries.length > 0 && countries.some(c => hasRawCounts(c))
  );

  // Format value for tooltip based on metric
  function metricFormatter(v: number): string {
    return formatValue(v, metric);
  }

  function birthsFormatter(v: number): string {
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function populationFormatter(v: number): string {
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
</script>

{#if countries.length === 0}
  <div class="flex flex-col items-center justify-center px-6 py-12 bg-bg-alt rounded-lg border border-dashed border-border text-center mt-4">
    <h3 class="text-lg font-semibold text-text m-0 mb-2">No countries selected</h3>
    <p class="text-sm text-text-muted m-0">
      Select two or more countries above to compare their birth patterns.
    </p>
  </div>
{:else}
  <div class="flex flex-col gap-3 w-full mt-4">
    <!-- Year range filter -->
    <div class="px-3 py-1.5 bg-bg-alt border border-border rounded-lg">
      <YearRangeFilter
        min={commonYearRange[0]}
        max={commonYearRange[1]}
        start={yearRangeStart}
        end={yearRangeEnd}
        onChange={handleYearRangeChange}
        {dataYears}
      />
    </div>

    <!-- Granularity toggle -->
    <div class="flex items-center gap-3 px-1">
      <span class="text-sm text-text-muted">Granularity:</span>
      <div class="inline-flex items-center gap-1 p-0.5 bg-bg border border-border rounded-md">
        <button
          type="button"
          class="px-3 py-1 border-none rounded cursor-pointer text-[0.8125rem] font-medium transition-all duration-150"
          class:bg-primary={granularity === 'annual'}
          class:text-white={granularity === 'annual'}
          class:bg-transparent={granularity !== 'annual'}
          class:text-text-muted={granularity !== 'annual'}
          class:hover:bg-bg-alt={granularity !== 'annual'}
          class:hover:text-text={granularity !== 'annual'}
          onclick={() => onGranularityChange('annual')}
          aria-pressed={granularity === 'annual'}
        >
          Annual
        </button>
        <button
          type="button"
          class="px-3 py-1 border-none rounded cursor-pointer text-[0.8125rem] font-medium transition-all duration-150"
          class:bg-primary={granularity === 'monthly'}
          class:text-white={granularity === 'monthly'}
          class:bg-transparent={granularity !== 'monthly'}
          class:text-text-muted={granularity !== 'monthly'}
          class:hover:bg-bg-alt={granularity !== 'monthly'}
          class:hover:text-text={granularity !== 'monthly'}
          onclick={() => onGranularityChange('monthly')}
          aria-pressed={granularity === 'monthly'}
        >
          Monthly
        </button>
      </div>
    </div>

    <!-- Color-coded legend -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
      {#each countries as country (country.country.code)}
        <div class="flex items-center gap-1.5">
          <span
            class="inline-block w-3 h-0.5 rounded-full flex-shrink-0"
            style="background-color: {getCountryColor(colorMap, country.country.code)};"
          ></span>
          <span class="text-sm text-text">{country.country.name}</span>
        </div>
      {/each}
    </div>

    <!-- Main metric chart -->
    <div class="bg-bg-alt border border-border rounded-lg p-3">
      <h3 class="text-base font-semibold text-text m-0 mb-2">{yLabel}</h3>
      <CompareLineChartInner
        series={metricSeries}
        {colorMap}
        yLabel={yLabel}
        yearRange={[yearRangeStart, yearRangeEnd]}
        formatValue={metricFormatter}
      />
    </div>

    <!-- Expandable births section -->
    {#if showRawCounts}
      <details class="bg-bg-alt border border-border rounded-lg">
        <summary class="px-3 py-2.5 cursor-pointer text-base font-semibold text-text select-none hover:bg-bg transition-colors rounded-lg">
          Births
        </summary>
        <div class="px-3 pb-3">
          <CompareLineChartInner
            series={birthsSeries}
            {colorMap}
            yLabel="Annual Births"
            yearRange={[yearRangeStart, yearRangeEnd]}
            formatValue={birthsFormatter}
          />
        </div>
      </details>

      <details class="bg-bg-alt border border-border rounded-lg">
        <summary class="px-3 py-2.5 cursor-pointer text-base font-semibold text-text select-none hover:bg-bg transition-colors rounded-lg">
          Childbearing Population
        </summary>
        <div class="px-3 pb-3">
          <CompareLineChartInner
            series={populationSeries}
            {colorMap}
            yLabel="Women Age 15-44"
            yearRange={[yearRangeStart, yearRangeEnd]}
            formatValue={populationFormatter}
          />
        </div>
      </details>
    {/if}
  </div>
{/if}
