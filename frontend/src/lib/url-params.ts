/**
 * URL query parameter utilities for the Compare Countries feature.
 *
 * These functions handle:
 * - Parsing URL search params to CompareQueryParams
 * - Serializing CompareQueryParams to URL query strings
 * - Building shareable compare URLs
 */

import type { CompareQueryParams, ScaleMode } from './types';
import type { MetricSlug } from './metrics';
import { METRIC_SLUGS } from './metrics';

/**
 * Parse compare page query parameters from URL.
 * Provides sensible defaults for missing or invalid values.
 */
export function parseCompareParams(searchParams: URLSearchParams): CompareQueryParams {
  // Parse countries (comma-separated list)
  const countriesParam = searchParams.get('countries') || '';
  const countries = countriesParam
    ? countriesParam.split(',').map(c => c.trim()).filter(Boolean)
    : [];

  // Parse metric with validation
  const metricParam = searchParams.get('metric') || 'fertility';
  const metric: MetricSlug = METRIC_SLUGS.includes(metricParam as MetricSlug)
    ? (metricParam as MetricSlug)
    : 'fertility';

  // Parse scale mode with validation
  const scaleParam = searchParams.get('scale') || 'unified';
  const scale: ScaleMode = scaleParam === 'per-country' ? 'per-country' : 'unified';

  // Parse optional year range
  const yearStartParam = searchParams.get('yearStart');
  const yearEndParam = searchParams.get('yearEnd');

  const yearStart = yearStartParam ? parseInt(yearStartParam, 10) : undefined;
  const yearEnd = yearEndParam ? parseInt(yearEndParam, 10) : undefined;

  return {
    countries,
    metric,
    scale,
    yearStart: yearStart && !isNaN(yearStart) ? yearStart : undefined,
    yearEnd: yearEnd && !isNaN(yearEnd) ? yearEnd : undefined,
  };
}

/**
 * Serialize compare parameters to URL query string.
 * Only includes non-default values to keep URLs clean.
 */
export function serializeCompareParams(params: CompareQueryParams): string {
  const searchParams = new URLSearchParams();

  // Always include countries if any are selected
  if (params.countries.length > 0) {
    searchParams.set('countries', params.countries.join(','));
  }

  // Only include metric if not the default
  if (params.metric !== 'fertility') {
    searchParams.set('metric', params.metric);
  }

  // Only include scale if not the default
  if (params.scale !== 'unified') {
    searchParams.set('scale', params.scale);
  }

  // Include year range if specified
  if (params.yearStart !== undefined) {
    searchParams.set('yearStart', params.yearStart.toString());
  }
  if (params.yearEnd !== undefined) {
    searchParams.set('yearEnd', params.yearEnd.toString());
  }

  return searchParams.toString();
}

/**
 * Build full compare URL with query parameters.
 */
export function buildCompareUrl(params: CompareQueryParams): string {
  const queryString = serializeCompareParams(params);
  return queryString ? `/compare?${queryString}` : '/compare';
}

/**
 * Update browser URL without triggering navigation.
 * Uses replaceState to avoid polluting browser history.
 */
export function updateBrowserUrl(params: CompareQueryParams): void {
  const url = buildCompareUrl(params);
  window.history.replaceState({}, '', url);
}

/**
 * Get the current full URL for sharing.
 */
export function getCurrentShareUrl(): string {
  return window.location.href;
}

/**
 * Copy text to clipboard with fallback for older browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Generate Twitter/X share URL.
 */
export function getTwitterShareUrl(url: string, text: string): string {
  const params = new URLSearchParams({
    url,
    text,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Generate Facebook share URL.
 */
export function getFacebookShareUrl(url: string): string {
  const params = new URLSearchParams({
    u: url,
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Generate LinkedIn share URL.
 */
export function getLinkedInShareUrl(url: string): string {
  const params = new URLSearchParams({
    url,
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Generate Reddit share URL.
 */
export function getRedditShareUrl(url: string, title: string): string {
  const params = new URLSearchParams({
    url,
    title,
  });
  return `https://www.reddit.com/submit?${params.toString()}`;
}
