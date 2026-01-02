/**
 * Unit tests for url-params.ts utilities.
 */
import { describe, it, expect } from 'vitest';
import {
  parseCompareParams,
  serializeCompareParams,
  buildCompareUrl,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getLinkedInShareUrl,
  getRedditShareUrl,
} from './url-params';
import type { CompareQueryParams } from './types';

describe('parseCompareParams', () => {
  it('returns defaults for empty params', () => {
    const params = new URLSearchParams();
    const result = parseCompareParams(params);

    expect(result.countries).toEqual([]);
    expect(result.metric).toBe('fertility');
    expect(result.scale).toBe('unified');
    expect(result.yearStart).toBeUndefined();
    expect(result.yearEnd).toBeUndefined();
  });

  it('parses single country', () => {
    const params = new URLSearchParams('countries=usa');
    const result = parseCompareParams(params);

    expect(result.countries).toEqual(['usa']);
  });

  it('parses multiple comma-separated countries', () => {
    const params = new URLSearchParams('countries=usa,norway,japan');
    const result = parseCompareParams(params);

    expect(result.countries).toEqual(['usa', 'norway', 'japan']);
  });

  it('trims whitespace from country codes', () => {
    const params = new URLSearchParams('countries=usa, norway , japan');
    const result = parseCompareParams(params);

    expect(result.countries).toEqual(['usa', 'norway', 'japan']);
  });

  it('filters empty country codes', () => {
    const params = new URLSearchParams('countries=usa,,norway,');
    const result = parseCompareParams(params);

    expect(result.countries).toEqual(['usa', 'norway']);
  });

  it('parses valid metric values', () => {
    expect(parseCompareParams(new URLSearchParams('metric=fertility')).metric).toBe('fertility');
    expect(parseCompareParams(new URLSearchParams('metric=seasonality')).metric).toBe('seasonality');
    expect(parseCompareParams(new URLSearchParams('metric=conception')).metric).toBe('conception');
  });

  it('defaults to fertility for invalid metric', () => {
    const params = new URLSearchParams('metric=invalid');
    const result = parseCompareParams(params);

    expect(result.metric).toBe('fertility');
  });

  it('parses scale modes', () => {
    expect(parseCompareParams(new URLSearchParams('scale=unified')).scale).toBe('unified');
    expect(parseCompareParams(new URLSearchParams('scale=per-country')).scale).toBe('per-country');
  });

  it('defaults to unified for invalid scale', () => {
    const params = new URLSearchParams('scale=invalid');
    const result = parseCompareParams(params);

    expect(result.scale).toBe('unified');
  });

  it('parses year range', () => {
    const params = new URLSearchParams('yearStart=1990&yearEnd=2020');
    const result = parseCompareParams(params);

    expect(result.yearStart).toBe(1990);
    expect(result.yearEnd).toBe(2020);
  });

  it('ignores invalid year values', () => {
    const params = new URLSearchParams('yearStart=abc&yearEnd=xyz');
    const result = parseCompareParams(params);

    expect(result.yearStart).toBeUndefined();
    expect(result.yearEnd).toBeUndefined();
  });

  it('parses complete query string', () => {
    const params = new URLSearchParams(
      'countries=usa,norway&metric=seasonality&scale=per-country&yearStart=2000&yearEnd=2020'
    );
    const result = parseCompareParams(params);

    expect(result).toEqual({
      countries: ['usa', 'norway'],
      metric: 'seasonality',
      scale: 'per-country',
      yearStart: 2000,
      yearEnd: 2020,
    });
  });
});

describe('serializeCompareParams', () => {
  it('returns empty string for default params with no countries', () => {
    const params: CompareQueryParams = {
      countries: [],
      metric: 'fertility',
      scale: 'unified',
    };

    const result = serializeCompareParams(params);
    expect(result).toBe('');
  });

  it('includes countries when present', () => {
    const params: CompareQueryParams = {
      countries: ['usa', 'norway'],
      metric: 'fertility',
      scale: 'unified',
    };

    const result = serializeCompareParams(params);
    expect(result).toBe('countries=usa%2Cnorway');
  });

  it('omits metric when it is the default', () => {
    const params: CompareQueryParams = {
      countries: ['usa'],
      metric: 'fertility',
      scale: 'unified',
    };

    const result = serializeCompareParams(params);
    expect(result).not.toContain('metric');
  });

  it('includes metric when not default', () => {
    const params: CompareQueryParams = {
      countries: ['usa'],
      metric: 'seasonality',
      scale: 'unified',
    };

    const result = serializeCompareParams(params);
    expect(result).toContain('metric=seasonality');
  });

  it('omits scale when it is the default', () => {
    const params: CompareQueryParams = {
      countries: ['usa'],
      metric: 'fertility',
      scale: 'unified',
    };

    const result = serializeCompareParams(params);
    expect(result).not.toContain('scale');
  });

  it('includes scale when not default', () => {
    const params: CompareQueryParams = {
      countries: ['usa'],
      metric: 'fertility',
      scale: 'per-country',
    };

    const result = serializeCompareParams(params);
    expect(result).toContain('scale=per-country');
  });

  it('includes year range when specified', () => {
    const params: CompareQueryParams = {
      countries: ['usa'],
      metric: 'fertility',
      scale: 'unified',
      yearStart: 2000,
      yearEnd: 2020,
    };

    const result = serializeCompareParams(params);
    expect(result).toContain('yearStart=2000');
    expect(result).toContain('yearEnd=2020');
  });

  it('handles complete params', () => {
    const params: CompareQueryParams = {
      countries: ['usa', 'norway', 'japan'],
      metric: 'conception',
      scale: 'per-country',
      yearStart: 1990,
      yearEnd: 2010,
    };

    const result = serializeCompareParams(params);
    expect(result).toContain('countries=usa%2Cnorway%2Cjapan');
    expect(result).toContain('metric=conception');
    expect(result).toContain('scale=per-country');
    expect(result).toContain('yearStart=1990');
    expect(result).toContain('yearEnd=2010');
  });
});

