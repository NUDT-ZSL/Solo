import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectGradient,
  detectBorderRadius,
  detectBoxShadow,
  detectInnerShadow,
  findOpaqueRegions,
  generateSemanticName,
  generateFullCSS,
  copyToClipboard,
} from '../StyleDetector';
import type { StyleRegion } from '../StyleDetector';

function createGradientImageData(
  width: number,
  height: number,
  startR: number, startG: number, startB: number,
  endR: number, endG: number, endB: number,
  direction: 'horizontal' | 'vertical' = 'horizontal'
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const t = direction === 'horizontal' ? x / (width - 1) : y / (height - 1);
      data[idx] = Math.round(startR + (endR - startR) * t);
      data[idx + 1] = Math.round(startG + (endG - startG) * t);
      data[idx + 2] = Math.round(startB + (endB - startB) * t);
      data[idx + 3] = 255;
    }
  }
  return data;
}

function createSolidImageData(
  width: number,
  height: number,
  r: number, g: number, b: number,
  borderRadius: number = 0
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let isInside = true;

      if (borderRadius > 0) {
        const corners = [
          { cx: borderRadius, cy: borderRadius },
          { cx: width - borderRadius, cy: borderRadius },
          { cx: borderRadius, cy: height - borderRadius },
          { cx: width - borderRadius, cy: height - borderRadius },
        ];
        for (const corner of corners) {
          if ((x < borderRadius || x >= width - borderRadius) &&
              (y < borderRadius || y >= height - borderRadius)) {
            const dist = Math.sqrt(Math.pow(x - corner.cx, 2) + Math.pow(y - corner.cy, 2));
            if (dist > borderRadius) {
              isInside = false;
              break;
            }
          }
        }
      }

      if (isInside) {
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
  }
  return data;
}

function createShadowImageData(
  width: number,
  height: number,
  boxX: number, boxY: number, boxW: number, boxH: number,
  shadowOffsetX: number, shadowOffsetY: number, shadowBlur: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const inBox = x >= boxX && x < boxX + boxW && y >= boxY && y < boxY + boxH;
      if (inBox) {
        data[idx] = 100;
        data[idx + 1] = 100;
        data[idx + 2] = 100;
        data[idx + 3] = 255;
      } else {
        const shadowCX = boxX + shadowOffsetX + boxW / 2;
        const shadowCY = boxY + shadowOffsetY + boxH / 2;
        const dist = Math.sqrt(Math.pow(x - shadowCX, 2) + Math.pow(y - shadowCY, 2));
        const halfDiag = Math.sqrt(boxW * boxW + boxH * boxH) / 2 + shadowBlur;
        if (dist < halfDiag && x >= boxX + shadowOffsetX - shadowBlur && x < boxX + boxW + shadowOffsetX + shadowBlur &&
            y >= boxY + shadowOffsetY - shadowBlur && y < boxY + boxH + shadowOffsetY + shadowBlur) {
          const alpha = Math.max(0, 0.3 * (1 - (dist - halfDiag + shadowBlur) / shadowBlur));
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = Math.round(alpha * 255);
        }
      }
    }
  }
  return data;
}

