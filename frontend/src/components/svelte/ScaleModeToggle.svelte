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

<div class="label">
  <span>Color scale:</span>
  <div class="container" data-testid="scale-mode-toggle">
    <button
      type="button"
      class="button"
      class:active={mode === 'unified'}
      onclick={() => onChange('unified')}
      {disabled}
      aria-pressed={mode === 'unified'}
      data-testid="scale-mode-unified"
    >
      Unified
    </button>
    <button
      type="button"
      class="button"
      class:active={mode === 'per-country'}
      onclick={() => onChange('per-country')}
      {disabled}
      aria-pressed={mode === 'per-country'}
      data-testid="scale-mode-per-country"
    >
      Per-Country
    </button>
  </div>
</div>

<style>
  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .container {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px;
    background-color: var(--color-bg-alt);
    border: 1px solid var(--color-border);
    border-radius: 6px;
  }

  .button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    background-color: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.8125rem;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .button:hover:not(.active):not(:disabled) {
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  .button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .button.active {
    background-color: var(--color-primary);
    color: white;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
