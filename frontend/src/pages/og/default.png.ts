/**
 * Default Open Graph image endpoint.
 * Uses US fertility data as the default heatmap visualization.
 *
 * Route: /og/default.png
 */
import type { APIRoute } from 'astro';
import type { CountryHeatmapData } from '../../lib/types';
import { renderHeatmapToPNG } from '../../lib/og-heatmap';

// Load US fertility data at build time
import usDataImport from '../../assets/data/fertility/united-states-of-america.json';
const usData = usDataImport as CountryHeatmapData;

export const GET: APIRoute = async () => {
  const pngBuffer = renderHeatmapToPNG(usData);

  return new Response(pngBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
