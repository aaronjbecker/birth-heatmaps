<script lang="ts">
  /**
   * Country dropdown navigation component with search filtering.
   * Svelte 5 port of CountryDropdown.tsx
   */
  import type { CountryMeta } from '../../lib/types';
  import type { MetricSlug } from '../../lib/metrics';

  interface Props {
    countries: CountryMeta[];
    currentCountry?: string;
    metric?: MetricSlug;
    variant?: 'header' | 'inline';
  }

  const { countries, currentCountry, metric = 'fertility', variant = 'header' }: Props = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');
  let highlightedIndex = $state(-1);
  let containerRef = $state<HTMLDivElement | null>(null);
  let searchInputRef = $state<HTMLInputElement | null>(null);
  let listRef = $state<HTMLUListElement | null>(null);

  // Filter countries by search query
  const filteredCountries = $derived.by(() => {
    if (!searchQuery.trim()) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(query));
  });

  // Get current country name for display
  const currentCountryName = $derived.by(() => {
    if (!currentCountry) return null;
    const country = countries.find((c) => c.code === currentCountry);
    return country?.name ?? currentCountry;
  });

  const isInline = $derived(variant === 'inline');

  // Handle click outside to close
  $effect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        isOpen = false;
        searchQuery = '';
        highlightedIndex = -1;
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  // Focus search input when dropdown opens
  $effect(() => {
    if (isOpen && searchInputRef) {
      searchInputRef.focus();
    }
  });

  // Reset highlighted index when filtered list changes
  $effect(() => {
    // Access filteredCountries.length to track changes
    filteredCountries.length;
    highlightedIndex = -1;
  });

  // Scroll highlighted option into view
  $effect(() => {
    if (highlightedIndex >= 0 && listRef) {
      const option = listRef.children[highlightedIndex] as HTMLElement;
      if (option) {
        option.scrollIntoView({ block: 'nearest' });
      }
    }
  });

  function handleToggle() {
    if (isOpen) {
      searchQuery = '';
      highlightedIndex = -1;
    }
    isOpen = !isOpen;
  }

  function handleSelect(code: string) {
    window.location.href = `/${metric}/${code}`;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        isOpen = true;
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        isOpen = false;
        searchQuery = '';
        highlightedIndex = -1;
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (highlightedIndex < filteredCountries.length - 1) {
          highlightedIndex = highlightedIndex + 1;
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (highlightedIndex > 0) {
          highlightedIndex = highlightedIndex - 1;
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
          handleSelect(filteredCountries[highlightedIndex].code);
        }
        break;
      case 'Tab':
        isOpen = false;
        searchQuery = '';
        highlightedIndex = -1;
        break;
    }
  }

  function handleSearchChange(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;
  }
</script>

<div class="relative inline-block" bind:this={containerRef}>
  <button
    type="button"
    class="flex items-center gap-1 rounded cursor-pointer font-sans {isInline
      ? 'inline-flex py-0.5 px-1.5 border border-transparent bg-transparent text-text hover:bg-bg hover:border-border'
      : 'py-1 px-2 border border-border bg-bg-alt text-text text-sm leading-[1.4] hover:border-primary'}"
    onclick={handleToggle}
    onkeydown={handleKeyDown}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    data-testid="country-dropdown-trigger"
  >
    <span>{currentCountryName ?? 'Go to country...'}</span>
    <span
      class="text-[0.625rem] ml-0.5 transition-transform duration-150"
      class:rotate-180={isOpen}
      aria-hidden="true"
    >
      ▼
    </span>
  </button>

  {#if isOpen}
    <div
      class="absolute top-[calc(100%+4px)] min-w-[250px] max-h-[400px] bg-bg-alt border border-border rounded shadow-[0_4px_12px_var(--color-shadow)] z-[1000] overflow-hidden flex flex-col {isInline
        ? 'left-0'
        : 'left-auto right-0'}"
      role="listbox"
      aria-label="Select a country"
      data-testid="country-dropdown-menu"
    >
      <div class="p-2 border-b border-border">
        <input
          bind:this={searchInputRef}
          type="text"
          class="w-full py-1.5 px-2.5 border border-border rounded text-sm bg-bg text-text font-sans outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          placeholder="Search countries..."
          value={searchQuery}
          oninput={handleSearchChange}
          onkeydown={handleKeyDown}
          data-testid="country-dropdown-search"
          aria-label="Search countries"
        />
      </div>

      {#if filteredCountries.length === 0}
        <div class="p-3 text-center text-text-muted text-sm">No countries found</div>
      {:else}
        <ul class="flex-1 overflow-y-auto m-0 py-1 px-0 list-none" bind:this={listRef}>
          {#each filteredCountries as country, index (country.code)}
            {@const isCurrent = country.code === currentCountry}
            {@const isHighlighted = index === highlightedIndex}
            <li
              class="py-2 px-3 cursor-pointer text-sm text-text bg-transparent transition-colors duration-100 hover:bg-bg {isHighlighted
                ? 'bg-bg'
                : ''} {isCurrent ? 'font-semibold text-primary' : ''}"
              onclick={() => handleSelect(country.code)}
              onkeydown={(e) => e.key === 'Enter' && handleSelect(country.code)}
              onmouseenter={() => (highlightedIndex = index)}
              role="option"
              aria-selected={isCurrent}
              tabindex="-1"
              data-testid="country-option-{country.code}"
            >
              {country.name}
              {#if isCurrent}
                {' (current)'}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      <div class="py-1.5 px-3 border-t border-border text-xs text-text-muted text-center">
        {filteredCountries.length === countries.length
          ? `${countries.length} countries`
          : `${filteredCountries.length} of ${countries.length} countries`}
      </div>
    </div>
  {/if}
</div>
