/**
 * Flag utilities for country flag display.
 * Imports all flag SVGs at build time and provides lookup functions.
 */
import { FLAG_CODES } from './flag-codes';

// Import all flag SVGs at build time with Vite
// The eager option loads them immediately so we can access the resolved URLs
const flagModules = import.meta.glob<{ default: string }>(
  '../assets/flags/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

// Build lookup from ISO code to resolved URL
const FLAG_URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(flagModules)) {
  const code = path.split('/').pop()?.replace('.svg', '');
  if (code && typeof url === 'string') {
    FLAG_URLS[code] = url;
  }
}

/**
 * Get the flag URL for a country slug.
 * Returns null if no flag is available.
 */
export function getFlagUrl(slug: string): string | null {
  const isoCode = FLAG_CODES[slug];
  if (!isoCode) return null;
  return FLAG_URLS[isoCode] ?? null;
}

/**
 * Get flag URLs for multiple country slugs.
 * Returns a record mapping slug to URL (or null if not found).
 */
export function getFlagUrls(slugs: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const slug of slugs) {
    result[slug] = getFlagUrl(slug);
  }
  return result;
}

/**
 * Export the raw URL lookup for direct access.
 */
export { FLAG_URLS };
