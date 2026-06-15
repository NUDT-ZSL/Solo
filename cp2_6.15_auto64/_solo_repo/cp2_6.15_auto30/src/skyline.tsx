import { useRef, useEffect } from 'react';
import { useVoxelStore } from './store';

interface WindowLight {
  x: number;
  y: number;
  phase: number;
  period: number;
}

export function SkylinePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightsRef = useRef<WindowLight[]>([]);
  const animationRef = useRef<number>(0);
  const lastVoxelCount = useRef<number>(0);

  const voxels = useVoxelStore((state) => state.voxels);
  const isDay = useVoxelStore((state) => state.isDay);

  const width = 200;
  const height = 300;

  useEffect(() => {
    if (voxels.length !== lastVoxelCount.current) {
      lastVoxelCount.current = voxels.length;
      generateLights();
    }
  }, [voxels.length]);

  const generateLights = () => {
    const lights: WindowLight[] = [];
    const numLights = Math.min(voxels.length * 2, 100);

    for (let i = 0; i < numLights; i++) {
      lights.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.7) + height * 0.1,
        phase: Math.random() * Math.PI * 2,
        period: 0.5 + Math.random() * 1,
      });
    }

    lightsRef.current = lights;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      const heightMap: Map<number, number> = new Map();
      voxels.forEach((v) => {
        const key = v.x;
        const currentHeight = heightMap.get(key) || 0;
        const voxelTop = v.y + 1;
        if (voxelTop > currentHeight) {
          heightMap.set(key, voxelTop);
        }
      });

      const gridSize = 10;
      const padding = 10;
      const plotWidth = width - padding * 2;
      const plotHeight = height - padding * 3;
      const maxHeight = Math.max(...Array.from(heightMap.values()), 1);
      const colWidth = plotWidth / gridSize;

      const points: { x: number; y: number }[] = [];

      for (let x = 0; x < gridSize; x++) {
        const h = heightMap.get(x) || 0;
        const normalizedH = (h / Math.max(maxHeight, 5)) * plotHeight;
        const px = padding + x * colWidth + colWidth / 2;
        const py = height - padding - normalizedH;
        points.push({ x: px, y: py });
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);

      points.forEach((p, i) => {
        if (i === 0) {
          ctx.lineTo(p.x, p.y);
        } else {
          const prev = points[i - 1];
          const cpx = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
        }
      });

      ctx.lineTo(width - padding, height - padding);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(68, 136, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(68, 136, 255, 0.4)');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      points.forEach((p, i) => {
        if (i > 0) {
          const prev = points[i - 1];
          const cpx = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
        }
      });

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      if (!isDay) {
        lightsRef.current.forEach((light) => {
          const t = (time / 1000) * (2 * Math.PI) / light.period + light.phase;
          const brightness = (Math.sin(t) + 1) / 2;
          const alpha = 0.3 + brightness * 0.7;

          ctx.beginPath();
          ctx.arc(light.x, light.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(light.x, light.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 220, 100, ${alpha * 0.3})`;
          ctx.fill();
        });
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [voxels, isDay, width, height]);

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-semibold text-gray-300 tracking-wide">
        天际线预览
      </h3>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg shadow-lg"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}
