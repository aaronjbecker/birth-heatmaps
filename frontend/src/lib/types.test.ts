/**
 * Tests for TypeScript type definitions.
 *
 * These tests verify that the type interfaces match
 * the expected JSON structure from the data pipeline.
 */
import { describe, it, expect } from 'vitest';
import type {
  CountryMeta,
  CountriesIndex,
  HeatmapCell,
  ColorScaleConfig,
  CountryHeatmapData,
} from './types';

describe('Type definitions', () => {
  describe('CountryMeta', () => {
    it('should match expected structure', () => {
      const country: CountryMeta = {
        code: 'france',
        name: 'France',
        sources: ['HMD'],
        fertility: { yearRange: [1946, 2023], hasData: true },
        seasonality: { yearRange: [1946, 2023], hasData: true },
      };

      expect(country.code).toBe('france');
      expect(country.fertility.yearRange).toHaveLength(2);
    });
  });

  describe('CountriesIndex', () => {
    it('should match expected structure', () => {
      const index: CountriesIndex = {
        countries: [
          {
            code: 'france',
            name: 'France',
            sources: ['HMD'],
            fertility: { yearRange: [1946, 2023], hasData: true },
            seasonality: { yearRange: [1946, 2023], hasData: true },
          },
        ],
        dataSources: {
          HMD: { name: 'Human Mortality Database', url: 'https://www.mortality.org/' },
        },
        generatedAt: '2024-01-01T00:00:00Z',
      };

      expect(index.countries).toHaveLength(1);
      expect(index.dataSources.HMD.name).toBe('Human Mortality Database');
    });
  });

  describe('HeatmapCell', () => {
    it('should allow null values', () => {
      const cell: HeatmapCell = {
        year: 2020,
        month: 1,
        value: null,
        births: null,
        population: null,
        source: 'HMD',
      };

      expect(cell.value).toBeNull();
    });

    it('should allow numeric values', () => {
      const cell: HeatmapCell = {
        year: 2020,
        month: 1,
        value: 7.85,
        births: 62000,
        population: 8500000,
        source: 'HMD',
      };

      expect(cell.value).toBe(7.85);
    });
  });

  describe('ColorScaleConfig', () => {
    it('should support sequential type', () => {
      const config: ColorScaleConfig = {
        type: 'sequential',
        domain: [5.0, 12.0],
        scheme: 'turbo',
      };

      expect(config.type).toBe('sequential');
      expect(config.domain).toHaveLength(2);
    });

    it('should support diverging type', () => {
      const config: ColorScaleConfig = {
        type: 'diverging',
        domain: [0.065, 0.0833, 0.10],
        scheme: 'RdBu',
      };

      expect(config.type).toBe('diverging');
      expect(config.domain).toHaveLength(3);
    });
  });

  describe('CountryHeatmapData', () => {
    it('should match expected structure', () => {
      const data: CountryHeatmapData = {
        country: { code: 'france', name: 'France' },
        metric: 'daily_fertility_rate',
        title: 'Daily Births Per 100k Women',
        colorScale: { type: 'sequential', domain: [5, 12], scheme: 'turbo' },
        years: [2020, 2021],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        data: [
          { year: 2020, month: 1, value: 7.85, source: 'HMD' },
        ],
        sources: ['HMD'],
        generatedAt: '2024-01-01T00:00:00Z',
      };

      expect(data.country.code).toBe('france');
      expect(data.months).toHaveLength(12);
    });
  });
});
