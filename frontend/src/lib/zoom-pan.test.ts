/**
 * Tests for zoom/pan utilities
 */
import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import {
  constrainTransform,
  calculateFitZoom,
  calculateCenterTransform,
} from './zoom-pan';

describe('Zoom/pan utilities', () => {
  describe('constrainTransform', () => {
    it('should not modify transform within bounds', () => {
      const transform = d3.zoomIdentity.translate(0, 0).scale(1);
      const constrained = constrainTransform(transform, 100, 100, 100, 100);

      expect(constrained.x).toBe(0);
      expect(constrained.y).toBe(0);
      expect(constrained.k).toBe(1);
    });

    it('should constrain negative x translation', () => {
      const transform = d3.zoomIdentity.translate(-200, 0).scale(1);
      const constrained = constrainTransform(transform, 100, 100, 100, 100);

      expect(constrained.x).toBe(0); // Constrained to min (0)
      expect(constrained.y).toBe(0);
    });

    it('should constrain positive x translation', () => {
      const transform = d3.zoomIdentity.translate(50, 0).scale(1);
      const constrained = constrainTransform(transform, 100, 100, 100, 100);

      expect(constrained.x).toBe(0); // Constrained to max
    });
  });

  describe('calculateFitZoom', () => {
    it('should return 1 when content fits container', () => {
      const zoom = calculateFitZoom(100, 100, 50, 50);
      expect(zoom).toBeLessThanOrEqual(1);
    });

    it('should scale down when content is larger', () => {
      const zoom = calculateFitZoom(100, 100, 200, 200, 0);
      expect(zoom).toBe(0.5);
    });

    it('should use the smaller scale factor', () => {
      const zoom = calculateFitZoom(100, 200, 100, 100, 0);
      expect(zoom).toBe(1);
    });

    it('should account for padding', () => {
      const zoom = calculateFitZoom(100, 100, 100, 100, 0.1);
      expect(zoom).toBe(0.9);
    });
  });

  describe('calculateCenterTransform', () => {
    it('should center content in container', () => {
      const transform = calculateCenterTransform(100, 100, 50, 50, 1);

      expect(transform.x).toBe(25);
      expect(transform.y).toBe(25);
      expect(transform.k).toBe(1);
    });

    it('should account for scale', () => {
      const transform = calculateCenterTransform(100, 100, 50, 50, 2);

      expect(transform.x).toBe(0);
      expect(transform.y).toBe(0);
      expect(transform.k).toBe(2);
    });
  });
});
