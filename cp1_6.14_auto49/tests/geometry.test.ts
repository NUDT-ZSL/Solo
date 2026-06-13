import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { perpendicularTo, buildHexRingPositions, bondLength } from '../src/utils/geometry';

describe('geometry utils', () => {
  describe('perpendicularTo', () => {
    it('should return a non-zero vector perpendicular to input', () => {
      const v = new THREE.Vector3(1, 2, 3).normalize();
      const perp = perpendicularTo(v);
      expect(perp.length()).toBeCloseTo(1.0, 6);
      expect(v.dot(perp)).toBeCloseTo(0, 6);
    });

    it('handles Y-axis nearly parallel (degenerate case)', () => {
      const v = new THREE.Vector3(0, 0.9999, 0.0001).normalize();
      const perp = perpendicularTo(v);
      expect(perp.length()).toBeCloseTo(1.0, 6);
      expect(v.dot(perp)).toBeCloseTo(0, 4);
    });

    it('handles X-axis nearly parallel (degenerate case)', () => {
      const v = new THREE.Vector3(0.9999, 0.0001, 0.0001).normalize();
      const perp = perpendicularTo(v);
      expect(perp.length()).toBeCloseTo(1.0, 6);
      expect(v.dot(perp)).toBeCloseTo(0, 4);
    });

    it('handles Z-axis nearly parallel (degenerate case)', () => {
      const v = new THREE.Vector3(0.0001, 0.0001, 0.9999).normalize();
      const perp = perpendicularTo(v);
      expect(perp.length()).toBeCloseTo(1.0, 6);
      expect(v.dot(perp)).toBeCloseTo(0, 4);
    });

    it('handles perfectly aligned Z vector', () => {
      const v = new THREE.Vector3(0, 0, 1);
      const perp = perpendicularTo(v);
      expect(perp.length()).toBeCloseTo(1.0, 6);
      expect(v.dot(perp)).toBeCloseTo(0, 6);
    });

    it('handles perfectly aligned Y vector', () => {
      const v = new THREE.Vector3(0, 1, 0);
      const perp = perpendicularTo(v);
      expect(perp.length()).toBeCloseTo(1.0, 6);
      expect(v.dot(perp)).toBeCloseTo(0, 6);
    });

    it('handles perfectly aligned X vector', () => {
      const v = new THREE.Vector3(1, 0, 0);
      const perp = perpendicularTo(v);
      expect(perp.length()).toBeCloseTo(1.0, 6);
      expect(v.dot(perp)).toBeCloseTo(0, 6);
    });

    it('never returns zero vector for any direction', () => {
      const vectors = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 1, 0),
        new THREE.Vector3(1, 0, 1),
        new THREE.Vector3(0, 1, 1),
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(0.001, 0.001, 0.999),
        new THREE.Vector3(0.999, 0.001, 0.001),
        new THREE.Vector3(0.001, 0.999, 0.001),
      ];
      for (const v of vectors) {
        const perp = perpendicularTo(v.clone().normalize());
        expect(perp.length()).toBeGreaterThan(0.5);
        expect(Math.abs(v.clone().normalize().dot(perp))).toBeLessThan(0.01);
      }
    });
  });

  describe('buildHexRingPositions', () => {
    it('returns 6 positions', () => {
      const center = new THREE.Vector3(0, 0, 0);
      const normal = new THREE.Vector3(0, 0, 1);
      const positions = buildHexRingPositions(center, normal, 1.5);
      expect(positions.length).toBe(6);
    });

    it('all positions are the correct distance from center', () => {
      const center = new THREE.Vector3(2, 3, 1);
      const normal = new THREE.Vector3(0, 1, 0);
      const radius = 2.0;
      const positions = buildHexRingPositions(center, normal, radius);
      for (const p of positions) {
        expect(p.distanceTo(center)).toBeCloseTo(radius, 5);
      }
    });

    it('all positions lie on plane defined by normal and center', () => {
      const center = new THREE.Vector3(1, 2, 3);
      const normal = new THREE.Vector3(1, 2, 3).normalize();
      const positions = buildHexRingPositions(center, normal, 1.0);
      for (const p of positions) {
        const diff = p.clone().sub(center);
        expect(Math.abs(diff.dot(normal))).toBeLessThan(1e-6);
      }
    });

    it('adjacent bond lengths are equal (regular hexagon)', () => {
      const center = new THREE.Vector3(0, 0, 0);
      const normal = new THREE.Vector3(0, 0, 1);
      const radius = 1.0;
      const positions = buildHexRingPositions(center, normal, radius);
      const bondLen = bondLength(positions[0], positions[1]);
      for (let i = 0; i < 6; i++) {
        const len = bondLength(positions[i], positions[(i + 1) % 6]);
        expect(len).toBeCloseTo(bondLen, 6);
      }
      expect(bondLen).toBeCloseTo(radius, 5);
    });

    it('works with arbitrary normal direction', () => {
      const center = new THREE.Vector3(0, 0, 0);
      const normal = new THREE.Vector3(1, 1, 1).normalize();
      const positions = buildHexRingPositions(center, normal, 1.5);
      expect(positions.length).toBe(6);
      for (const p of positions) {
        const diff = p.clone();
        expect(Math.abs(diff.dot(normal))).toBeLessThan(1e-6);
      }
    });
  });

  describe('bondLength', () => {
    it('calculates distance between two points', () => {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(3, 4, 0);
      expect(bondLength(p1, p2)).toBeCloseTo(5.0, 6);
    });

    it('returns 0 for identical points', () => {
      const p = new THREE.Vector3(1, 2, 3);
      expect(bondLength(p, p)).toBe(0);
    });
  });
});
