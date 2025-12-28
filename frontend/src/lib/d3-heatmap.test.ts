/**
 * Tests for D3 heatmap utilities
 */
import { describe, it, expect } from 'vitest';
import { getMonthName } from './d3-heatmap';

describe('D3 heatmap utilities', () => {
  describe('getMonthName', () => {
    it('should return correct month names', () => {
      expect(getMonthName(1)).toBe('Jan');
      expect(getMonthName(2)).toBe('Feb');
      expect(getMonthName(3)).toBe('Mar');
      expect(getMonthName(4)).toBe('Apr');
      expect(getMonthName(5)).toBe('May');
      expect(getMonthName(6)).toBe('Jun');
      expect(getMonthName(7)).toBe('Jul');
      expect(getMonthName(8)).toBe('Aug');
      expect(getMonthName(9)).toBe('Sep');
      expect(getMonthName(10)).toBe('Oct');
      expect(getMonthName(11)).toBe('Nov');
      expect(getMonthName(12)).toBe('Dec');
    });

    it('should return empty string for invalid month', () => {
      expect(getMonthName(0)).toBe('');
      expect(getMonthName(13)).toBe('');
      expect(getMonthName(-1)).toBe('');
    });
  });
});
