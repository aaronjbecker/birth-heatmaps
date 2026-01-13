/**
 * Dynamic Open Graph image endpoint for metric/state pages.
 * Generates PNG heatmap images at build time.
 *
 * Route: /og/[metric]/states/[state].png
 * Example: /og/fertility/states/california.png
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import type { CountryHeatmapData, StateMeta, StateHeatmapData } from '../../../../lib/types';
import { METRIC_SLUGS, type MetricSlug } from '../../../../lib/metrics';
import { renderHeatmapToPNG } from '../../../../lib/og-heatmap';
import { stateToCountryFormat } from '../../../../lib/normalize-data';

interface Props {
  heatmapData: CountryHeatmapData;
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Import states data
  const statesData = await import('../../../../assets/data/states.json');
  const states = statesData.states as StateMeta[];

  // Load all state data files for each metric using import.meta.glob
  const fertilityFiles = import.meta.glob<StateHeatmapData>(
    '../../../../assets/data/fertility/states/*.json'
  );
  const seasonalityFiles = import.meta.glob<StateHeatmapData>(
    '../../../../assets/data/seasonality/states/*.json'
  );
  const conceptionFiles = import.meta.glob<StateHeatmapData>(
    '../../../../assets/data/conception/states/*.json'
  );

  const dataFilesByMetric: Record<
    MetricSlug,
    Record<string, () => Promise<StateHeatmapData>>
  > = {
    fertility: fertilityFiles,
    seasonality: seasonalityFiles,
    conception: conceptionFiles,
  };

  // Generate paths for all metric × state combinations
  const paths = await Promise.all(
    METRIC_SLUGS.flatMap((metric) =>
      states.map(async (state) => {
        let heatmapData: CountryHeatmapData | null = null;
        const filePath = `../../../../assets/data/${metric}/states/${state.code}.json`;
        const metricFiles = dataFilesByMetric[metric];

        if (metricFiles[filePath]) {
          try {
            const stateData = (await metricFiles[filePath]()) as StateHeatmapData;
            // Transform state data to country format for component compatibility
            heatmapData = stateToCountryFormat(stateData);
          } catch (e) {
            console.warn(
              `OG: Failed to load ${metric} data for state ${state.name}:`,
              e
            );
          }
        }

        return {
          params: { metric, state: state.code },
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
