import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { CurveConfig, ColorPalette } from '../../shared/types.js';

interface ArtCanvasProps {
  curves: CurveConfig[];
  palette: ColorPalette;
  canvasWidth?: number;
  canvasHeight?: number;
  playing?: boolean;
}

export interface ArtCanvasHandle {
  getThumbnail: () => string;
  getCanvas: () => HTMLCanvasElement | null;
}

const ArtCanvas = forwardRef<ArtCanvasHandle, ArtCanvasProps>(function ArtCanvas(
  { curves, palette, canvasWidth = 800, canvasHeight = 600, playing = true },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const curveStatesRef = useRef<Array<{ currentPhase: number; currentRotation: number }>>([]);

  useImperativeHandle(ref, () => ({
    getThumbnail: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      const w = 360;
      const h = 270;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(canvas, 0, 0, w, h);
      }
      return offCanvas.toDataURL('image/png');
    },
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    curveStatesRef.current = curves.map(() => ({
      currentPhase: 0,
      currentRotation: 0,
    }));
  }, [curves]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    const hexToRgb = (hex: string) => {
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      return {
        r: parseInt(full.substring(0, 2), 16),
        g: parseInt(full.substring(2, 4), 16),
        b: parseInt(full.substring(4, 6), 16),
      };
    };

    const interpolateColorStops = (gradient: { color: string; position: number }[], t: number) => {
      if (gradient.length === 0) return 'rgba(255,255,255,1)';
      if (t <= gradient[0].position) return gradient[0].color;
      if (t >= gradient[gradient.length - 1].position) return gradient[gradient.length - 1].color;

      for (let i = 0; i < gradient.length - 1; i++) {
        const s1 = gradient[i];
        const s2 = gradient[i + 1];
        if (t >= s1.position && t <= s2.position) {
          const range = s2.position - s1.position || 1;
          const localT = (t - s1.position) / range;
          const c1 = hexToRgb(s1.color);
          const c2 = hexToRgb(s2.color);
          return `rgba(${Math.round(c1.r + (c2.r - c1.r) * localT)},${Math.round(c1.g + (c2.g - c1.g) * localT)},${Math.round(c1.b + (c2.b - c1.b) * localT)},`;
        }
      }
      return gradient[gradient.length - 1].color;
    };

    const glowRgb = hexToRgb(palette.glowColor);

    const draw = () => {
      if (!playing) return;

      timeRef.current += 1;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(6, 6, 12, 0.18)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.globalCompositeOperation = 'lighter';

      curves.forEach((curve, idx) => {
        const state = curveStatesRef.current[idx];
        if (!state) return;

        state.currentPhase += curve.speed;
        state.currentRotation += curve.rotationSpeed;

        const pts: Array<{ x: number; y: number }> = [];
        const steps = Math.max(40, Math.floor(curve.length / 8));
        const baseAngle = state.currentRotation;
        const dx = Math.cos(baseAngle);
        const dy = Math.sin(baseAngle);

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const progress = t * curve.length;
          const xAlong = curve.startX + dx * progress;
          const yAlong = curve.startY + dy * progress;

          const perpX = -dy;
          const perpY = dx;

          const wave =
            Math.sin(progress * curve.frequency + curve.phase + state.currentPhase) *
            curve.amplitude;

          pts.push({
            x: xAlong + perpX * wave,
            y: yAlong + perpY * wave,
          });
        }

        if (pts.length < 2) return;

        const segments = pts.length - 1;
        for (let s = 0; s < segments; s++) {
          const p0 = pts[Math.max(0, s - 1)];
          const p1 = pts[s];
          const p2 = pts[s + 1];
          const p3 = pts[Math.min(segments, s + 2)];

          const tStart = s / segments;
          const tEnd = (s + 1) / segments;

          for (let pass = 2; pass >= 0; pass--) {
            const alphaStart =
              (1 - tStart) * (pass === 0 ? 0.95 : pass === 1 ? 0.35 : 0.12);
            const alphaEnd = (1 - tEnd) * (pass === 0 ? 0.95 : pass === 1 ? 0.35 : 0.12);
            const widthMult = pass === 0 ? 1 : pass === 1 ? 3.2 : 6;

            const colPrefixStart = interpolateColorStops(palette.gradient, (tStart + curve.colorOffset) % 1);
            const colPrefixEnd = interpolateColorStops(palette.gradient, (tEnd + curve.colorOffset) % 1);

            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            gradient.addColorStop(0, colPrefixStart + alphaStart.toFixed(3) + ')');
            gradient.addColorStop(1, colPrefixEnd + alphaEnd.toFixed(3) + ')');

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            const cpx1 = p1.x + (p2.x - p0.x) / 6;
            const cpy1 = p1.y + (p2.y - p0.y) / 6;
            const cpx2 = p2.x - (p3.x - p1.x) / 6;
            const cpy2 = p2.y - (p3.y - p1.y) / 6;
            ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, p2.x, p2.y);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = curve.lineWidth * widthMult;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        }
      });

      ctx.globalCompositeOperation = 'source-over';

      const vignette = ctx.createRadialGradient(
        canvasWidth / 2,
        canvasHeight / 2,
        Math.min(canvasWidth, canvasHeight) * 0.35,
        canvasWidth / 2,
        canvasHeight / 2,
        Math.max(canvasWidth, canvasHeight) * 0.75
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const glowGrad = ctx.createRadialGradient(
        canvasWidth / 2,
        canvasHeight / 2,
        0,
        canvasWidth / 2,
        canvasHeight / 2,
        Math.max(canvasWidth, canvasHeight) * 0.5
      );
      glowGrad.addColorStop(0, `rgba(${glowRgb.r},${glowRgb.g},${glowRgb.b},0.035)`);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      animationRef.current = requestAnimationFrame(draw);
    };

    ctx.fillStyle = 'rgb(6, 6, 12)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (playing) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [curves, palette, canvasWidth, canvasHeight, playing]);

  useEffect(() => {
    if (palette?.primaryColor) {
      document.documentElement.style.setProperty('--emotion-primary', palette.primaryColor);
    }
    if (palette?.glowColor) {
      document.documentElement.style.setProperty('--emotion-glow', palette.glowColor);
    }
  }, [palette]);

  return <canvas ref={canvasRef} />;
});

ArtCanvas.displayName = 'ArtCanvas';

export default ArtCanvas;
