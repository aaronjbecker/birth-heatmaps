<script lang="ts">
  /**
   * Multi-select state dropdown for the Compare feature.
   * Adapted from CountryMultiSelect.svelte for US state selection.
   */
  import type { StateMeta } from '../../lib/types';

  interface Props {
    states: StateMeta[];
    selected: string[];
    onChange: (selected: string[]) => void;
    maxDisplay?: number;
  }

  const { states, selected, onChange, maxDisplay = 5 }: Props = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');
  let containerRef = $state<HTMLDivElement | null>(null);
  let searchInputRef = $state<HTMLInputElement | null>(null);

  // Filter states by search query
  const filteredStates = $derived.by(() => {
    if (!searchQuery.trim()) return states;
    const query = searchQuery.toLowerCase();
    return states.filter((s) => s.name.toLowerCase().includes(query));
  });

  // Get selected state objects
  const selectedStates = $derived.by(() => {
    return selected
      .map((code) => states.find((s) => s.code === code))
      .filter((s): s is StateMeta => s !== undefined);
  });

  // Visible chips and remaining count
  const visibleChips = $derived(selectedStates.slice(0, maxDisplay));
  const remainingCount = $derived(selectedStates.length - maxDisplay);

  // Handle click outside to close
  $effect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        isOpen = false;
        searchQuery = '';
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

  function handleToggle() {
    if (isOpen) {
      searchQuery = '';
    }
    isOpen = !isOpen;
  }

  function handleSelect(code: string) {
    if (selected.includes(code)) {
      onChange(selected.filter((s) => s !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  function handleRemove(code: string, e: MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== code));
  }

  function handleClearAll() {
    // Clear only visible (filtered) states, or all if no filter
    if (searchQuery.trim()) {
      const filteredCodes = new Set(filteredStates.map((s) => s.code));
      onChange(selected.filter((s) => !filteredCodes.has(s)));
    } else {
      onChange([]);
    }
  }

  function handleSearchChange(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isOpen = false;
      searchQuery = '';
    }
  }
</script>

<div class="relative flex flex-col gap-2" bind:this={containerRef}>
  <!-- Selected states as chips -->
  {#if selectedStates.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each visibleChips as state (state.code)}
        <span class="inline-flex items-center gap-1 py-1 px-2 bg-primary text-white rounded-full text-[0.8125rem] font-medium">
          {state.name}
          <button
            type="button"
            class="state-multiselect-chip-remove inline-flex items-center justify-center w-4 h-4 p-0 border-0 bg-white/20 text-white rounded-full cursor-pointer text-[10px] leading-none hover:bg-white/40"
            onclick={(e) => handleRemove(state.code, e)}
            aria-label={`Remove ${state.name}`}
          >
            ✕
          </button>
        </span>
      {/each}
      {#if remainingCount > 0}
        <span class="inline-flex items-center py-1 px-2 bg-bg-alt border border-border rounded-full text-[0.8125rem] text-text-muted">
          +{remainingCount} more
        </span>
      {/if}
    </div>
  {/if}

  <!-- Trigger button -->
  <div class="flex items-center gap-2 flex-wrap">
    <button
      type="button"
      class="flex items-center gap-1 py-2 px-3 border border-border rounded bg-bg-alt text-text cursor-pointer text-sm font-sans leading-[1.4] hover:border-primary"
      onclick={handleToggle}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      data-testid="state-multiselect-trigger"
    >
      <span>
        {selected.length === 0
          ? 'Select states...'
          : `${selected.length} selected`}
      </span>
      <span
        class="text-[0.625rem] ml-0.5 transition-transform duration-150"
        class:rotate-180={isOpen}
        aria-hidden="true"
      >
        ▼
      </span>
    </button>
  </div>

  <!-- Dropdown -->
  {#if isOpen}
    <div
      class="absolute top-[calc(100%+4px)] left-0 min-w-[280px] max-w-[360px] max-h-[450px] bg-bg-alt border border-border rounded shadow-[0_4px_12px_var(--color-shadow)] z-[1000] overflow-hidden flex flex-col"
      role="listbox"
      aria-label="Select states"
      data-testid="state-multiselect-menu"
    >
      <div class="p-2 border-b border-border">
        <input
          bind:this={searchInputRef}
          type="text"
          class="w-full py-1.5 px-2.5 border border-border rounded text-sm bg-bg text-text font-sans outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          placeholder="Search states..."
          value={searchQuery}
          oninput={handleSearchChange}
          onkeydown={handleKeyDown}
          data-testid="state-multiselect-search"
          aria-label="Search states"
        />
      </div>

      <div class="flex gap-2 p-2 border-b border-border">
        <button
          type="button"
          class="state-multiselect-action w-full py-1.5 px-3 border border-border rounded bg-bg text-text cursor-pointer text-[0.8125rem] font-sans hover:bg-bg-alt hover:border-primary"
          onclick={handleClearAll}
        >
          Clear{searchQuery ? ' Visible' : ' All'}
        </button>
      </div>

      {#if filteredStates.length === 0}
        <div class="p-3 text-center text-text-muted text-sm">No states found</div>
      {:else}
        <ul class="flex-1 overflow-y-auto m-0 py-1 px-0 list-none">
          {#each filteredStates as state (state.code)}
            {@const isSelected = selected.includes(state.code)}
            <li
              class="state-multiselect-option flex items-center gap-2 py-2 px-3 cursor-pointer text-sm text-text bg-transparent transition-colors duration-100 hover:bg-bg"
              onclick={() => handleSelect(state.code)}
              role="option"
              aria-selected={isSelected}
              data-testid={`state-option-${state.code}`}
            >
              <input
                type="checkbox"
                class="w-4 h-4 cursor-pointer accent-primary"
                checked={isSelected}
                onchange={() => handleSelect(state.code)}
                onclick={(e) => e.stopPropagation()}
              />
              <span>{state.name}</span>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="py-1.5 px-3 border-t border-border text-xs text-text-muted text-center">
        {selected.length} of {states.length} states selected
      </div>
    </div>
  {/if}
</div>
