import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ColorBand } from './Prism';
import { SpectrumColor, SPECTRUM_COLORS, SPECTRUM_ORDER, audioManager } from '../utils/audio';

interface SpectrumProps {
  canvasWidth: number;
  canvasHeight: number;
  colorBands: ColorBand[];
}

interface BlockState {
  color: SpectrumColor;
  basePulsePhase: number;
  pulseSpeed: number;
  flashBoost: number;
  flashTarget: number;
}

const Spectrum: React.FC<SpectrumProps> = ({ canvasWidth, canvasHeight, colorBands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const blockStatesRef = useRef<Map<SpectrumColor, BlockState>>(new Map());
  const [, forceRender] = useState(0);

  const getScreenRect = useCallback(() => {
    return {
      x: canvasWidth * 0.62,
      y: canvasHeight * 0.08,
      w: canvasWidth * 0.32,
      h: canvasHeight * 0.84
    };
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    SPECTRUM_ORDER.forEach((color) => {
      if (!blockStatesRef.current.has(color)) {
        blockStatesRef.current.set(color, {
          color,
          basePulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: (Math.random() * 1 + 1) * (2 * Math.PI),
          flashBoost: 0,
          flashTarget: 0
        });
      }
    });
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const screen = getScreenRect();
    if (x < screen.x || x > screen.x + screen.w || y < screen.y || y > screen.y + screen.h) {
      return;
    }

    let bestColor: SpectrumColor | null = null;
    let bestDist = Infinity;

    colorBands.forEach((band) => {
      const midY = (band.endPoint1.y + band.endPoint2.y) / 2;
      const dist = Math.abs(midY - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestColor = band.color;
      }
    });

    if (bestColor && bestDist < canvasHeight * 0.08) {
      const state = blockStatesRef.current.get(bestColor);
      if (state) {
        state.flashBoost = 0.3;
        state.flashTarget = 0.3;
        audioManager.flashColor(bestColor, 0.35, 250);
        forceRender((n) => n + 1);
      }
    }
  }, [canvasWidth, canvasHeight, colorBands, getScreenRect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const screen = getScreenRect();

      blockStatesRef.current.forEach((state) => {
        state.basePulsePhase += state.pulseSpeed * dt;
        if (state.flashBoost > state.flashTarget) {
          state.flashBoost = Math.max(state.flashTarget, state.flashBoost - dt * 1.5);
        } else if (state.flashBoost < state.flashTarget) {
          state.flashBoost = Math.min(state.flashTarget, state.flashBoost + dt * 5);
        }
        if (state.flashTarget > 0 && state.flashBoost < 0.001) {
          state.flashTarget = 0;
        }
      });

      drawSpectrumBlocks(ctx, screen, colorBands, blockStatesRef.current, now / 1000);

      drawScreenOverlay(ctx, screen);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasWidth, canvasHeight, colorBands, getScreenRect]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="spectrum-canvas"
      onClick={handleClick}
    />
  );
};

function drawSpectrumBlocks(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number; w: number; h: number },
  bands: ColorBand[],
  states: Map<SpectrumColor, BlockState>,
  time: number
): void {
  if (bands.length === 0) return;

  ctx.save();

  const sortedBands = [...bands].sort((a, b) => {
    const midA = (a.endPoint1.y + a.endPoint2.y) / 2;
    const midB = (b.endPoint1.y + b.endPoint2.y) / 2;
    return midA - midB;
  });

  sortedBands.forEach((band, idx) => {
    const nextBand = sortedBands[idx + 1];
    const colorHex = SPECTRUM_COLORS[band.color];
    const state = states.get(band.color);

    const y1 = Math.max(screen.y, Math.min(screen.y + screen.h, band.endPoint1.y));
    const y2 = Math.max(screen.y, Math.min(screen.y + screen.h, band.endPoint2.y));
    const blockTop = Math.min(y1, y2);
    const blockBottom = Math.max(y1, y2);

    let adjustedTop = blockTop;
    let adjustedBottom = blockBottom;
    if (idx > 0) {
      const prevBand = sortedBands[idx - 1];
      const prevMid = (prevBand.endPoint1.y + prevBand.endPoint2.y) / 2;
      const curMid = (band.endPoint1.y + band.endPoint2.y) / 2;
      const boundary = (prevMid + curMid) / 2;
      adjustedTop = Math.max(blockTop, boundary);
    }
    if (nextBand) {
      const curMid = (band.endPoint1.y + band.endPoint2.y) / 2;
      const nextMid = (nextBand.endPoint1.y + nextBand.endPoint2.y) / 2;
      const boundary = (curMid + nextMid) / 2;
      adjustedBottom = Math.min(blockBottom, boundary);
    }

    adjustedTop += 0.5;
    adjustedBottom -= 0.5;

    if (adjustedBottom - adjustedTop < 2) return;

    const centerY = (adjustedTop + adjustedBottom) / 2;
    const pulseIntensity = state ? 0.08 * (0.5 + 0.5 * Math.sin(state.basePulsePhase)) : 0.04;
    const flashBoost = state ? state.flashBoost : 0;

    const baseBrightness = 1 + pulseIntensity + flashBoost;

    const blockGrad = ctx.createLinearGradient(
      screen.x, adjustedTop,
      screen.x + screen.w, adjustedTop
    );
    blockGrad.addColorStop(0, shadeColor(colorHex, -20, 0.15));
    blockGrad.addColorStop(0.3, shadeColor(colorHex, 10, 0.45 * baseBrightness));
    blockGrad.addColorStop(0.5, shadeColor(colorHex, 25, 0.7 * baseBrightness));
    blockGrad.addColorStop(0.7, shadeColor(colorHex, 10, 0.45 * baseBrightness));
    blockGrad.addColorStop(1, shadeColor(colorHex, -20, 0.15));

    const blurRadius = 4;
    const blockH = adjustedBottom - adjustedTop;
    const expandedTop = Math.max(screen.y, adjustedTop - blurRadius);
    const expandedBottom = Math.min(screen.y + screen.h, adjustedBottom + blurRadius);

    for (let pass = 0; pass < 3; pass++) {
      const alpha = pass === 0 ? 0.15 : pass === 1 ? 0.3 : 0.55;
      const offset = pass === 0 ? blurRadius : pass === 1 ? blurRadius * 0.5 : 0;
      ctx.fillStyle = applyAlpha(shadeColor(colorHex, pass * 5, alpha * baseBrightness));
      ctx.fillRect(
        screen.x + 2,
        expandedTop + offset,
        screen.w - 4,
        expandedBottom - expandedTop - offset * 2
      );
    }

    ctx.fillStyle = blockGrad;
    ctx.fillRect(
      screen.x + 4,
      adjustedTop,
      screen.w - 8,
      blockH
    );

    const centerGrad = ctx.createRadialGradient(
      screen.x + screen.w * 0.5, centerY, 0,
      screen.x + screen.w * 0.5, centerY, blockH * 0.8
    );
    centerGrad.addColorStop(0, shadeColor(colorHex, 30, 0.25 * baseBrightness));
    centerGrad.addColorStop(0.5, shadeColor(colorHex, 15, 0.1 * baseBrightness));
    centerGrad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = centerGrad;
    ctx.fillRect(
      screen.x + 4,
      adjustedTop,
      screen.w - 8,
      blockH
    );

    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    ctx.fillRect(screen.x + 4, adjustedTop - 0.5, screen.w - 8, 1);
    ctx.fillRect(screen.x + 4, adjustedBottom - 0.5, screen.w - 8, 1);
  });

  ctx.restore();
  void time;
}

