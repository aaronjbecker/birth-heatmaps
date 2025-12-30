/**
 * Centralized configuration for all metrics in the application.
 * Adding a new metric requires:
 * 1. Add entry here
 * 2. Add property to CountryMeta type in types.ts
 * 3. Generate data via the pipeline
 */

export const METRICS = {
  fertility: {
    slug: 'fertility',
    label: 'Fertility',
    subtitle: 'Daily Fertility Rate (births per 100k women age 15-44)',
  },
  seasonality: {
    slug: 'seasonality',
    label: 'Seasonality',
    subtitle: 'Percentage of Annual Births by Month (normalized)',
  },
} as const;

export type MetricSlug = keyof typeof METRICS;

export const METRIC_SLUGS = Object.keys(METRICS) as MetricSlug[];

export type MetricConfig = (typeof METRICS)[MetricSlug];
