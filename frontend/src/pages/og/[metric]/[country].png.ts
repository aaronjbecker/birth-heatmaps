/**
 * Dynamic Open Graph image endpoint for metric/country pages.
 * Generates PNG heatmap images at build time.
 *
 * Route: /og/[metric]/[country].png
 * Example: /og/fertility/united-states-of-america.png
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import type { CountryHeatmapData, CountryMeta } from '../../../lib/types';
import { METRIC_SLUGS, type MetricSlug } from '../../../lib/metrics';
import { renderHeatmapToPNG } from '../../../lib/og-heatmap';

interface Props {
  heatmapData: CountryHeatmapData;
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Import countries data
  const countriesData = await import('../../../assets/data/countries.json');
  const countries = countriesData.countries as CountryMeta[];

  // Load all data files for each metric using import.meta.glob
  const fertilityFiles = import.meta.glob<CountryHeatmapData>(
    '../../../assets/data/fertility/*.json'
  );
  const seasonalityFiles = import.meta.glob<CountryHeatmapData>(
    '../../../assets/data/seasonality/*.json'
  );
  const conceptionFiles = import.meta.glob<CountryHeatmapData>(
    '../../../assets/data/conception/*.json'
  );

  const dataFilesByMetric: Record<
    MetricSlug,
    Record<string, () => Promise<CountryHeatmapData>>
  > = {
    fertility: fertilityFiles,
    seasonality: seasonalityFiles,
    conception: conceptionFiles,
  };

  // Generate paths for all metric × country combinations
  const paths = await Promise.all(
    METRIC_SLUGS.flatMap((metric) =>
      countries.map(async (country) => {
        let heatmapData: CountryHeatmapData | null = null;
        const filePath = `../../../assets/data/${metric}/${country.code}.json`;
        const metricFiles = dataFilesByMetric[metric];

        if (metricFiles[filePath]) {
          try {
            heatmapData = (await metricFiles[filePath]()) as CountryHeatmapData;
          } catch (e) {
            console.warn(
              `OG: Failed to load ${metric} data for ${country.name}:`,
              e
            );
          }
        }

        return {
          params: { metric, country: country.code },
          props: { heatmapData },
        };
      })
    )
  );

  // Filter out paths where data couldn't be loaded
  return paths.filter((p) => p.props.heatmapData !== null);
};

export const GET: APIRoute = async ({ props }) => {
  const { heatmapData } = props as Props;

  const pngBuffer = renderHeatmapToPNG(heatmapData);

  return new Response(pngBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