function drawScreenOverlay(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number; w: number; h: number }
): void {
  ctx.save();

  const vignette = ctx.createRadialGradient(
    screen.x + screen.w / 2, screen.y + screen.h / 2, Math.min(screen.w, screen.h) * 0.3,
    screen.x + screen.w / 2, screen.y + screen.h / 2, Math.max(screen.w, screen.h) * 0.7
  );
  vignette.addColorStop(0, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(screen.x, screen.y, screen.w, screen.h);

  const glassGrad = ctx.createLinearGradient(screen.x, screen.y, screen.x, screen.y + screen.h);
  glassGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
  glassGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  glassGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(screen.x, screen.y, screen.w, screen.h);

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeRect(screen.x + 1, screen.y + 1, screen.w - 2, screen.h - 2);

  ctx.restore();
}

function shadeColor(hex: string, percent: number, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const adjust = (c: number) => {
    if (percent >= 0) {
      return Math.round(c + (255 - c) * (percent / 100));
    } else {
      return Math.round(c * (1 + percent / 100));
    }
  };

  const nr = Math.max(0, Math.min(255, adjust(r)));
  const ng = Math.max(0, Math.min(255, adjust(g)));
  const nb = Math.max(0, Math.min(255, adjust(b)));
  const na = Math.max(0, Math.min(1, alpha));

  return `rgba(${nr}, ${ng}, ${nb}, ${na})`;
}

function applyAlpha(colorStr: string): string {
  return colorStr;
}

export default Spectrum;
