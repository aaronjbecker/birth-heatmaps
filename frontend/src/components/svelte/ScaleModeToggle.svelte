<script lang="ts">
  /**
   * Toggle component for switching between unified and per-country color scales.
   * Svelte 5 port of ScaleModeToggle.tsx
   */
  import type { ScaleMode } from '../../lib/types';

  interface Props {
    mode: ScaleMode;
    onChange: (mode: ScaleMode) => void;
    disabled?: boolean;
  }

  const { mode, onChange, disabled = false }: Props = $props();
</script>

<div class="flex items-center gap-2 text-sm text-text-muted">
  <span>Color scale:</span>
  <div class="inline-flex items-center gap-1 p-0.5 bg-bg border border-border rounded-md" data-testid="scale-mode-toggle">
    <button
      type="button"
      class="px-3 py-1.5 border-none rounded cursor-pointer text-[0.8125rem] font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      class:bg-primary={mode === 'unified'}
      class:text-white={mode === 'unified'}
      class:hover:bg-primary={mode === 'unified'}
      class:hover:text-white={mode === 'unified'}
      class:bg-transparent={mode !== 'unified'}
      class:text-text-muted={mode !== 'unified'}
      class:hover:bg-bg-alt={mode !== 'unified'}
      class:hover:text-text={mode !== 'unified'}
      onclick={() => onChange('unified')}
      {disabled}
      aria-pressed={mode === 'unified'}
      data-testid="scale-mode-unified"
    >
      Unified
    </button>
    <button
      type="button"
      class="px-3 py-1.5 border-none rounded cursor-pointer text-[0.8125rem] font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      class:bg-primary={mode === 'per-country'}
      class:text-white={mode === 'per-country'}
      class:hover:bg-primary={mode === 'per-country'}
      class:hover:text-white={mode === 'per-country'}
      class:bg-transparent={mode !== 'per-country'}
      class:text-text-muted={mode !== 'per-country'}
      class:hover:bg-bg-alt={mode !== 'per-country'}
      class:hover:text-text={mode !== 'per-country'}
      onclick={() => onChange('per-country')}
      {disabled}
      aria-pressed={mode === 'per-country'}
      data-testid="scale-mode-per-country"
    >
      Per-Country
    </button>
  </div>
</div>
