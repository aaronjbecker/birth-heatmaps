/**
 * Unit tests for compare-colors.ts
 */
import { describe, it, expect } from 'vitest';
import { assignCountryColors, getCountryColor } from './compare-colors';

describe('assignCountryColors', () => {
  it('assigns unique colors to each country', () => {
    const map = assignCountryColors(['usa', 'norway', 'japan']);
    expect(map.size).toBe(3);
    const colors = [...map.values()];
    expect(new Set(colors).size).toBe(3);
  });

  it('returns empty map for empty input', () => {
    const map = assignCountryColors([]);
    expect(map.size).toBe(0);
  });

  it('handles single country', () => {
    const map = assignCountryColors(['usa']);
    expect(map.size).toBe(1);
    expect(map.has('usa')).toBe(true);
  });

  it('wraps around palette for more than 10 countries', () => {
    const codes = Array.from({ length: 12 }, (_, i) => `country-${i}`);
    const map = assignCountryColors(codes);
    expect(map.size).toBe(12);
    // First and 11th should share the same color (palette wraps at 10)
    expect(map.get('country-0')).toBe(map.get('country-10'));
    expect(map.get('country-1')).toBe(map.get('country-11'));
  });

  it('assigns colors deterministically based on order', () => {
    const map1 = assignCountryColors(['usa', 'norway', 'japan']);
    const map2 = assignCountryColors(['usa', 'norway', 'japan']);
    expect(map1.get('usa')).toBe(map2.get('usa'));
    expect(map1.get('norway')).toBe(map2.get('norway'));
    expect(map1.get('japan')).toBe(map2.get('japan'));
  });

  it('different order produces different color assignments', () => {
    const map1 = assignCountryColors(['usa', 'norway']);
    const map2 = assignCountryColors(['norway', 'usa']);
    // usa gets first color in map1, second in map2
    expect(map1.get('usa')).not.toBe(map2.get('usa'));
  });
});

describe('getCountryColor', () => {
  it('returns assigned color for known code', () => {
    const map = assignCountryColors(['usa', 'norway']);
    const color = getCountryColor(map, 'usa');
    expect(color).toBe(map.get('usa'));
  });

  it('returns gray fallback for unknown code', () => {
    const map = assignCountryColors(['usa']);
    const color = getCountryColor(map, 'unknown');
    expect(color).toBe('#9ca3af');
  });

  it('returns gray fallback for empty map', () => {
    const map = new Map<string, string>();
    const color = getCountryColor(map, 'usa');
    expect(color).toBe('#9ca3af');
  });
});
