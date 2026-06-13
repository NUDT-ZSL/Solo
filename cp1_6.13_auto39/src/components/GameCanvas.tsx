import { useRef, useEffect, useCallback } from 'react';
import {
  HexCoord,
  HEX_RADIUS,
  hexToPixel,
  pixelToHex,
  hexKey,
  TerrainMap,
} from '@/utils/hexagonMath';
import { Unit, RACE_STATS, RaceType } from '@/utils/battleLogic';

const SQRT3 = Math.sqrt(3);
const CANVAS_W = 1000;
const CANVAS_H = 800;
const BG_COLOR = '#1e293b';
const GRID_COLOR = '#334155';

const TERRAIN_COLORS: Record<string, string> = {
  plain: '#a3e635',
  forest: '#16a34a',
  mountain: '#6b7280',
  river: '#38bdf8',
};

export type EditorMode = 'edit' | 'preview' | 'battle';

interface GameCanvasProps {
  terrains: TerrainMap;
  units: Unit[];
  mode: EditorMode;
  selectedHex: HexCoord | null;
  pulseHexes: Set<string>;
  onHexClick?: (coord: HexCoord) => void;
  onHexDrop?: (coord: HexCoord, dragData: string) => void;
  onHexSelect?: (coord: HexCoord) => void;
}

