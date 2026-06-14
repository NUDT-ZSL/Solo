import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import StyleEditor, { applyCSSToPreview, generateCSSText } from '../StyleEditor';
import type { StyleRegion } from '../StyleDetector';

const mockRegion: StyleRegion = {
  id: 'test-1',
  x: 10,
  y: 20,
  width: 200,
  height: 100,
  borderRadius: 12,
  gradient: {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#f97316', position: 0 },
      { color: '#eab308', position: 1 },
    ],
  },
  boxShadow: [{
    offsetX: 0,
    offsetY: 4,
    blur: 12,
    spread: 0,
    color: 'rgba(0, 0, 0, 0.15)',
    inset: false,
  }],
  thumbnail: '',
  cssText: '  background: linear-gradient(90deg, #f97316 0.0%, #eab308 100.0%);\n  box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.15);',
  name: '渐变橙-黄投影-1',
};

const mockRegionWithInnerShadow: StyleRegion = {
  id: 'test-2',
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  borderRadius: 16,
  backgroundColor: '#1e293b',
  innerShadow: [{
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    spread: 0,
    color: 'rgba(0, 0, 0, 0.3)',
    inset: true,
  }],
  thumbnail: '',
  cssText: '  background-color: #1e293b;\n  box-shadow: inset 0px 4px 8px 0px rgba(0, 0, 0, 0.3);',
  name: '深色内阴影圆角-1',
};

describe('StyleEditor', () => {
  describe('generateCSSText', () => {
    it('should generate CSS for gradient background', () => {
      const state = {
        gradient: {
          type: 'linear' as const,
          angle: 90,
          stops: [{ color: '#ff0000', position: 0 }, { color: '#0000ff', position: 1 }],
        },
        innerShadow: null,
        boxShadow: null,
        borderRadius: 8,
        backgroundColor: '',
      };
      const css = generateCSSText(state);
      expect(css).toContain('linear-gradient(90deg');
      expect(css).toContain('#ff0000');
      expect(css).toContain('#0000ff');
      expect(css).toContain('border-radius: 8px');
      expect(css).toContain('-webkit-border-radius: 8px');
    });

    it('should generate CSS for box-shadow', () => {
      const state = {
        gradient: null,
        innerShadow: null,
        boxShadow: {
          offsetX: 2, offsetY: 4, blur: 10, spread: 0,
          color: 'rgba(0,0,0,0.2)', inset: false,
        },
        borderRadius: 0,
        backgroundColor: '#ffffff',
      };
      const css = generateCSSText(state);
      expect(css).toContain('box-shadow:');
      expect(css).toContain('-webkit-box-shadow:');
      expect(css).toContain('2px 4px 10px 0px rgba(0,0,0,0.2)');
    });

    it('should generate CSS for inner shadow', () => {
      const state = {
        gradient: null,
        innerShadow: {
          offsetX: 0, offsetY: -2, blur: 6, spread: 0,
          color: 'rgba(255,255,255,0.2)', inset: true,
        },
        boxShadow: null,
        borderRadius: 16,
        backgroundColor: '#1e293b',
      };
      const css = generateCSSText(state);
      expect(css).toContain('inset 0px -2px 6px 0px rgba(255,255,255,0.2)');
      expect(css).toContain('border-radius: 16px');
    });

    it('should combine multiple shadow sources', () => {
      const state = {
        gradient: null,
        innerShadow: {
          offsetX: 0, offsetY: 2, blur: 4, spread: 0,
          color: 'rgba(0,0,0,0.3)', inset: true,
        },
        boxShadow: {
          offsetX: 0, offsetY: 4, blur: 12, spread: 0,
          color: 'rgba(0,0,0,0.15)', inset: false,
        },
        borderRadius: 12,
        backgroundColor: '#334155',
      };
      const css = generateCSSText(state);
      expect(css).toContain('inset');
      expect(css).toContain('0px 4px 12px');
    });
  });

  describe('applyCSSToPreview', () => {
    it('should apply gradient to preview element', () => {
      const el = document.createElement('div');
      const state = {
        gradient: {
          type: 'linear' as const,
          angle: 180,
          stops: [{ color: '#ff0000', position: 0 }, { color: '#00ff00', position: 1 }],
        },
        innerShadow: null,
        boxShadow: null,
        borderRadius: 8,
        backgroundColor: '',
      };
      applyCSSToPreview(el, state);
      expect(el.style.background).toContain('linear-gradient');
      expect(el.style.borderRadius).toBe('8px');
    });

    it('should apply background-color for solid regions', () => {
      const el = document.createElement('div');
      const state = {
        gradient: null,
        innerShadow: null,
        boxShadow: null,
        borderRadius: 0,
        backgroundColor: '#3b82f6',
      };
      applyCSSToPreview(el, state);
      expect(el.style.backgroundColor).toBe('#3b82f6');
    });

    it('should apply box-shadow', () => {
      const el = document.createElement('div');
      const state = {
        gradient: null,
        innerShadow: null,
        boxShadow: {
          offsetX: 2, offsetY: 4, blur: 8, spread: 0,
          color: 'rgba(0,0,0,0.2)', inset: false,
        },
        borderRadius: 12,
        backgroundColor: '#ffffff',
      };
      applyCSSToPreview(el, state);
      expect(el.style.boxShadow).toContain('2px 4px 8px');
    });

    it('should handle null element gracefully', () => {
      const state = {
        gradient: null,
        innerShadow: null,
        boxShadow: null,
        borderRadius: 0,
        backgroundColor: '#ffffff',
      };
      expect(() => applyCSSToPreview(null, state)).not.toThrow();
    });
  });

  describe('Slider rAF throttling', () => {
    it('should use requestAnimationFrame for slider updates', () => {
      vi.useFakeTimers();
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(Date.now());
        return 1;
      });

      const onUpdate = vi.fn();
      render(
        <StyleEditor
          region={mockRegion}
          panelPosition={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onUpdate={onUpdate}
        />
      );

      const sliders = screen.getAllByRole('slider');
      if (sliders.length > 0) {
        fireEvent.change(sliders[0], { target: { value: '180' } });
        expect(rafSpy).toHaveBeenCalled();
      }

      rafSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('Panel rendering', () => {
    it('should not render when region is null', () => {
      const { container } = render(
        <StyleEditor
          region={null}
          panelPosition={null}
          onClose={vi.fn()}
        />
      );
      expect(container.querySelector('[style*="position: fixed"]')?.children.length || 0).toBe(0);
    });

    it('should render region name in header', () => {
      render(
        <StyleEditor
          region={mockRegion}
          panelPosition={{ x: 100, y: 100 }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('渐变橙-黄投影-1')).toBeTruthy();
    });

    it('should show inner shadow controls for region with inner shadow', () => {
      render(
        <StyleEditor
          region={mockRegionWithInnerShadow}
          panelPosition={{ x: 100, y: 100 }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('内阴影设置')).toBeTruthy();
    });

    it('should show gradient controls for region with gradient', () => {
      render(
        <StyleEditor
          region={mockRegion}
          panelPosition={{ x: 100, y: 100 }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('渐变设置')).toBeTruthy();
    });
  });
});
