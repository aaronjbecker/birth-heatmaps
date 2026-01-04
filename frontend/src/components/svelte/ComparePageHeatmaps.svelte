<script lang="ts">
  /**
   * Compare page heatmaps wrapper that reads from nanostores.
   * This component bridges React (ComparePageClient) and Svelte (CompareHeatmapStack).
   *
   * Nanostores implement the Svelte store contract, so we can use them directly
   * with Svelte's $ syntax.
   */
  import {
    loadedDataStore,
    scaleModeStore,
    selectedCountriesStore,
    loadingStore,
    errorStore
  } from '../../lib/stores/heatmap-stores';
  import type { CountryHeatmapData } from '../../lib/types';
  import CompareHeatmapStack from './CompareHeatmapStack.svelte';

  // Nanostores work directly with Svelte's $ syntax
  // Read current values reactively
  let loadedData = $state<Record<string, CountryHeatmapData>>({});
  let selectedCountries = $state<string[]>([]);
  let scaleMode = $state<'unified' | 'per-country'>('unified');
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Subscribe to nanostores
  $effect(() => {
    const unsubs = [
      loadedDataStore.subscribe(v => loadedData = v),
      selectedCountriesStore.subscribe(v => selectedCountries = v),
      scaleModeStore.subscribe(v => scaleMode = v),
      loadingStore.subscribe(v => loading = v),
      errorStore.subscribe(v => error = v),
    ];
    return () => unsubs.forEach(unsub => unsub());
  });

  // Get ordered list of loaded country data (preserving selection order)
  const orderedCountryData = $derived.by(() => {
    return selectedCountries
      .map(code => loadedData[code])
      .filter((d): d is CountryHeatmapData => d !== undefined);
  });
</script>

{#if loading}
  <div class="flex items-center justify-center px-6 py-12 bg-bg-alt rounded border border-border">
    <span class="text-sm text-text-muted">Loading heatmap data...</span>
  </div>
{:else if error}
  <div class="flex flex-col items-center justify-center px-6 py-12 bg-bg-alt rounded border border-border">
    <span class="text-sm text-red-500">{error}</span>
  </div>
{:else}
  <CompareHeatmapStack
    countries={orderedCountryData}
    {scaleMode}
  />
{/if}