export default function GameCanvas({
  terrains,
  units,
  mode,
  selectedHex,
  pulseHexes,
  onHexClick,
  onHexDrop,
  onHexSelect,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const riverOffsetRef = useRef<number>(0);
  const dragOverCoordRef = useRef<HexCoord | null>(null);
  const previewOffsetRef = useRef({ x: 0, y: 0 });
  const previewScaleRef = useRef(1);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const getVisibleHexes = useCallback((): HexCoord[] => {
    const hexes: HexCoord[] = [];
    const margin = HEX_RADIUS * 2;
    for (let py = -margin; py < CANVAS_H + margin; py += HEX_RADIUS * 1.5) {
      for (let px = -margin; px < CANVAS_W + margin; px += SQRT3 * HEX_RADIUS) {
        const coord = pixelToHex(px, py);
        const pixel = hexToPixel(coord);
        if (
          pixel.x >= -HEX_RADIUS &&
          pixel.x <= CANVAS_W + HEX_RADIUS &&
          pixel.y >= -HEX_RADIUS &&
          pixel.y <= CANVAS_H + HEX_RADIUS
        ) {
          hexes.push(coord);
        }
      }
    }
    return hexes;
  }, []);

  const drawHexPath = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30);
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    },
    []
  );

  const drawTerrainPattern = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, type: string, riverOffset: number) => {
      const r = HEX_RADIUS * 0.65;
      switch (type) {
        case 'forest': {
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.moveTo(cx, cy - r * 0.7);
          ctx.lineTo(cx - r * 0.5, cy + r * 0.2);
          ctx.lineTo(cx + r * 0.5, cy + r * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.moveTo(cx, cy - r * 0.35);
          ctx.lineTo(cx - r * 0.4, cy + r * 0.4);
          ctx.lineTo(cx + r * 0.4, cy + r * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(cx - 2, cy + r * 0.4, 4, r * 0.3);
          break;
        }
        case 'mountain': {
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.moveTo(cx, cy - r * 0.8);
          ctx.lineTo(cx - r * 0.6, cy + r * 0.4);
          ctx.lineTo(cx + r * 0.6, cy + r * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#d1d5db';
          ctx.beginPath();
          ctx.moveTo(cx, cy - r * 0.8);
          ctx.lineTo(cx - r * 0.2, cy - r * 0.3);
          ctx.lineTo(cx + r * 0.2, cy - r * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#4b5563';
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.25, cy - r * 0.4);
          ctx.lineTo(cx + r * 0.65, cy + r * 0.4);
          ctx.lineTo(cx + r * 0.05, cy + r * 0.4);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'river': {
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const offsetY = (i - 1) * r * 0.35;
            const waveOffset = riverOffset + i * 17;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.6, cy + offsetY);
            ctx.quadraticCurveTo(
              cx - r * 0.15,
              cy + offsetY + Math.sin(waveOffset * 0.08) * 6,
              cx + r * 0.15,
              cy + offsetY
            );
            ctx.quadraticCurveTo(
              cx + r * 0.4,
              cy + offsetY + Math.cos(waveOffset * 0.1) * 5,
              cx + r * 0.6,
              cy + offsetY
            );
            ctx.stroke();
          }
          break;
        }
      }
    },
    []
  );

  const drawUnit = useCallback(
    (ctx: CanvasRenderingContext2D, unit: Unit, cx: number, cy: number) => {
      const stats = RACE_STATS[unit.race];
      const color = stats.color;
      const r = HEX_RADIUS * 0.32;

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = unit.race === 'human' ? '人' : unit.race === 'elf' ? '精' : '兽';
      ctx.fillText(label, cx, cy);

      if (unit.hp < unit.maxHp) {
        const barW = HEX_RADIUS * 0.6;
        const barH = 4;
        const barX = cx - barW / 2;
        const barY = cy + r + 4;
        ctx.fillStyle = '#374151';
        ctx.fillRect(barX, barY, barW, barH);
        const hpRatio = Math.max(0, unit.hp / unit.maxHp);
        ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
      }
    },
    []
  );

  const render = useCallback(
    (riverOffset: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      if (mode === 'preview') {
        ctx.save();
        ctx.translate(previewOffsetRef.current.x, previewOffsetRef.current.y);
        ctx.scale(previewScaleRef.current, previewScaleRef.current);
      }

      ctx.fillStyle = BG_COLOR;
      if (mode === 'preview') {
        ctx.fillRect(-2000, -2000, 6000, 6000);
      } else {
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      const hexes = getVisibleHexes();

      for (const hex of hexes) {
        const { x, y } = hexToPixel(hex);
        const key = hexKey(hex);
        const terrain = terrains[key];

        if (mode !== 'edit') {
          if (!terrain) continue;
        }

        if (mode === 'edit' || terrain) {
          drawHexPath(ctx, x, y, HEX_RADIUS - 1);
          if (terrain) {
            ctx.fillStyle = TERRAIN_COLORS[terrain.type] || BG_COLOR;
            ctx.fill();
            drawTerrainPattern(ctx, x, y, terrain.type, riverOffset);
          } else {
            ctx.fillStyle = 'rgba(30,41,59,0.5)';
            ctx.fill();
          }
          if (mode === 'edit') {
            ctx.strokeStyle = GRID_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        if (selectedHex && hex.q === selectedHex.q && hex.r === selectedHex.r) {
          drawHexPath(ctx, x, y, HEX_RADIUS - 1);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        if (pulseHexes.has(key)) {
          const pulseScale = 1 + 0.05 * Math.sin((Date.now() / 500) * Math.PI);
          drawHexPath(ctx, x, y, (HEX_RADIUS - 1) * pulseScale);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (dragOverCoordRef.current && hex.q === dragOverCoordRef.current.q && hex.r === dragOverCoordRef.current.r) {
          drawHexPath(ctx, x, y, HEX_RADIUS - 1);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      const unitMap = new Map<string, Unit>();
      for (const u of units) {
        unitMap.set(hexKey(u.coord), u);
      }
      for (const [key, unit] of unitMap) {
        const coord = { q: unit.coord.q, r: unit.coord.r };
        const { x, y } = hexToPixel(coord);
        drawUnit(ctx, unit, x, y);
      }

      if (mode === 'preview') {
        ctx.restore();
      }
    },
    [terrains, units, mode, selectedHex, pulseHexes, getVisibleHexes, drawHexPath, drawTerrainPattern, drawUnit]
  );

  useEffect(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
      offscreenRef.current.width = CANVAS_W;
      offscreenRef.current.height = CANVAS_H;
    }
  }, []);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      riverOffsetRef.current += 0.5;
      render(riverOffsetRef.current);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  const getCanvasCoord = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): HexCoord | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      return pixelToHex(px, py);
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coord = getCanvasCoord(e);
      if (coord) {
        onHexClick?.(coord);
        onHexSelect?.(coord);
      }
    },
    [getCanvasCoord, onHexClick, onHexSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      dragOverCoordRef.current = pixelToHex(px, py);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    dragOverCoordRef.current = null;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      dragOverCoordRef.current = null;
      const dragData = e.dataTransfer.getData('text/plain');
      const coord = getCanvasCoord(e as any);
      if (coord && dragData) {
        onHexDrop?.(coord, dragData);
      }
    },
    [getCanvasCoord, onHexDrop]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'preview') return;
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [mode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || mode !== 'preview') return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      previewOffsetRef.current.x += dx;
      previewOffsetRef.current.y += dy;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [mode]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (mode !== 'preview') return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      previewScaleRef.current = Math.max(0.3, Math.min(3, previewScaleRef.current * delta));
    },
    [mode]
  );

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="block w-full h-full"
      style={{ imageRendering: 'auto' }}
      onClick={handleClick}
      onDragOver={mode === 'edit' ? handleDragOver : undefined}
      onDragLeave={mode === 'edit' ? handleDragLeave : undefined}
      onDrop={mode === 'edit' ? handleDrop : undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
