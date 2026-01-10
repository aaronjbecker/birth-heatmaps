<script lang="ts">
  /**
   * State dropdown navigation component with search filtering.
   * Adapted from CountryDropdown.svelte for US state navigation.
   */
  import type { StateMeta } from '../../lib/types';
  import type { MetricSlug } from '../../lib/metrics';

  interface Props {
    states: StateMeta[];
    currentState?: string;
    metric?: MetricSlug;
    variant?: 'header' | 'inline';
  }

  const { states, currentState, metric = 'fertility', variant = 'header' }: Props = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');
  let highlightedIndex = $state(-1);
  let containerRef = $state<HTMLDivElement | null>(null);
  let searchInputRef = $state<HTMLInputElement | null>(null);
  let listRef = $state<HTMLUListElement | null>(null);

  // Filter states by search query
  const filteredStates = $derived.by(() => {
    if (!searchQuery.trim()) return states;
    const query = searchQuery.toLowerCase();
    return states.filter((s) => s.name.toLowerCase().includes(query));
  });

  // Get current state name for display
  const currentStateName = $derived.by(() => {
    if (!currentState) return null;
    const state = states.find((s) => s.code === currentState);
    return state?.name ?? currentState;
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
    // Access filteredStates.length to track changes
    filteredStates.length;
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
    window.location.href = `/${metric}/states/${code}`;
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
        if (highlightedIndex < filteredStates.length - 1) {
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
        if (highlightedIndex >= 0 && filteredStates[highlightedIndex]) {
          handleSelect(filteredStates[highlightedIndex].code);
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
    data-testid="state-dropdown-trigger"
  >
    <span>{currentStateName ?? 'Go to state...'}</span>
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
      aria-label="Select a state"
      data-testid="state-dropdown-menu"
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
          data-testid="state-dropdown-search"
          aria-label="Search states"
        />
      </div>

      {#if filteredStates.length === 0}
        <div class="p-3 text-center text-text-muted text-sm">No states found</div>
      {:else}
        <ul class="flex-1 overflow-y-auto m-0 py-1 px-0 list-none" bind:this={listRef}>
          {#each filteredStates as state, index (state.code)}
            {@const isCurrent = state.code === currentState}
            {@const isHighlighted = index === highlightedIndex}
            <li
              class="py-2 px-3 cursor-pointer text-sm text-text bg-transparent transition-colors duration-100 hover:bg-bg {isHighlighted
                ? 'bg-bg'
                : ''} {isCurrent ? 'font-semibold text-primary' : ''}"
              onclick={() => handleSelect(state.code)}
              onmouseenter={() => (highlightedIndex = index)}
              role="option"
              aria-selected={isCurrent}
              data-testid="state-option-{state.code}"
            >
              {state.name}
              {#if isCurrent}
                {' (current)'}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      <div class="py-1.5 px-3 border-t border-border text-xs text-text-muted text-center">
        {filteredStates.length === states.length
          ? `${states.length} states`
          : `${filteredStates.length} of ${states.length} states`}
      </div>
    </div>
  {/if}
</div>
