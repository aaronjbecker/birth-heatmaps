/**
 * Tests for color scale utilities
 */
import { describe, it, expect } from 'vitest';
import {
  createColorScale,
  getColor,
  calculateDomain,
  generateLegendTicks,
  formatValue,
} from './color-scales';
import type { ColorScaleConfig } from './types';

describe('Color scale utilities', () => {
  describe('createColorScale', () => {
    it('should create a sequential scale', () => {
      const config: ColorScaleConfig = {
        type: 'sequential',
        domain: [0, 100],
        scheme: 'turbo',
      };

      const scale = createColorScale(config);
      expect(scale).toBeDefined();

      // Test that scale returns colors
      const color = scale(50);
      expect(color).toMatch(/^rgb/);
    });

    it('should create a diverging scale', () => {
      const config: ColorScaleConfig = {
        type: 'diverging',
        domain: [0, 50, 100],
        scheme: 'RdBu',
      };

      const scale = createColorScale(config);
      expect(scale).toBeDefined();

      const color = scale(50);
      expect(color).toMatch(/^rgb/);
    });

    it('should fall back to turbo for unknown scheme', () => {
      const config: ColorScaleConfig = {
        type: 'sequential',
        domain: [0, 100],
        scheme: 'nonexistent',
      };

      const scale = createColorScale(config);
      expect(scale).toBeDefined();
    });
  });

  describe('getColor', () => {
    it('should return gray for null values', () => {
      const config: ColorScaleConfig = {
        type: 'sequential',
        domain: [0, 100],
        scheme: 'turbo',
      };
      const scale = createColorScale(config);

      const color = getColor(scale, null);
      expect(color).toBe('#e0e0e0');
    });

    it('should return scale color for valid values', () => {
      const config: ColorScaleConfig = {
        type: 'sequential',
        domain: [0, 100],
        scheme: 'turbo',
      };
      const scale = createColorScale(config);

      const color = getColor(scale, 50);
      expect(color).toMatch(/^rgb/);
    });
  });

  describe('calculateDomain', () => {
    it('should calculate sequential domain using absolute min/max', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const domain = calculateDomain(values, 'sequential');

      expect(domain).toHaveLength(2);
      expect(domain[0]).toBe(1);
      expect(domain[1]).toBe(10);
    });

    it('should calculate diverging domain using absolute min/max', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const domain = calculateDomain(values, 'diverging');

      expect(domain).toHaveLength(3);
      expect(domain[0]).toBe(1);
      expect(domain[1]).toBe(5.5); // midpoint
      expect(domain[2]).toBe(10);
    });

    it('should use absolute min/max even with outliers', () => {
      // Test that outliers are NOT excluded (unlike old percentile-based approach)
      const values = [1.5, 2.0, 2.5, 3.0, 100.0];
      const domain = calculateDomain(values, 'sequential');

      expect(domain).toHaveLength(2);
      expect(domain[0]).toBe(1.5); // Absolute min, not percentile
      expect(domain[1]).toBe(100.0); // Absolute max, not percentile
    });

    it('should apply floor of 1e-6 for log-scale compatibility', () => {
      const values = [0.0, 0.1, 0.5, 1.0];
      const domain = calculateDomain(values, 'sequential');

      expect(domain).toHaveLength(2);
      expect(domain[0]).toBe(1e-6); // Floor applied instead of 0.0
      expect(domain[1]).toBe(1.0);
    });

    it('should apply floor to near-zero positive values', () => {
      const values = [1e-8, 0.5, 1.0];
      const domain = calculateDomain(values, 'sequential');

      expect(domain).toHaveLength(2);
      expect(domain[0]).toBe(1e-6); // Floor applied instead of 1e-8
      expect(domain[1]).toBe(1.0);
    });

    it('should not apply floor when min is above 1e-6', () => {
      const values = [0.001, 0.5, 1.0];
      const domain = calculateDomain(values, 'sequential');

      expect(domain).toHaveLength(2);
      expect(domain[0]).toBe(0.001); // No floor needed
      expect(domain[1]).toBe(1.0);
    });

    it('should filter out null values', () => {
      const values: (number | null)[] = [null, 1, null, 5, null, 10, null];
      const domain = calculateDomain(values, 'sequential');

      expect(domain[0]).toBe(1);
      expect(domain[1]).toBe(10);
    });

    it('should return default domain for empty array', () => {
      const domain = calculateDomain([], 'sequential');
      expect(domain).toEqual([0, 1]);
    });

    it('should return default diverging domain for empty array', () => {
      const domain = calculateDomain([], 'diverging');
      expect(domain).toEqual([0, 0.5, 1]);
    });

    it('should return default domain for all-null array', () => {
      const values: (number | null)[] = [null, null, null];
      const domain = calculateDomain(values, 'sequential');
      expect(domain).toEqual([0, 1]);
    });
  });

  describe('generateLegendTicks', () => {
    it('should generate correct number of ticks', () => {
      const domain = [0, 100];
      const ticks = generateLegendTicks(domain, 5);

      expect(ticks).toHaveLength(5);
      expect(ticks[0]).toBe(0);
      expect(ticks[4]).toBe(100);
    });

    it('should handle diverging domain', () => {
      const domain = [0, 50, 100];
      const ticks = generateLegendTicks(domain, 3);

      expect(ticks).toHaveLength(3);
      expect(ticks[0]).toBe(0);
      expect(ticks[1]).toBe(50);
      expect(ticks[2]).toBe(100);
    });
  });

  describe('formatValue', () => {
    it('should format fertility values with 2 decimals', () => {
      expect(formatValue(7.856, 'daily_fertility_rate')).toBe('7.86');
      expect(formatValue(10.1, 'fertility')).toBe('10.10');
    });

    it('should format seasonality ratio with 3 decimals', () => {
      expect(formatValue(0.0833, 'seasonality_ratio')).toBe('0.083');
    });

    it('should format percentage values', () => {
      expect(formatValue(0.0833, 'seasonality_pct')).toBe('8.3%');
    });

    it('should return "No data" for null', () => {
      expect(formatValue(null, 'daily_fertility_rate')).toBe('No data');
    });

    it('should use exponential notation for very small numbers', () => {
      const result = formatValue(0.001, 'other');
      expect(result).toBe('1.00e-3');
    });

    it('should use locale string for large numbers', () => {
      const result = formatValue(1234567, 'other');
      expect(result).toBe('1,234,567');
    });
  });
});
