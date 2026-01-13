<script lang="ts">
  /**
   * Client-side component for the Compare Countries & States page.
   * Handles state management, URL sync, data loading, and rendering.
   *
   * Svelte 5 port that consolidates ComparePageClient.tsx and ComparePageHeatmaps.svelte
   * into a single component, eliminating the need for nanostores.
   */
  import type { CountryMeta, StateMeta, CountryHeatmapData, ScaleMode } from '../../lib/types';
  import type { MetricSlug } from '../../lib/metrics';
  import { METRICS, METRIC_SLUGS } from '../../lib/metrics';
  import { loadMultipleCountries, loadMultipleStates } from '../../lib/compare-data';
  import { parseCompareParams, updateBrowserUrl, buildCompareUrl } from '../../lib/url-params';
  import CountryMultiSelect from './CountryMultiSelect.svelte';
  import StateMultiSelect from './StateMultiSelect.svelte';
  import ScaleModeToggle from './ScaleModeToggle.svelte';
  import CompareShareButtons from './CompareShareButtons.svelte';
  import CompareHeatmapStack from './CompareHeatmapStack.svelte';

  interface Props {
    countries: CountryMeta[];
    states?: StateMeta[];
  }

  const { countries, states = [] }: Props = $props();

  // Local state (replaces nanostores)
  let selectedCountries = $state<string[]>([]);
  let selectedStates = $state<string[]>([]);
  let scaleMode = $state<ScaleMode>('unified');
  let metric = $state<MetricSlug>('fertility');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let loadedCountryData = $state<Record<string, CountryHeatmapData>>({});
  let loadedStateData = $state<Record<string, CountryHeatmapData>>({});

  // Track whether we've initialized from URL
  let initialized = $state(false);

  // Combined data from countries and states (countries first, then states)
  const orderedData = $derived.by(() => {
    const countryData = selectedCountries
      .map((code) => loadedCountryData[code])
      .filter((d): d is CountryHeatmapData => d !== undefined);
    const stateData = selectedStates
      .map((code) => loadedStateData[code])
      .filter((d): d is CountryHeatmapData => d !== undefined);
    return [...countryData, ...stateData];
  });

  // Total selections
  const totalSelected = $derived(selectedCountries.length + selectedStates.length);

  // Current share URL
  const shareUrl = $derived.by(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return base + buildCompareUrl({ countries: selectedCountries, states: selectedStates, metric, scale: scaleMode });
  });

  // Parse URL on mount
  $effect(() => {
    if (typeof window === 'undefined' || initialized) return;

    const params = parseCompareParams(new URLSearchParams(window.location.search));
    if (params.countries.length > 0) {
      selectedCountries = params.countries;
    }
    if (params.states.length > 0) {
      selectedStates = params.states;
    }
    metric = params.metric;
    scaleMode = params.scale;
    initialized = true;
  });

  // Update URL when state changes (only after initialization)
  $effect(() => {
    if (!initialized || typeof window === 'undefined') return;

    // Access reactive state to track changes
    const currentCountries = selectedCountries;
    const currentStates = selectedStates;
    const currentMetric = metric;
    const currentScale = scaleMode;

    updateBrowserUrl({
      countries: currentCountries,
      states: currentStates,
      metric: currentMetric,
      scale: currentScale,
    });
  });

  // Load country data when selected countries or metric changes
  $effect(() => {
    const countriesToLoad = selectedCountries;
    const metricToLoad = metric;

    if (countriesToLoad.length === 0) {
      loadedCountryData = {};
      return;
    }

    let cancelled = false;

    async function loadData() {
      loading = true;
      error = null;

      try {
        const data = await loadMultipleCountries(countriesToLoad, metricToLoad);

        if (!cancelled) {
          const dataRecord: Record<string, CountryHeatmapData> = {};
          data.forEach((value, key) => {
            dataRecord[key] = value;
          });
          loadedCountryData = dataRecord;

          if (data.size < countriesToLoad.length) {
            const failed = countriesToLoad.filter((c) => !data.has(c));
            console.warn('Failed to load some countries:', failed);
          }
        }
      } catch (err) {
        if (!cancelled) {
          error = err instanceof Error ? err.message : 'Failed to load data';
        }
      } finally {
        if (!cancelled) {
          loading = false;
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  });

  // Load state data when selected states or metric changes
  $effect(() => {
    const statesToLoad = selectedStates;
    const metricToLoad = metric;

    if (statesToLoad.length === 0) {
      loadedStateData = {};
      return;
    }

    let cancelled = false;

    async function loadData() {
      loading = true;
      error = null;

      try {
        const data = await loadMultipleStates(statesToLoad, metricToLoad);

        if (!cancelled) {
          const dataRecord: Record<string, CountryHeatmapData> = {};
          data.forEach((value, key) => {
            dataRecord[key] = value;
          });
          loadedStateData = dataRecord;

          if (data.size < statesToLoad.length) {
            const failed = statesToLoad.filter((s) => !data.has(s));
            console.warn('Failed to load some states:', failed);
          }
        }
      } catch (err) {
        if (!cancelled) {
          error = err instanceof Error ? err.message : 'Failed to load state data';
        }
      } finally {
        if (!cancelled) {
          loading = false;
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  });

  // Handlers
  function handleCountriesChange(codes: string[]) {
    selectedCountries = codes;
  }

  function handleStatesChange(codes: string[]) {
    selectedStates = codes;
  }

  function handleMetricChange(newMetric: MetricSlug) {
    metric = newMetric;
  }

  function handleScaleModeChange(mode: ScaleMode) {
    scaleMode = mode;
  }
</script>

<div class="flex flex-col gap-0 w-full">
  <!-- Controls -->
  <div class="flex flex-col gap-4 p-3 bg-bg-alt rounded-lg border border-border">
    <div class="flex items-start gap-8 flex-wrap">
      <!-- Country selector -->
      <div class="flex flex-col gap-2.5">
        <label class="text-[0.8125rem] font-medium text-text-muted uppercase tracking-wider">Countries</label>
        <CountryMultiSelect
          {countries}
          selected={selectedCountries}
          onChange={handleCountriesChange}
        />
      </div>

      <!-- State selector -->
      {#if states.length > 0}
        <div class="flex flex-col gap-2.5">
          <label class="text-[0.8125rem] font-medium text-text-muted uppercase tracking-wider">US States</label>
          <StateMultiSelect
            {states}
            selected={selectedStates}
            onChange={handleStatesChange}
          />
        </div>
      {/if}

      <!-- Metric tabs -->
      <div class="flex flex-col gap-2.5">
        <label class="text-[0.8125rem] font-medium text-text-muted uppercase tracking-wider">Metric</label>
        <div class="flex gap-1 p-0.5 bg-bg rounded-md border border-border">
          {#each METRIC_SLUGS as slug (slug)}
            <button
              type="button"
              class="metric-tab py-1.5 px-3 border-0 rounded cursor-pointer text-sm font-sans font-medium transition-all duration-150"
              class:active={metric === slug}
              class:bg-primary={metric === slug}
              class:text-white={metric === slug}
              class:hover:bg-primary={metric === slug}
              class:hover:text-white={metric === slug}
              class:bg-transparent={metric !== slug}
              class:text-text-muted={metric !== slug}
              class:hover:bg-bg-alt={metric !== slug}
              class:hover:text-text={metric !== slug}
              onclick={() => handleMetricChange(slug)}
            >
              {METRICS[slug].label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Scale mode toggle -->
      <div class="flex flex-col gap-2.5">
        <label class="text-[0.8125rem] font-medium text-text-muted uppercase tracking-wider">Display</label>
        <ScaleModeToggle
          mode={scaleMode}
          onChange={handleScaleModeChange}
          disabled={totalSelected < 2}
        />
      </div>
    </div>

    <!-- Share buttons -->
    {#if totalSelected > 0}
      <div class="flex justify-end pt-2 border-t border-border">
        <CompareShareButtons url={shareUrl} />
      </div>
    {/if}
  </div>

  <!-- Heatmaps -->
  {#if loading}
    <div class="flex items-center justify-center px-6 py-12 bg-bg-alt rounded border border-border mt-4">
      <span class="text-sm text-text-muted">Loading heatmap data...</span>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center px-6 py-12 bg-bg-alt rounded border border-border mt-4">
      <span class="text-sm text-red-500">{error}</span>
    </div>
  {:else}
    <CompareHeatmapStack
      countries={orderedData}
      {scaleMode}
    />
  {/if}
</div>
