import { useCallback, useState } from 'react';

const GRID_W = 128;
const GRID_H = 128;
const MAX_UNDO = 20;

function createFlatHeights(): Float32Array {
  return new Float32Array(GRID_W * GRID_H);
}

function cloneHeights(h: Float32Array): Float32Array {
  return new Float32Array(h);
}

export function useTerrainState(gridW: number, gridH: number) {
  const [heights, setHeights] = useState<Float32Array>(() => createFlatHeights());
  const undoStackRef = useState<Float32Array[]>([])[0];
  const [, forceUpdate] = useState(0);

  const pushUndo = useCallback((current: Float32Array) => {
    undoStackRef.push(cloneHeights(current));
    if (undoStackRef.length > MAX_UNDO) {
      undoStackRef.shift();
    }
  }, [undoStackRef]);

  const modifyHeight = useCallback(
    (centerX: number, centerY: number, radius: number, deltaHeight: number) => {
      setHeights((prev) => {
        pushUndo(prev);
        const next = cloneHeights(prev);
        const cx = Math.floor(centerX * (GRID_W - 1));
        const cy = Math.floor(centerY * (GRID_H - 1));
        const r = Math.max(1, Math.floor(radius * GRID_W));
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const gx = cx + dx;
            const gy = cy + dy;
            if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) continue;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > r) continue;
            const falloff = 1 - dist / r;
            const idx = gy * GRID_W + gx;
            next[idx] = Math.min(1, Math.max(0, next[idx] + deltaHeight * falloff * falloff));
          }
        }
        return next;
      });
    },
    [pushUndo]
  );

  const smoothTerrain = useCallback(() => {
    setHeights((prev) => {
      const next = cloneHeights(prev);
      for (let y = 1; y < GRID_H - 1; y++) {
        for (let x = 1; x < GRID_W - 1; x++) {
          const idx = y * GRID_W + x;
          next[idx] =
            (prev[idx - 1] + prev[idx + 1] + prev[idx - GRID_W] + prev[idx + GRID_W] + prev[idx]) /
            5;
        }
      }
      return next;
    });
  }, []);

  const undoLast = useCallback(() => {
    if (undoStackRef.length === 0) return;
    const last = undoStackRef.pop()!;
    setHeights(last);
    forceUpdate((n) => n + 1);
  }, [undoStackRef]);

  const resetTerrain = useCallback(() => {
    pushUndo(heights);
    setHeights(createFlatHeights());
  }, [heights, pushUndo]);

  const exportHeightMap = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const sx = Math.floor((x / 256) * GRID_W);
        const sy = Math.floor((y / 256) * GRID_H);
        const val = Math.floor(heights[sy * GRID_W + sx] * 255);
        const idx = (y * 256 + x) * 4;
        imgData.data[idx] = val;
        imgData.data[idx + 1] = val;
        imgData.data[idx + 2] = val;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `${ts}_heightmap.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [heights]);

  return {
    heights,
    modifyHeight,
    smoothTerrain,
    undoLast,
    resetTerrain,
    exportHeightMap,
  };
}
