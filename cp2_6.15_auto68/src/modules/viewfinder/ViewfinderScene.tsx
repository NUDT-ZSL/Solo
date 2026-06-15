import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useSceneRenderer } from './useSceneRenderer';
import { useParamStore } from '../../store/paramStore';
import { saveSnapshot } from '../../api/mockApi';

export interface ViewfinderSceneHandle {
  capture: () => void;
}

const CANVAS_W = 900;
const CANVAS_H = 600;

interface Props {
  onShutterAnimating: (animating: boolean) => void;
}

const ViewfinderScene = forwardRef<ViewfinderSceneHandle, Props>(({ onShutterAnimating }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { blurRadius, sceneScale, cameraOffset, foregroundScale, backgroundScale, exposureMultiplier } = useSceneRenderer();
  const aperture = useParamStore((s) => s.aperture);
  const shutter = useParamStore((s) => s.shutter);
  const focalLength = useParamStore((s) => s.focalLength);
  const addSnapshot = useParamStore((s) => s.addSnapshot);
  const [flash, setFlash] = useState(false);
  const animRef = useRef<number>(0);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, applyBlur: boolean = false, applyExposure: boolean = true) => {
    const w = CANVAS_W;
    const h = CANVAS_H;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    skyGrad.addColorStop(0, '#2d3e50');
    skyGrad.addColorStop(0.5, '#6b8da3');
    skyGrad.addColorStop(1, '#c9b896');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.65);

    const groundGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    groundGrad.addColorStop(0, '#8b8264');
    groundGrad.addColorStop(1, '#4a4636');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    ctx.save();
    ctx.translate(w / 2 + cameraOffset.x, h * 0.62 + cameraOffset.y);

    const bgCX = 0;
    const bgCY = 0;
    const baseY = 0;
    const buildingColors = ['#a0a0a0', '#c0c0c0', '#e0e0e0'];
    const buildingHeights = [180, 140, 100];
    const buildingWidths = [92, 112, 82];
    const buildingOffsets = [-180, 25, 210];

    for (let i = 0; i < 3; i++) {
      ctx.save();
      const localScale = backgroundScale;
      ctx.translate(bgCX + buildingOffsets[i] * localScale, bgCY);
      const bw = buildingWidths[i] * localScale;
      const bh = buildingHeights[i] * localScale;
      const bx = -bw / 2;
      const by = baseY - bh;

      const bGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
      bGrad.addColorStop(0, shadeColor(buildingColors[i], -18));
      bGrad.addColorStop(0.5, buildingColors[i]);
      bGrad.addColorStop(1, shadeColor(buildingColors[i], -28));
      ctx.fillStyle = bGrad;
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = 'rgba(30, 40, 60, 0.55)';
      const winRows = Math.max(2, Math.floor(bh / 32));
      const winCols = Math.max(2, Math.floor(bw / 28));
      const winW = (bw * 0.6) / winCols;
      const winH = (bh * 0.7) / winRows;
      const startX = bx + bw * 0.2;
      const startY = by + bh * 0.15;
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          ctx.fillRect(startX + c * (winW + 4), startY + r * (winH + 6), winW, winH);
        }
      }

      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(bx, baseY - 4, bw, 4);
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(w / 2 + cameraOffset.x, h * 0.78 + cameraOffset.y);

    const s = foregroundScale * sceneScale;

    ctx.save();
    ctx.translate(-120 * s, 0);
    drawVase(ctx, 44 * s, 90 * s);
    ctx.restore();

    ctx.save();
    ctx.translate(110 * s, -10 * s);
    drawCactus(ctx, 58 * s);
    ctx.restore();

    ctx.restore();
    ctx.restore();

    if (applyBlur && blurRadius > 0.3) {
      const imageData = ctx.getImageData(0, 0, w, h);
      const blurred = boxBlur(imageData, Math.ceil(blurRadius));
      ctx.putImageData(blurred, 0, 0);
    }

    if (applyExposure && exposureMultiplier !== 1) {
      applyExposureAdjustment(ctx, w, h, exposureMultiplier);
    }

    addVignette(ctx, w, h);
  }, [blurRadius, sceneScale, cameraOffset, foregroundScale, backgroundScale, exposureMultiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawScene(ctx, true, true);
  }, [drawScene]);

  const doCapture = useCallback(async () => {
    setFlash(true);
    onShutterAnimating(true);
    setTimeout(() => setFlash(false), 160);
    setTimeout(() => onShutterAnimating(false), 200);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = CANVAS_W;
    offCanvas.height = CANVAS_H;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;
    drawScene(offCtx, true, true);

    try {
      const imageData = offCanvas.toDataURL('image/jpeg', 0.88);
      const snapshot = {
        id: generateId(),
        imageData,
        aperture,
        shutter,
        focalLength,
        timestamp: Date.now(),
      };
      addSnapshot(snapshot);
      await saveSnapshot(snapshot);
    } catch (e) {
      console.error('Capture failed:', e);
    }
  }, [drawScene, aperture, shutter, focalLength, addSnapshot, onShutterAnimating]);

  useImperativeHandle(ref, () => ({
    capture: doCapture,
  }), [doCapture]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.maskTop} />
      <div style={styles.maskBottom} />
      <div style={styles.maskLeft} />
      <div style={styles.maskRight} />

      <div style={styles.viewFrame}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={styles.canvas}
        />
        {flash && <div style={styles.flashOverlay} className="shutter-flash" />}

        <svg style={styles.frameLines} viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points="2,2 2,14" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <polyline points="2,2 14,2" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <polyline points="98,2 98,14" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <polyline points="98,2 86,2" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <polyline points="2,98 2,86" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <polyline points="2,98 14,98" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <polyline points="98,98 98,86" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <polyline points="98,98 86,98" stroke="#ffd700" strokeWidth="0.4" fill="none" opacity="0.8" />
          <line x1="45" y1="50" x2="55" y2="50" stroke="#ffd700" strokeWidth="0.18" opacity="0.5" />
          <line x1="50" y1="45" x2="50" y2="55" stroke="#ffd700" strokeWidth="0.18" opacity="0.5" />
        </svg>

        <div style={styles.hudTopLeft}>
          <span style={styles.hudText}>F/{aperture.toFixed(1)}</span>
          <span style={styles.hudText}>{shutter}</span>
          <span style={styles.hudText}>{focalLength}mm</span>
        </div>
        <div style={styles.hudBottomRight}>
          <span style={{ ...styles.hudDot, background: '#e53935' }} />
          <span style={styles.hudTextSmall}>LIVE</span>
        </div>
      </div>
    </div>
  );
});

