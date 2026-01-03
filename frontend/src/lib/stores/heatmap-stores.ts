/**
 * Nanostores for cross-framework state management (React ↔ Svelte)
 */
import { atom, map } from 'nanostores';
import type { CountryHeatmapData, ScaleMode, ColorScaleConfig, HeatmapCell } from '../types';

// =====================================
// Year Range State
// =====================================

/** User-selected year range filter (null = use full range) */
export const yearRangeStore = atom<[number, number] | null>(null);

/** Common year range across all selected countries in Compare view */
export const commonYearRangeStore = atom<[number, number]>([1900, 2024]);

// =====================================
// Compare View State
// =====================================

/** Scale mode: unified across countries or per-country */
export const scaleModeStore = atom<ScaleMode>('unified');

/** Unified color scale computed from all selected countries */
export const unifiedColorScaleStore = atom<ColorScaleConfig | null>(null);

/** Selected country codes for Compare view */
export const selectedCountriesStore = atom<string[]>([]);

/** Loaded country data cache (code -> data) */
export const loadedDataStore = map<Record<string, CountryHeatmapData>>({});

// =====================================
// Hover Synchronization
// =====================================

/** Currently hovered cell value (for synchronized legend indicator) */
export const hoveredValueStore = atom<number | null>(null);

/** Country code of the heatmap being hovered (for multi-heatmap views) */
export const hoveredCountryCodeStore = atom<string | null>(null);

/** Full hovered cell data (for tooltip) */
export const hoveredCellStore = atom<HeatmapCell | null>(null);

/** Reference element for tooltip positioning */
export const hoveredElementStore = atom<SVGRectElement | null>(null);

// =====================================
// Loading State
// =====================================

/** Whether data is currently being loaded */
export const loadingStore = atom<boolean>(false);

/** Error message if loading failed */
export const errorStore = atom<string | null>(null);