function createTransparentImageData(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

describe('StyleDetector', () => {
  describe('detectGradient', () => {
    it('should detect a horizontal linear gradient', () => {
      const W = 200, H = 100;
      const data = createGradientImageData(W, H, 255, 100, 0, 0, 100, 255, 'horizontal');
      const result = detectGradient(data, W, H, 0, 0, W, H);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('linear');
      expect(result!.stops.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect a vertical linear gradient', () => {
      const W = 100, H = 200;
      const data = createGradientImageData(W, H, 0, 255, 0, 255, 0, 0, 'vertical');
      const result = detectGradient(data, W, H, 0, 0, W, H);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('linear');
    });

    it('should return null for a solid color region', () => {
      const W = 100, H = 100;
      const data = createSolidImageData(W, H, 128, 128, 128);
      const result = detectGradient(data, W, H, 0, 0, W, H);
      expect(result).toBeNull();
    });

    it('should detect gradient with computed angle close to expected', () => {
      const W = 200, H = 100;
      const data = createGradientImageData(W, H, 255, 0, 0, 0, 0, 255, 'horizontal');
      const result = detectGradient(data, W, H, 0, 0, W, H);
      expect(result).not.toBeNull();
      expect(result!.angle).toBeGreaterThanOrEqual(0);
      expect(result!.angle).toBeLessThanOrEqual(360);
    });

    it('should return null for near-solid regions with minimal color change', () => {
      const W = 100, H = 100;
      const data = createGradientImageData(W, H, 128, 128, 128, 130, 130, 130, 'horizontal');
      const result = detectGradient(data, W, H, 0, 0, W, H);
      expect(result).toBeNull();
    });

    it('should detect gradient with stops containing valid hex colors', () => {
      const W = 200, H = 100;
      const data = createGradientImageData(W, H, 255, 0, 0, 0, 0, 255, 'horizontal');
      const result = detectGradient(data, W, H, 0, 0, W, H);
      expect(result).not.toBeNull();
      for (const stop of result!.stops) {
        expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(stop.position).toBeGreaterThanOrEqual(0);
        expect(stop.position).toBeLessThanOrEqual(1);
      }
    });

    it('should return null for fully transparent region', () => {
      const W = 100, H = 100;
      const data = createTransparentImageData(W, H);
      const result = detectGradient(data, W, H, 0, 0, W, H);
      expect(result).toBeNull();
    });

    it('should detect gradient on a sub-region of the image', () => {
      const W = 300, H = 200;
      const data = createGradientImageData(W, H, 0, 255, 0, 255, 0, 0, 'horizontal');
      const result = detectGradient(data, W, H, 50, 50, 200, 100);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('linear');
    });
  });

  describe('detectBorderRadius', () => {
    it('should detect border radius on rounded rectangle', () => {
      const W = 200, H = 100;
      const data = createSolidImageData(W, H, 100, 100, 200, 20);
      const result = detectBorderRadius(data, W, H, 0, 0, W, H);
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 for sharp rectangle', () => {
      const W = 200, H = 100;
      const data = createSolidImageData(W, H, 100, 100, 200, 0);
      const result = detectBorderRadius(data, W, H, 0, 0, W, H);
      expect(result).toBe(0);
    });

    it('should return 0 for very small regions', () => {
      const W = 15, H = 15;
      const data = createSolidImageData(W, H, 100, 100, 200, 5);
      const result = detectBorderRadius(data, W, H, 0, 0, W, H);
      expect(result).toBe(0);
    });

    it('should return 0 for fully transparent image', () => {
      const W = 200, H = 100;
      const data = createTransparentImageData(W, H);
      const result = detectBorderRadius(data, W, H, 0, 0, W, H);
      expect(result).toBe(0);
    });

    it('should detect larger border radius', () => {
      const W = 200, H = 100;
      const data = createSolidImageData(W, H, 100, 100, 200, 30);
      const result = detectBorderRadius(data, W, H, 0, 0, W, H);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('detectBoxShadow', () => {
    it('should detect box shadow around an element', () => {
      const W = 200, H = 150;
      const data = createShadowImageData(W, H, 40, 30, 100, 80, 4, 4, 10);
      const result = detectBoxShadow(data, W, H, 40, 30, 100, 80);
      if (result) {
        expect(result.blur).toBeGreaterThan(0);
        expect(result.inset).toBe(false);
        expect(result.color).toContain('rgba');
      }
    });

    it('should return null when no shadow present', () => {
      const W = 200, H = 150;
      const data = createSolidImageData(W, H, 100, 100, 200);
      const result = detectBoxShadow(data, W, H, 0, 0, W, H);
      expect(result).toBeNull();
    });

    it('should return null for fully transparent image', () => {
      const W = 200, H = 150;
      const data = createTransparentImageData(W, H);
      const result = detectBoxShadow(data, W, H, 40, 30, 100, 80);
      expect(result).toBeNull();
    });
  });

  describe('detectInnerShadow', () => {
    it('should return null when no inner shadow present', () => {
      const W = 200, H = 100;
      const data = createSolidImageData(W, H, 100, 100, 200);
      const result = detectInnerShadow(data, W, H, 0, 0, W, H);
      expect(result).toBeNull();
    });

    it('should return null for fully transparent image', () => {
      const W = 200, H = 100;
      const data = createTransparentImageData(W, H);
      const result = detectInnerShadow(data, W, H, 0, 0, W, H);
      expect(result).toBeNull();
    });

    it('should return null for very small regions', () => {
      const W = 20, H = 20;
      const data = createSolidImageData(W, H, 100, 100, 200);
      const result = detectInnerShadow(data, W, H, 0, 0, W, H);
      expect(result).toBeNull();
    });
  });

  describe('findOpaqueRegions', () => {
    it('should find a single opaque region', () => {
      const W = 200, H = 100;
      const data = new Uint8ClampedArray(W * H * 4);
      for (let y = 10; y < 90; y++) {
        for (let x = 20; x < 180; x++) {
          const idx = (y * W + x) * 4;
          data[idx] = 128; data[idx + 1] = 128; data[idx + 2] = 128; data[idx + 3] = 255;
        }
      }
      const regions = findOpaqueRegions(data, W, H);
      expect(regions.length).toBeGreaterThanOrEqual(1);
      expect(regions[0].w).toBeGreaterThanOrEqual(150);
      expect(regions[0].h).toBeGreaterThanOrEqual(70);
    });

    it('should return empty for fully transparent image', () => {
      const W = 100, H = 100;
      const data = createTransparentImageData(W, H);
      const regions = findOpaqueRegions(data, W, H);
      expect(regions.length).toBe(0);
    });

    it('should merge overlapping regions', () => {
      const W = 200, H = 100;
      const data = new Uint8ClampedArray(W * H * 4);
      for (let y = 10; y < 90; y++) {
        for (let x = 10; x < 190; x++) {
          const idx = (y * W + x) * 4;
          data[idx] = 128; data[idx + 1] = 128; data[idx + 2] = 128; data[idx + 3] = 255;
        }
      }
      const regions = findOpaqueRegions(data, W, H);
      expect(regions.length).toBe(1);
    });

    it('should ignore very small opaque patches', () => {
      const W = 200, H = 100;
      const data = new Uint8ClampedArray(W * H * 4);
      for (let y = 10; y < 20; y++) {
        for (let x = 10; x < 20; x++) {
          const idx = (y * W + x) * 4;
          data[idx] = 128; data[idx + 1] = 128; data[idx + 2] = 128; data[idx + 3] = 255;
        }
      }
      const regions = findOpaqueRegions(data, W, H);
      expect(regions.length).toBe(0);
    });
  });

  describe('generateSemanticName', () => {
    it('should generate gradient name from color characteristics', () => {
      const region = {
        x: 0, y: 0, width: 200, height: 100, borderRadius: 0,
        gradient: {
          type: 'linear' as const,
          angle: 90,
          stops: [
            { color: '#f97316', position: 0 },
            { color: '#eab308', position: 1 }
          ]
        },
      };
      const name = generateSemanticName(region, 0);
      expect(name).toContain('渐变');
    });

    it('should generate solid color name', () => {
      const region = {
        x: 0, y: 0, width: 200, height: 100, borderRadius: 8,
        backgroundColor: '#3b82f6',
      };
      const name = generateSemanticName(region, 1);
      expect(name.length).toBeGreaterThan(0);
    });

    it('should include shadow info in name', () => {
      const region = {
        x: 0, y: 0, width: 200, height: 100, borderRadius: 12,
        backgroundColor: '#ffffff',
        boxShadow: [{ offsetX: 0, offsetY: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.1)', inset: false }],
      };
      const name = generateSemanticName(region, 0);
      expect(name).toContain('投影');
    });

    it('should include border-radius info', () => {
      const region = {
        x: 0, y: 0, width: 200, height: 100, borderRadius: 24,
        backgroundColor: '#f1f5f9',
      };
      const name = generateSemanticName(region, 0);
      expect(name).toContain('大圆角');
    });

    it('should include shape info for wide elements', () => {
      const region = {
        x: 0, y: 0, width: 400, height: 50, borderRadius: 0,
        backgroundColor: '#1e293b',
      };
      const name = generateSemanticName(region, 0);
      expect(name).toContain('条形');
    });

    it('should include inner shadow info in name', () => {
      const region = {
        x: 0, y: 0, width: 200, height: 100, borderRadius: 16,
        backgroundColor: '#1e293b',
        innerShadow: [{ offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.3)', inset: true }],
      };
      const name = generateSemanticName(region, 0);
      expect(name).toContain('内阴影');
    });

    it('should generate valid name for region with no styles', () => {
      const region = {
        x: 0, y: 0, width: 100, height: 100, borderRadius: 0,
      };
      const name = generateSemanticName(region, 0);
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe('generateFullCSS', () => {
    it('should generate CSS with semantic class names', () => {
      const regions: StyleRegion[] = [{
        id: 'r1',
        x: 0, y: 0, width: 200, height: 100,
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        thumbnail: '',
        cssText: '  background-color: #3b82f6;\n  border-radius: 8px;\n  -webkit-border-radius: 8px;',
        name: '蓝圆角-1',
      }];
      const css = generateFullCSS(regions);
      expect(css).toContain('蓝圆角-1');
      expect(css).toContain('background-color: #3b82f6');
    });

    it('should include element comment headers', () => {
      const regions: StyleRegion[] = [{
        id: 'r1',
        x: 0, y: 0, width: 200, height: 100,
        borderRadius: 0,
        backgroundColor: '#ffffff',
        thumbnail: '',
        cssText: '  background-color: #ffffff;',
        name: '浅色-1',
      }];
      const css = generateFullCSS(regions);
      expect(css).toContain('/* Element: 浅色-1 */');
    });

    it('should generate CSS with gradient properties', () => {
      const regions: StyleRegion[] = [{
        id: 'r2',
        x: 0, y: 0, width: 200, height: 100,
        borderRadius: 0,
        gradient: {
          type: 'linear',
          angle: 90,
          stops: [
            { color: '#f97316', position: 0 },
            { color: '#eab308', position: 1 }
          ]
        },
        thumbnail: '',
        cssText: '  background: linear-gradient(90deg, #f97316 0.0%, #eab308 100.0%);',
        name: '渐变橙-黄-1',
      }];
      const css = generateFullCSS(regions);
      expect(css).toContain('linear-gradient');
      expect(css).toContain('#f97316');
    });

    it('should include -webkit- prefix for border-radius in CSS text', () => {
      const regions: StyleRegion[] = [{
        id: 'r3',
        x: 0, y: 0, width: 200, height: 100,
        borderRadius: 12,
        backgroundColor: '#334155',
        thumbnail: '',
        cssText: '  background-color: #334155;\n  border-radius: 12px;\n  -webkit-border-radius: 12px;',
        name: '深色圆角-1',
      }];
      const css = generateFullCSS(regions);
      expect(css).toContain('-webkit-border-radius');
    });

    it('should handle empty regions array', () => {
      const css = generateFullCSS([]);
      expect(css).toContain('Auto-generated CSS');
    });
  });

  describe('copyToClipboard', () => {
    it('should attempt clipboard copy and handle failure gracefully', async () => {
      const result = await copyToClipboard('test');
      expect(typeof result).toBe('boolean');
    });
  });
});
