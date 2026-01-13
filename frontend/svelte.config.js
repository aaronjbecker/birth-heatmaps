/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  compilerOptions: {
    // Suppress slot_element_deprecated warning since Astro's Svelte integration
    // requires slots to pass content from .astro files to Svelte components.
    // This is the intended pattern for Astro-Svelte interop.
    warningFilter: (warning) => {
      if (warning.code === 'slot_element_deprecated') {
        return false;
      }
      return true;
    },
  },
};
