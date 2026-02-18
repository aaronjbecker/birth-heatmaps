/**
 * State flag utilities for US state flag display.
 * Imports all state flag PNGs at build time and provides lookup functions.
 */

// Import all state flag PNGs at build time with Vite
const flagModules = import.meta.glob<{ default: string }>(
  '../assets/state-flags/*.png',
  { eager: true, query: '?url', import: 'default' }
);

// Build lookup from state slug to resolved URL
const STATE_FLAG_URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(flagModules)) {
  const slug = path.split('/').pop()?.replace('.png', '');
  if (slug && typeof url === 'string') {
    STATE_FLAG_URLS[slug] = url;
  }
}

/**
 * Get the flag URL for a state slug.
 * Returns null if no flag is available.
 */
export function getStateFlagUrl(slug: string): string | null {
  return STATE_FLAG_URLS[slug] ?? null;
}

/**
 * Get flag URLs for multiple state slugs.
 * Returns a record mapping slug to URL (or null if not found).
 */
export function getStateFlagUrls(slugs: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const slug of slugs) {
    result[slug] = getStateFlagUrl(slug);
  }
  return result;
}

export { STATE_FLAG_URLS };
