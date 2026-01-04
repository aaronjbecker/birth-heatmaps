/**
 * Client-side component for the Compare Countries page.
 * Handles state management, URL sync, and data loading.
 *
 * This component writes to nanostores which are read by the Svelte
 * ComparePageHeatmaps component for rendering the heatmaps.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import type { CountryMeta, CountryHeatmapData, ScaleMode } from '../lib/types';
import type { MetricSlug } from '../lib/metrics';
import { METRICS, METRIC_SLUGS } from '../lib/metrics';
import { loadMultipleCountries } from '../lib/compare-data';
import { parseCompareParams, updateBrowserUrl, buildCompareUrl } from '../lib/url-params';
import { CountryMultiSelect } from './CountryMultiSelect';
import { ScaleModeToggle } from './ScaleModeToggle';
import { CompareShareButtons } from './CompareShareButtons';
import {
  loadedDataStore,
  scaleModeStore,
  selectedCountriesStore,
  loadingStore,
  errorStore,
} from '../lib/stores/heatmap-stores';

export interface ComparePageClientProps {
  countries: CountryMeta[];
}

export function ComparePageClient({
  countries,
}: ComparePageClientProps): React.ReactElement {
  // Read from nanostores (for local component state that syncs to stores)
  const selectedCountries = useStore(selectedCountriesStore);
  const scaleMode = useStore(scaleModeStore);
  const loading = useStore(loadingStore);
  const error = useStore(errorStore);

  // Local state for metric (not needed in Svelte side)
  const [metric, setMetric] = useState<MetricSlug>('fertility');

  // Parse URL on mount
  useEffect(() => {
    const params = parseCompareParams(new URLSearchParams(window.location.search));
    if (params.countries.length > 0) {
      selectedCountriesStore.set(params.countries);
    }
    setMetric(params.metric);
    scaleModeStore.set(params.scale);
  }, []);

  // Update URL when state changes
  useEffect(() => {
    const params = {
      countries: selectedCountries,
      metric,
      scale: scaleMode,
    };
    updateBrowserUrl(params);
  }, [selectedCountries, metric, scaleMode]);

  // Load data when selected countries or metric changes
  useEffect(() => {
    if (selectedCountries.length === 0) {
      loadedDataStore.set({});
      return;
    }

    let cancelled = false;

    async function loadData() {
      loadingStore.set(true);
      errorStore.set(null);

      try {
        const data = await loadMultipleCountries(selectedCountries, metric);

        if (!cancelled) {
          // Convert Map to Record for nanostore
          const dataRecord: Record<string, CountryHeatmapData> = {};
          data.forEach((value, key) => {
            dataRecord[key] = value;
          });
          loadedDataStore.set(dataRecord);

          if (data.size < selectedCountries.length) {
            const failed = selectedCountries.filter((c) => !data.has(c));
            console.warn('Failed to load some countries:', failed);
          }
        }
      } catch (err) {
        if (!cancelled) {
          errorStore.set(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) {
          loadingStore.set(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedCountries, metric]);

  // Handlers
  const handleCountriesChange = useCallback((codes: string[]) => {
    selectedCountriesStore.set(codes);
  }, []);

  const handleMetricChange = useCallback((newMetric: MetricSlug) => {
    setMetric(newMetric);
  }, []);

  const handleScaleModeChange = useCallback((mode: ScaleMode) => {
    scaleModeStore.set(mode);
  }, []);

  // Current share URL
  const shareUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return base + buildCompareUrl({ countries: selectedCountries, metric, scale: scaleMode });
  }, [selectedCountries, metric, scaleMode]);

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Controls */}
      <div className="flex flex-col gap-4 p-4 bg-bg-alt rounded-lg border border-border">
        <div className="flex items-start gap-8 flex-wrap">
          {/* Country selector */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.8125rem] font-medium text-text-muted uppercase tracking-wider">Countries</label>
            <CountryMultiSelect
              countries={countries}
              selected={selectedCountries}
              onChange={handleCountriesChange}
            />
          </div>

          {/* Metric tabs */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.8125rem] font-medium text-text-muted uppercase tracking-wider">Metric</label>
            <div className="flex gap-1 p-0.5 bg-bg rounded-md border border-border">
              {METRIC_SLUGS.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  className={`py-1.5 px-3 border-0 rounded bg-transparent text-text-muted cursor-pointer text-sm font-sans font-medium transition-all duration-150 hover:bg-bg-alt hover:text-text ${
                    metric === slug ? 'bg-primary text-white hover:bg-primary hover:text-white' : ''
                  }`}
                  onClick={() => handleMetricChange(slug)}
                >
                  {METRICS[slug].label}
                </button>
              ))}
            </div>
          </div>

          {/* Scale mode toggle */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.8125rem] font-medium text-text-muted uppercase tracking-wider">Display</label>
            <ScaleModeToggle
              mode={scaleMode}
              onChange={handleScaleModeChange}
              disabled={selectedCountries.length < 2}
            />
          </div>
        </div>

        {/* Share buttons */}
        {selectedCountries.length > 0 && (
          <div className="flex justify-end pt-2 border-t border-border">
            <CompareShareButtons url={shareUrl} />
          </div>
        )}
      </div>

      {/* Heatmaps are rendered by a separate Svelte component (ComparePageHeatmaps)
          that reads from nanostores. This component only renders the controls. */}
    </div>
  );
}

export default ComparePageClient;