describe('parse/serialize round-trip', () => {
  it('preserves params through round-trip', () => {
    const original: CompareQueryParams = {
      countries: ['usa', 'norway'],
      metric: 'seasonality',
      scale: 'per-country',
      yearStart: 1995,
      yearEnd: 2015,
    };

    const serialized = serializeCompareParams(original);
    const parsed = parseCompareParams(new URLSearchParams(serialized));

    expect(parsed).toEqual(original);
  });

  it('preserves default values through round-trip', () => {
    const original: CompareQueryParams = {
      countries: ['japan'],
      metric: 'fertility',
      scale: 'unified',
    };

    const serialized = serializeCompareParams(original);
    const parsed = parseCompareParams(new URLSearchParams(serialized));

    expect(parsed.countries).toEqual(['japan']);
    expect(parsed.metric).toBe('fertility');
    expect(parsed.scale).toBe('unified');
  });
});

describe('buildCompareUrl', () => {
  it('returns bare path for default params with no countries', () => {
    const params: CompareQueryParams = {
      countries: [],
      metric: 'fertility',
      scale: 'unified',
    };

    const result = buildCompareUrl(params);
    expect(result).toBe('/compare');
  });

  it('includes query string when params are non-default', () => {
    const params: CompareQueryParams = {
      countries: ['usa', 'norway'],
      metric: 'fertility',
      scale: 'unified',
    };

    const result = buildCompareUrl(params);
    expect(result).toBe('/compare?countries=usa%2Cnorway');
  });

  it('builds complete URL with all params', () => {
    const params: CompareQueryParams = {
      countries: ['usa'],
      metric: 'seasonality',
      scale: 'per-country',
      yearStart: 2000,
      yearEnd: 2020,
    };

    const result = buildCompareUrl(params);
    expect(result.startsWith('/compare?')).toBe(true);
    expect(result).toContain('countries=usa');
    expect(result).toContain('metric=seasonality');
    expect(result).toContain('scale=per-country');
    expect(result).toContain('yearStart=2000');
    expect(result).toContain('yearEnd=2020');
  });
});

describe('Social share URL generators', () => {
  const testUrl = 'https://example.com/compare?countries=usa,norway';
  const testText = 'Compare birth patterns across countries';

  describe('getTwitterShareUrl', () => {
    it('generates valid Twitter share URL', () => {
      const result = getTwitterShareUrl(testUrl, testText);

      expect(result.startsWith('https://twitter.com/intent/tweet?')).toBe(true);
      expect(result).toContain('url=');
      expect(result).toContain('text=');
    });

    it('encodes URL parameters', () => {
      const result = getTwitterShareUrl(testUrl, testText);
      const params = new URLSearchParams(result.split('?')[1]);

      expect(params.get('url')).toBe(testUrl);
      expect(params.get('text')).toBe(testText);
    });
  });

  describe('getFacebookShareUrl', () => {
    it('generates valid Facebook share URL', () => {
      const result = getFacebookShareUrl(testUrl);

      expect(result.startsWith('https://www.facebook.com/sharer/sharer.php?')).toBe(true);
      expect(result).toContain('u=');
    });

    it('encodes URL parameter', () => {
      const result = getFacebookShareUrl(testUrl);
      const params = new URLSearchParams(result.split('?')[1]);

      expect(params.get('u')).toBe(testUrl);
    });
  });

  describe('getLinkedInShareUrl', () => {
    it('generates valid LinkedIn share URL', () => {
      const result = getLinkedInShareUrl(testUrl);

      expect(result.startsWith('https://www.linkedin.com/sharing/share-offsite/?')).toBe(true);
      expect(result).toContain('url=');
    });

    it('encodes URL parameter', () => {
      const result = getLinkedInShareUrl(testUrl);
      const params = new URLSearchParams(result.split('?')[1]);

      expect(params.get('url')).toBe(testUrl);
    });
  });

  describe('getRedditShareUrl', () => {
    it('generates valid Reddit share URL', () => {
      const result = getRedditShareUrl(testUrl, testText);

      expect(result.startsWith('https://www.reddit.com/submit?')).toBe(true);
      expect(result).toContain('url=');
      expect(result).toContain('title=');
    });

    it('encodes URL parameters', () => {
      const result = getRedditShareUrl(testUrl, testText);
      const params = new URLSearchParams(result.split('?')[1]);

      expect(params.get('url')).toBe(testUrl);
      expect(params.get('title')).toBe(testText);
    });
  });
});
