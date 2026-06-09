import { useEffect, useRef, useCallback } from 'react';
import { TreeStructure } from '../types';
import { easeInOut } from '../utils/treeGenerator';

interface TreeCanvasProps {
  tree: TreeStructure | null;
  animate?: boolean;
  size?: number;
  onAnimationEnd?: () => void;
  animationKey?: number;
}

export default function TreeCanvas({
  tree,
  animate = false,
  size = 400,
  onAnimationEnd,
  animationKey = 0,
}: TreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const animatingRef = useRef(false);

  const scale = size / 400;

  const draw = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !tree) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size * 0.7
      );
      grad.addColorStop(0, '#1A1A3E');
      grad.addColorStop(1, '#0A0A14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const sortedBranches = [...tree.branches].sort((a, b) => a.depth - b.depth);
      const maxDepth = 5;
      const leavesStartProgress = 0.6;

      sortedBranches.forEach((branch) => {
        const branchProgress = progress * (maxDepth + 1) - branch.depth;
        if (branchProgress <= 0) return;
        const t = easeInOut(Math.min(1, branchProgress));

        const sx = branch.startX * scale;
        const sy = branch.startY * scale;
        const ex = sx + (branch.endX - branch.startX) * scale * t;
        const ey = sy + (branch.endY - branch.startY) * scale * t;

        const trunkGrad = ctx.createLinearGradient(sx, sy, ex, ey);
        trunkGrad.addColorStop(0, '#8B6F47');
        trunkGrad.addColorStop(1, '#5C4A2E');

        ctx.beginPath();
        ctx.strokeStyle = trunkGrad;
        ctx.lineWidth = branch.thickness * scale;
        ctx.lineCap = 'round';
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      });

      if (progress > leavesStartProgress) {
        const leafProgress = (progress - leavesStartProgress) / (1 - leavesStartProgress);
        const leafT = easeInOut(Math.min(1, leafProgress));
        const visibleCount = Math.floor(tree.leaves.length * leafT);

        for (let i = 0; i < visibleCount; i++) {
          const leaf = tree.leaves[i];
          if (!leaf) continue;
          const lx = leaf.x * scale;
          const ly = leaf.y * scale;
          const r = leaf.radius * scale * (0.5 + 0.5 * leafT);

          ctx.beginPath();
          ctx.fillStyle = leaf.color;
          ctx.arc(lx, ly, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 0.5;
          ctx.arc(lx, ly, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
    [tree, size, scale]
  );

  useEffect(() => {
    if (!tree) {
      draw(1);
      return;
    }

    if (!animate) {
      draw(1);
      return;
    }

    if (animatingRef.current && rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    animatingRef.current = true;
    startTimeRef.current = performance.now();
    const duration = 2000;

    const tick = (now: number) => {
      const elapsed = now - (startTimeRef.current || 0);
      const t = Math.min(1, elapsed / duration);
      draw(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        animatingRef.current = false;
        onAnimationEnd?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tree, animate, animationKey, draw, onAnimationEnd]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="tree-canvas"
      style={{ width: size, height: size }}
    />
  );
}
