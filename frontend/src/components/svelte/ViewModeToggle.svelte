<script lang="ts">
  /**
   * Three-button segmented control for switching compare page view modes.
   * Follows ScaleModeToggle.svelte styling pattern.
   */
  import type { ViewMode } from '../../lib/types';

  interface Props {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
  }

  const { mode, onChange }: Props = $props();

  const options: { value: ViewMode; label: string }[] = [
    { value: 'heatmap', label: 'Heatmaps' },
    { value: 'line', label: 'Line Chart' },
    { value: 'wide', label: 'Wide Heatmap' },
  ];
</script>

<div class="inline-flex items-center gap-1 p-0.5 bg-bg border border-border rounded-md" data-testid="view-mode-toggle">
  {#each options as opt (opt.value)}
    <button
      type="button"
      class="px-3 py-1.5 border-none rounded cursor-pointer text-[0.8125rem] font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      class:bg-primary={mode === opt.value}
      class:text-white={mode === opt.value}
      class:hover:bg-primary={mode === opt.value}
      class:hover:text-white={mode === opt.value}
      class:bg-transparent={mode !== opt.value}
      class:text-text-muted={mode !== opt.value}
      class:hover:bg-bg-alt={mode !== opt.value}
      class:hover:text-text={mode !== opt.value}
      onclick={() => onChange(opt.value)}
      aria-pressed={mode === opt.value}
      data-testid="view-mode-{opt.value}"
    >
      {opt.label}
    </button>
  {/each}
</div>
