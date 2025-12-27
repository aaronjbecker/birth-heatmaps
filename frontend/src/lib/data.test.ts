/**
 * Tests for data loading utilities.
 */
import { describe, it, expect } from 'vitest';
import { formatYearRange, getSourceDisplayName } from './data';

describe('Data utilities', () => {
  describe('formatYearRange', () => {
    it('should format year range with en-dash', () => {
      expect(formatYearRange([1946, 2023])).toBe('1946–2023');
    });

    it('should handle same start and end year', () => {
      expect(formatYearRange([2020, 2020])).toBe('2020–2020');
    });
  });

  describe('getSourceDisplayName', () => {
    it('should return full name for HMD', () => {
      expect(getSourceDisplayName('HMD')).toBe('Human Mortality Database');
    });

    it('should return full name for UN', () => {
      expect(getSourceDisplayName('UN')).toBe('United Nations');
    });

    it('should return full name for JPOP', () => {
      expect(getSourceDisplayName('JPOP')).toBe('Japan Statistics Bureau');
    });

    it('should return original string for unknown source', () => {
      expect(getSourceDisplayName('UNKNOWN')).toBe('UNKNOWN');
    });
  });
});
