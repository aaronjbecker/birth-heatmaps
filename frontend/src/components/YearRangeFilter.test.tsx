/**
 * Tests for YearRangeFilter component
 */
import { describe, it, expect } from 'vitest';
import { analyzeDataZones } from './YearRangeFilter';

describe('YearRangeFilter', () => {
  describe('analyzeDataZones', () => {
    it('should return single zone with hasData=false when no data years provided', () => {
      const zones = analyzeDataZones(2000, 2010);

      expect(zones).toHaveLength(1);
      expect(zones[0]).toEqual({
        start: 2000,
        end: 2010,
        hasData: false,
      });
    });

    it('should return single zone with hasData=false for empty dataYears array', () => {
      const zones = analyzeDataZones(2000, 2010, []);

      expect(zones).toHaveLength(1);
      expect(zones[0]).toEqual({
        start: 2000,
        end: 2010,
        hasData: false,
      });
    });

    it('should create single data zone for continuous years', () => {
      const zones = analyzeDataZones(2000, 2005, [2000, 2001, 2002, 2003, 2004, 2005]);

      expect(zones).toHaveLength(1);
      expect(zones[0]).toEqual({
        start: 2000,
        end: 2005,
        hasData: true,
      });
    });

    it('should create three zones with gap in middle', () => {
      // Data: 2000-2002, gap (2003-2004), 2005-2007
      const zones = analyzeDataZones(2000, 2007, [2000, 2001, 2002, 2005, 2006, 2007]);

      expect(zones).toHaveLength(3);
      expect(zones[0]).toEqual({ start: 2000, end: 2002, hasData: true });
      expect(zones[1]).toEqual({ start: 2003, end: 2004, hasData: false });
      expect(zones[2]).toEqual({ start: 2005, end: 2007, hasData: true });
    });

    it('should create zones with gaps at edges', () => {
      // Range: 2000-2010, Data: 2003-2007
      const zones = analyzeDataZones(2000, 2010, [2003, 2004, 2005, 2006, 2007]);

      expect(zones).toHaveLength(3);
      expect(zones[0]).toEqual({ start: 2000, end: 2002, hasData: false });
      expect(zones[1]).toEqual({ start: 2003, end: 2007, hasData: true });
      expect(zones[2]).toEqual({ start: 2008, end: 2010, hasData: false });
    });

    it('should handle multiple gaps creating many zones', () => {
      // Data: 2000, 2002, 2004, 2006
      const zones = analyzeDataZones(2000, 2007, [2000, 2002, 2004, 2006]);

      expect(zones).toHaveLength(8);
      expect(zones[0]).toEqual({ start: 2000, end: 2000, hasData: true });
      expect(zones[1]).toEqual({ start: 2001, end: 2001, hasData: false });
      expect(zones[2]).toEqual({ start: 2002, end: 2002, hasData: true });
      expect(zones[3]).toEqual({ start: 2003, end: 2003, hasData: false });
      expect(zones[4]).toEqual({ start: 2004, end: 2004, hasData: true });
      expect(zones[5]).toEqual({ start: 2005, end: 2005, hasData: false });
      expect(zones[6]).toEqual({ start: 2006, end: 2006, hasData: true });
      expect(zones[7]).toEqual({ start: 2007, end: 2007, hasData: false });
    });

    it('should ignore data years outside the range', () => {
      // Range: 2005-2010, Data includes 2000, 2015 which should be ignored
      const zones = analyzeDataZones(2005, 2010, [2000, 2005, 2006, 2007, 2015]);

      expect(zones).toHaveLength(2);
      expect(zones[0]).toEqual({ start: 2005, end: 2007, hasData: true });
      expect(zones[1]).toEqual({ start: 2008, end: 2010, hasData: false });
    });

    it('should handle unsorted data years', () => {
      const zones = analyzeDataZones(2000, 2005, [2005, 2001, 2003, 2002, 2000]);

      // Should sort and create zones: 2000-2003, gap, 2005
      expect(zones).toHaveLength(3);
      expect(zones[0]).toEqual({ start: 2000, end: 2003, hasData: true });
      expect(zones[1]).toEqual({ start: 2004, end: 2004, hasData: false });
      expect(zones[2]).toEqual({ start: 2005, end: 2005, hasData: true });
    });

    it('should handle single data year at start', () => {
      const zones = analyzeDataZones(2000, 2005, [2000]);

      expect(zones).toHaveLength(2);
      expect(zones[0]).toEqual({ start: 2000, end: 2000, hasData: true });
      expect(zones[1]).toEqual({ start: 2001, end: 2005, hasData: false });
    });

    it('should handle single data year at end', () => {
      const zones = analyzeDataZones(2000, 2005, [2005]);

      expect(zones).toHaveLength(2);
      expect(zones[0]).toEqual({ start: 2000, end: 2004, hasData: false });
      expect(zones[1]).toEqual({ start: 2005, end: 2005, hasData: true });
    });

    it('should handle single data year in middle', () => {
      const zones = analyzeDataZones(2000, 2005, [2003]);

      expect(zones).toHaveLength(3);
      expect(zones[0]).toEqual({ start: 2000, end: 2002, hasData: false });
      expect(zones[1]).toEqual({ start: 2003, end: 2003, hasData: true });
      expect(zones[2]).toEqual({ start: 2004, end: 2005, hasData: false });
    });
  });
});
