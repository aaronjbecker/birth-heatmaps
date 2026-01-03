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
  <div class="loading-container">
    <span class="loading-text">Loading heatmap data...</span>
  </div>
{:else if error}
  <div class="error-container">
    <span class="error-text">{error}</span>
  </div>
{:else}
  <CompareHeatmapStack
    countries={orderedCountryData}
    {scaleMode}
  />
{/if}

<style>
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    background-color: var(--color-bg-alt);
    border-radius: 4px;
    border: 1px solid var(--color-border);
  }

  .loading-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    background-color: var(--color-bg-alt);
    border-radius: 4px;
    border: 1px solid var(--color-border);
  }

  .error-text {
    font-size: 0.875rem;
    color: var(--color-error, #ef4444);
  }
</style>
