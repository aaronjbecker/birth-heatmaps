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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    width: '100%',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'var(--color-bg-alt)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '32px',
    flexWrap: 'wrap',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  controlLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricTabs: {
    display: 'flex',
    gap: '4px',
    padding: '2px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
  },
  metricTab: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  metricTabActive: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
  },
  shareRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '8px',
    borderTop: '1px solid var(--color-border)',
  },
};

const tabStyles = `
  .metric-tab:hover:not(.active) {
    background-color: var(--color-bg-alt);
    color: var(--color-text);
  }
`;

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
    <div style={styles.container}>
      <style>{tabStyles}</style>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlsRow}>
          {/* Country selector */}
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Countries</label>
            <CountryMultiSelect
              countries={countries}
              selected={selectedCountries}
              onChange={handleCountriesChange}
            />
          </div>

          {/* Metric tabs */}
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Metric</label>
            <div style={styles.metricTabs}>
              {METRIC_SLUGS.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  className={`metric-tab ${metric === slug ? 'active' : ''}`}
                  style={{
                    ...styles.metricTab,
                    ...(metric === slug ? styles.metricTabActive : {}),
                  }}
                  onClick={() => handleMetricChange(slug)}
                >
                  {METRICS[slug].label}
                </button>
              ))}
            </div>
          </div>

          {/* Scale mode toggle */}
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Display</label>
            <ScaleModeToggle
              mode={scaleMode}
              onChange={handleScaleModeChange}
              disabled={selectedCountries.length < 2}
            />
          </div>
        </div>

        {/* Share buttons */}
        {selectedCountries.length > 0 && (
          <div style={styles.shareRow}>
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