ViewfinderScene.displayName = 'ViewfinderScene';

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: '3 / 2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '12%', background: '#0a0a0a', zIndex: 3 },
  maskBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%', background: '#0a0a0a', zIndex: 3 },
  maskLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '8%', background: '#0a0a0a', zIndex: 3 },
  maskRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '8%', background: '#0a0a0a', zIndex: 3 },
  viewFrame: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 60px rgba(0,0,0,0.55), 0 0 0 3px #1a1a1a, 0 0 0 6px #333',
    borderRadius: 4,
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
    transition: 'filter 0.2s ease-out',
  },
  flashOverlay: {
    position: 'absolute',
    inset: 0,
    background: '#ffffff',
    pointerEvents: 'none',
    zIndex: 5,
  },
  frameLines: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 4,
  },
  hudTopLeft: {
    position: 'absolute',
    top: '6%',
    left: '12%',
    display: 'flex',
    gap: 16,
    zIndex: 6,
  },
  hudText: {
    color: '#ffd700',
    fontFamily: "'Courier New', monospace",
    fontSize: 14,
    fontWeight: 700,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    letterSpacing: 1,
  },
  hudBottomRight: {
    position: 'absolute',
    bottom: '6%',
    right: '12%',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    zIndex: 6,
  },
  hudDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    animation: 'blink 1.2s infinite',
  },
  hudTextSmall: {
    color: '#e53935',
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    fontWeight: 700,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    letterSpacing: 1,
  },
};

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function drawVase(ctx: CanvasRenderingContext2D, radius: number, height: number) {
  const color = '#d4a373';
  const baseY = 0;
  const topY = baseY - height;

  const grad = ctx.createLinearGradient(-radius, 0, radius, 0);
  grad.addColorStop(0, shadeColor(color, -30));
  grad.addColorStop(0.35, shadeColor(color, 8));
  grad.addColorStop(0.65, color);
  grad.addColorStop(1, shadeColor(color, -40));
  ctx.fillStyle = grad;

  ctx.beginPath();
  const neckR = radius * 0.55;
  const bodyR = radius;
  const baseR = radius * 0.9;
  const neckH = height * 0.22;
  const shoulderH = height * 0.15;

  ctx.moveTo(-neckR, topY);
  ctx.quadraticCurveTo(-neckR * 1.2, topY + neckH * 0.4, -bodyR, topY + neckH + shoulderH);
  ctx.quadraticCurveTo(-bodyR * 1.05, baseY - height * 0.35, -baseR, baseY);
  ctx.lineTo(baseR, baseY);
  ctx.quadraticCurveTo(bodyR * 1.05, baseY - height * 0.35, bodyR, topY + neckH + shoulderH);
  ctx.quadraticCurveTo(neckR * 1.2, topY + neckH * 0.4, neckR, topY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shadeColor(color, -55);
  ctx.beginPath();
  ctx.ellipse(0, topY, neckR, neckR * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, baseY + 2, baseR * 1.1, baseR * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCactus(ctx: CanvasRenderingContext2D, size: number) {
  const color = '#6b8e23';
  const bodyW = size * 0.42;
  const bodyH = size;
  const baseY = 0;

  const grad = ctx.createLinearGradient(-bodyW / 2, 0, bodyW / 2, 0);
  grad.addColorStop(0, shadeColor(color, -28));
  grad.addColorStop(0.4, shadeColor(color, 10));
  grad.addColorStop(1, shadeColor(color, -38));
  ctx.fillStyle = grad;

  roundRect(ctx, -bodyW / 2, baseY - bodyH, bodyW, bodyH, bodyW * 0.45);
  ctx.fill();

  ctx.fillStyle = grad;
  const armW = size * 0.22;
  const armH = size * 0.45;
  roundRect(ctx, -bodyW / 2 - armW, baseY - bodyH * 0.65, armW, armH, armW * 0.45);
  ctx.fill();
  roundRect(ctx, -bodyW / 2 - armW, baseY - bodyH * 0.65 - armH * 0.35, armW * 0.9, armH * 0.35, armW * 0.4);
  ctx.fill();

  roundRect(ctx, bodyW / 2, baseY - bodyH * 0.5, armW, armH * 0.8, armW * 0.45);
  ctx.fill();
  roundRect(ctx, bodyW / 2, baseY - bodyH * 0.5 - armH * 0.3, armW * 0.9, armH * 0.3, armW * 0.4);
  ctx.fill();

  ctx.strokeStyle = shadeColor(color, -18);
  ctx.lineWidth = 0.8;
  for (let i = 1; i <= 3; i++) {
    const y = baseY - (bodyH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 + 4, y);
    ctx.lineTo(bodyW / 2 - 4, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, baseY + 2, size * 0.55, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function boxBlur(imageData: ImageData, radius: number): ImageData {
  if (radius < 1) return imageData;
  const { width: w, height: h, data } = imageData;
  const r = Math.min(radius, 20);
  const tmp = new Uint8ClampedArray(data);
  const out = new Uint8ClampedArray(data);

  for (let pass = 0; pass < 2; pass++) {
    const src = pass === 0 ? data : tmp;
    const dst = pass === 0 ? tmp : out;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        if (pass === 0) {
          for (let dx = -r; dx <= r; dx++) {
            const xx = Math.max(0, Math.min(w - 1, x + dx));
            const i = (y * w + xx) * 4;
            rSum += src[i]; gSum += src[i + 1]; bSum += src[i + 2]; count++;
          }
        } else {
          for (let dy = -r; dy <= r; dy++) {
            const yy = Math.max(0, Math.min(h - 1, y + dy));
            const i = (yy * w + x) * 4;
            rSum += src[i]; gSum += src[i + 1]; bSum += src[i + 2]; count++;
          }
        }
        const idx = (y * w + x) * 4;
        dst[idx] = rSum / count;
        dst[idx + 1] = gSum / count;
        dst[idx + 2] = bSum / count;
        dst[idx + 3] = 255;
      }
    }
  }
  return new ImageData(out, w, h);
}

function applyExposureAdjustment(ctx: CanvasRenderingContext2D, w: number, h: number, mult: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const m = mult;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * m);
    data[i + 1] = Math.min(255, data[i + 1] * m);
    data[i + 2] = Math.min(255, data[i + 2] * m);
  }
  ctx.putImageData(imageData, 0, 0);
}

function addVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export default ViewfinderScene;
