/**
 * Chart configuration for country visualization pages.
 *
 * Charts are organized by country in subdirectories:
 * src/content/charts/{country-slug}/
 *   - fertility_heatmap.png
 *   - seasonality_heatmap.png
 *   - monthly_fertility_chart.png
 *   - monthly_fertility_boxplot.png
 *   - population_chart.png
 *   - births_chart.png
 *   - daily_fertility_rate_chart.png
 *
 * These are automatically copied from data-pipeline/output/charts/ when you run:
 *   python data-pipeline/scripts/run_pipeline.py --charts
 *
 * Charts are imported using import.meta.glob() for Vite optimization.
 * See CHART_LOADING.md for detailed documentation.
 */

/**
 * Chart types available for each country.
 * Matches CHART_FILENAMES from the Python chart_exporter.
 */
export const CHART_TYPES = [
  'fertility_heatmap',
  'seasonality_heatmap',
  'monthly_fertility_chart',
  'monthly_fertility_boxplot',
  'population_chart',
  'births_chart',
  'daily_fertility_rate_chart',
] as const;

export type ChartType = typeof CHART_TYPES[number];

/**
 * Chart metadata with labels and descriptions for display.
 */
export const CHART_METADATA: Record<ChartType, { label: string; description: string }> = {
  fertility_heatmap: {
    label: 'Fertility Heatmap',
    description: 'Daily births per 100k women age 15-44 by month and year',
  },
  seasonality_heatmap: {
    label: 'Seasonality Heatmap',
    description: 'Birth seasonality as percentage of annual births normalized to 30-day months',
  },
  monthly_fertility_chart: {
    label: 'Monthly Fertility Trends',
    description: 'Daily fertility rate by month showing which months have highest and lowest birth rates',
  },
  monthly_fertility_boxplot: {
    label: 'Monthly Fertility Distribution',
    description: 'Distribution of monthly fertility rates relative to the trailing 12-month average',
  },
  population_chart: {
    label: 'Childbearing Population',
    description: 'Women age 15-44 over time',
  },
  births_chart: {
    label: 'Total Monthly Births',
    description: 'Total monthly birth counts over time',
  },
  daily_fertility_rate_chart: {
    label: 'Daily Fertility Rate',
    description: 'Daily births per 100k women age 15-44 over time',
  },
};

/**
 * Helper to get chart filename from chart type.
 */
export function getChartFilename(chartType: ChartType): string {
  return `${chartType}.png`;
}

/**
 * Helper to build the path to a country's chart.
 * Returns a path relative to the content/charts directory.
 */
export function getChartPath(countrySlug: string, chartType: ChartType): string {
  return `${countrySlug}/${getChartFilename(chartType)}`;
}

// Note: We're not defining a content collection schema for images
// because we import them directly using Astro's Image component
// with dynamic imports. The charts directory is used as static assets.
