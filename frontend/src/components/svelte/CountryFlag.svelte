<script lang="ts">
  /**
   * Country flag component for Svelte.
   * Displays a country's flag with lazy loading.
   */

  interface Props {
    /** Flag URL (pre-resolved via getFlagUrl) */
    url: string | null;
    /** Additional CSS classes */
    class?: string;
  }

  const { url, class: className = '' }: Props = $props();
</script>

{#if url}
  <img
    src={url}
    width={20}
    height={15}
    alt=""
    loading="lazy"
    decoding="async"
    class="inline-block align-middle {className}"
  />
{/if}
