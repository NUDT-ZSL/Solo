import { describe, it, expect } from 'vitest';
import {
  keyframesToCSS,
  sortKeyframes,
  groupKeyframesByPercent,
  formatPercent,
  formatPropertyValue,
  validateKeyframes,
  createKeyframeNode,
  createDefaultAnimation,
  addKeyframeToData,
  removeKeyframeById,
  duplicateKeyframe,
  updateKeyframeById,
  durationForSpeed,
  KeyframeNode,
} from './animationEngine';

const kfAt = (timePercent: number, props: any[] = []): KeyframeNode => ({
  id: `kf-${timePercent}`,
  timePercent,
  properties: props.map((p, i) => ({
    id: `prop-${timePercent}-${i}`,
    property: p.property,
    value: p.value,
    unit: p.unit,
  })),
  easing: 'linear',
});

describe('animationEngine', () => {
  describe('formatPercent', () => {
    it('formats whole number percentages without decimals', () => {
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(50)).toBe('50%');
      expect(formatPercent(100)).toBe('100%');
    });

    it('formats decimals to 2 places', () => {
      expect(formatPercent(33.3333)).toBe('33.33%');
      expect(formatPercent(66.666)).toBe('66.67%');
    });
  });

  describe('sortKeyframes', () => {
    it('sorts keyframes by timePercent ascending', () => {
      const kfs = [
        kfAt(100),
        kfAt(0),
        kfAt(50),
        kfAt(25),
      ];
      const sorted = sortKeyframes(kfs);
      expect(sorted.map((k) => k.timePercent)).toEqual([0, 25, 50, 100]);
    });

    it('does not mutate original array', () => {
      const kfs = [kfAt(100), kfAt(0)];
      const originalOrder = kfs.map((k) => k.timePercent);
      sortKeyframes(kfs);
      expect(kfs.map((k) => k.timePercent)).toEqual(originalOrder);
    });
  });

  describe('groupKeyframesByPercent', () => {
    it('groups identical percentages into the same bucket', () => {
      const kfs = [
        kfAt(50, [{ property: 'translateX', value: 100, unit: 'px' }]),
        kfAt(50, [{ property: 'opacity', value: 0.5 }]),
        kfAt(0),
        kfAt(100),
      ];
      const groups = groupKeyframesByPercent(kfs);
      expect(groups).toHaveLength(3);
      expect(groups[0].timePercent).toBe(0);
      expect(groups[1].timePercent).toBe(50);
      expect(groups[1].keyframes).toHaveLength(2);
      expect(groups[2].timePercent).toBe(100);
    });

    it('rounds to 2 decimals for grouping tolerance', () => {
      const kfs = [
        kfAt(33.333),
        kfAt(33.335),
      ];
      const groups = groupKeyframesByPercent(kfs);
      expect(groups).toHaveLength(1);
    });
  });

  describe('keyframesToCSS - merged percentage rules', () => {
    it('merges multiple properties at same percent into ONE rule block (no duplicated selectors)', () => {
      const kfs = [
        kfAt(50, [
          { property: 'translateX', value: 100, unit: 'px' },
          { property: 'opacity', value: 0.5 },
        ]),
      ];
      const css = keyframesToCSS(kfs, 'test');
      const matches50 = (css.match(/50% \{/g) || []).length;
      expect(matches50).toBe(1);
      expect(css).toContain('transform: translateX(100px);');
      expect(css).toContain('opacity: 0.50;');
      const indentOfOpacity = /\n(\s+)opacity/.exec(css);
      expect(indentOfOpacity).toBeTruthy();
      expect(indentOfOpacity![1].length).toBe(4);
    });

    it('produces one single selector block for multiple keyframes at identical percent', () => {
      const kfs = [
        kfAt(50, [{ property: 'translateX', value: 100, unit: 'px' }]),
        kfAt(50, [{ property: 'opacity', value: 0.5 }]),
      ];
      const css = keyframesToCSS(kfs, 'dup');
      const count = (css.match(/\b50% \{/g) || []).length;
      expect(count).toBe(1);
      expect(css).toContain('transform: translateX(100px);');
      expect(css).toContain('opacity: 0.50;');
    });

    it('includes 0% and 100% boundary keyframes', () => {
      const kfs = [kfAt(0), kfAt(100)];
      const css = keyframesToCSS(kfs, 'bounds');
      expect(css).toContain('@keyframes bounds {');
      expect(css).toContain('0% {');
      expect(css).toContain('100% {');
    });

    it('returns empty keyframes rule for empty input', () => {
      const css = keyframesToCSS([], 'empty');
      expect(css).toBe('@keyframes empty {\n}');
    });

    it('combines transform-based properties into single transform declaration', () => {
      const kfs = [
        kfAt(50, [
          { property: 'translateX', value: 20, unit: 'px' },
          { property: 'rotate', value: 90, unit: 'deg' },
          { property: 'scale', value: 1.5 },
        ]),
      ];
      const css = keyframesToCSS(kfs, 'combined');
      expect(css).toContain('transform: translateX(20px) rotate(90deg) scale(1.50);');
    });

    it('applies easing via animation-timing-function when non-linear', () => {
      const kf: KeyframeNode = {
        ...kfAt(50),
        easing: 'ease-in-out',
      };
      const css = keyframesToCSS([kf], 'eased');
      expect(css).toContain('animation-timing-function: ease-in-out;');
    });

    it('omits animation-timing-function for linear', () => {
      const css = keyframesToCSS([kfAt(50)], 'linearKf');
      expect(css).not.toContain('animation-timing-function');
    });

    it('clamps opacity between 0 and 1', () => {
      const kfs = [
        kfAt(0, [{ property: 'opacity', value: -5 }]),
        kfAt(100, [{ property: 'opacity', value: 2 }]),
      ];
      const css = keyframesToCSS(kfs, 'clamp');
      expect(css).toContain('opacity: 0.00;');
      expect(css).toContain('opacity: 1.00;');
    });
  });

  describe('formatPropertyValue', () => {
    it('formats rotate with deg unit', () => {
      expect(formatPropertyValue({
        id: 'p', property: 'rotate', value: 45, unit: 'deg',
      })).toBe('45deg');
    });

    it('formats translate with px unit', () => {
      expect(formatPropertyValue({
        id: 'p', property: 'translateX', value: 100, unit: 'px',
      })).toBe('100px');
    });

    it('formats opacity as clamped decimal to 2 places', () => {
      expect(formatPropertyValue({
        id: 'p', property: 'opacity', value: 0.5,
      })).toBe('0.50');
    });

    it('formats scale to 2 decimal places with no unit', () => {
      expect(formatPropertyValue({
        id: 'p', property: 'scale', value: 1.25, unit: '',
      })).toBe('1.25');
    });
  });

  describe('validateKeyframes', () => {
    it('returns true when both 0% and 100% exist', () => {
      expect(validateKeyframes([kfAt(0), kfAt(50), kfAt(100)])).toBe(true);
    });

    it('returns false when missing 0%', () => {
      expect(validateKeyframes([kfAt(50), kfAt(100)])).toBe(false);
    });

    it('returns false when missing 100%', () => {
      expect(validateKeyframes([kfAt(0), kfAt(50)])).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(validateKeyframes([])).toBe(false);
    });
  });

  describe('CRUD operations', () => {
    it('createDefaultAnimation has 0% and 100% keyframes', () => {
      const anim = createDefaultAnimation('Test');
      expect(anim.name).toBe('Test');
      expect(anim.keyframes).toHaveLength(2);
      expect(anim.keyframes[0].timePercent).toBe(0);
      expect(anim.keyframes[1].timePercent).toBe(100);
    });

    it('addKeyframeToData inserts and sorts', () => {
      const anim = createDefaultAnimation('Add');
      const updated = addKeyframeToData(anim, 50);
      expect(updated.keyframes).toHaveLength(3);
      expect(updated.keyframes[1].timePercent).toBe(50);
    });

    it('addKeyframeToData clamps 0%-100%', () => {
      const anim = createDefaultAnimation('Clamp');
      const over = addKeyframeToData(anim, 150);
      expect(over.keyframes.find((k) => k.timePercent === 100)).toBeTruthy();
      const under = addKeyframeToData(anim, -50);
      expect(under.keyframes.find((k) => k.timePercent === 0)).toBeTruthy();
    });

    it('removeKeyframeById removes matching keyframe', () => {
      const anim = createDefaultAnimation('Remove');
      const [first, second] = anim.keyframes;
      const after = removeKeyframeById(anim, first.id);
      expect(after.keyframes).toHaveLength(1);
      expect(after.keyframes[0].id).toBe(second.id);
    });

    it('duplicateKeyframe copies with +10% offset capped at 100', () => {
      const anim = createDefaultAnimation('Dup');
      const at95 = addKeyframeToData(anim, 95);
      const kf95 = at95.keyframes.find((k) => k.timePercent === 95)!;
      const duped = duplicateKeyframe(at95, kf95.id);
      const found = duped.keyframes.find((k) => k.timePercent === 100 && k.id !== kf95.id && k.id !== anim.keyframes[1].id);
      expect(found).toBeTruthy();
    });

    it('updateKeyframeById clamps timePercent to 0-100', () => {
      const anim = createDefaultAnimation('Update');
      const firstId = anim.keyframes[0].id;
      const updated = updateKeyframeById(anim, firstId, { timePercent: -20 });
      expect(updated.keyframes.find((k) => k.id === firstId)!.timePercent).toBe(0);
    });
  });

  describe('durationForSpeed', () => {
    it('1x speed returns base duration', () => {
      expect(durationForSpeed(2000, 1)).toBe(2000);
    });

    it('0.25x speed produces 4x duration (within 20% tolerance)', () => {
      const d = durationForSpeed(2000, 0.25);
      expect(d).toBe(8000);
    });

    it('4x speed produces 1/4 duration (within 20% tolerance)', () => {
      const d = durationForSpeed(2000, 4);
      expect(d).toBe(500);
    });

    it('handles zero speed gracefully', () => {
      expect(durationForSpeed(2000, 0)).toBe(2000);
    });
  });
});
