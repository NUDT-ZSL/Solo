import { useEffect, useRef, useMemo } from 'react';
import type { TreeNode, Member } from '../types.js';

interface BranchInfo {
  node: TreeNode;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tipX: number;
  tipY: number;
  level: number;
  completed: boolean;
  ratio: number;
  ratio2: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Props {
  tree: TreeNode[];
  members: Member[];
  highlightTaskId?: string | null;
  completedTaskIds?: Set<string>;
}

const COLOR_COMPLETED = '#10b981';
const COLOR_INPROG = '#fbbf24';
const COLOR_PENDING = '#94a3b8';

export default function GoalTree({ tree, members, highlightTaskId, completedTaskIds }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const branchesRef = useRef<BranchInfo[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const prevCompletedRef = useRef<Set<string>>(new Set());
  const dprRef = useRef(1);

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach((mem) => m.set(mem.userId, mem));
    return m;
  }, [members]);

  const triggerBurst = (x: number, y: number) => {
    for (let i = 0; i < 15; i++) {
      const angle = (-Math.PI * 0.9) + (Math.random() * Math.PI * 0.8);
      const speed = 40 + Math.random() * 70;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed + 40,
        vy: Math.sin(angle) * speed - 40,
        size: 4 + Math.random() * 4,
        life: 0,
        maxLife: 300,
        color: ['#10b981', '#34d399', '#6ee7b7', '#fde047', '#a7f3d0'][i % 5],
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const branches: BranchInfo[] = [];
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    const buildBranches = (
      nodes: TreeNode[],
      startX: number,
      startY: number,
      baseAngle: number,
      spread: number,
      length: number,
      level: number
    ) => {
      if (nodes.length === 0) return;
      const count = nodes.length;
      nodes.forEach((node, i) => {
        const idx = count === 1 ? 0 : (i / (count - 1) - 0.5);
        const angle = baseAngle + idx * spread;
        const lenScale = 0.82 + Math.random() * 0.15;
        const L = length * lenScale;
        const endX = startX + Math.cos(angle) * L;
        const endY = startY + Math.sin(angle) * L;
        const completed =
          node.task.status === 'completed';
        branches.push({
          node,
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          tipX: endX,
          tipY: endY,
          level,
          completed,
          ratio: node.completionRatio,
          ratio2:
            node.task.status === 'completed'
              ? 1
              : node.task.status === 'in-progress'
              ? 0.55
              : 0,
        });
        if (node.children.length > 0) {
          buildBranches(
            node.children,
            endX,
            endY,
            angle,
            spread * 0.75,
            length * 0.72,
            level + 1
          );
        }
      });
    };

    const trunkX = W * 0.14;
    const trunkY = H * 0.86;
    const trunkLen = Math.min(W, H) * 0.22;
    const trunkEndX = trunkX;
    const trunkEndY = trunkY - trunkLen;

    const rootCompleted =
      tree.length > 0 && tree.every((n) => n.task.status === 'completed');
    const avgRatio =
      tree.length === 0
        ? 0
        : tree.reduce((s, n) => s + n.completionRatio, 0) / tree.length;

    branches.push({
      node: {
      } as any,
      x1: trunkX,
      y1: trunkY,
      x2: trunkEndX,
      y2: trunkEndY,
      tipX: trunkEndX,
      tipY: trunkEndY,
      level: -1,
      completed: rootCompleted,
      ratio: avgRatio,
      ratio2: avgRatio,
    });

    buildBranches(tree, trunkEndX, trunkEndY, -Math.PI / 2, Math.PI * 0.7, trunkLen * 0.72, 0);
    branchesRef.current = branches;

    const newCompleted = new Set<string>();
    branches.forEach((b) => {
      if (b.node.task && b.node.task._id && b.completed) {
        newCompleted.add(b.node.task._id);
        if (!prevCompletedRef.current.has(b.node.task._id)) {
          triggerBurst(b.tipX, b.tipY);
        }
      }
    });
    prevCompletedRef.current = newCompleted;
  }, [tree]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let lastT = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(40, now - lastT);
      lastT = now;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const g = ctx.createRadialGradient(
        rect.width / 2,
        rect.height / 2,
        0,
        rect.width / 2,
        rect.height / 2,
        Math.max(rect.width, rect.height) / 1.2
      );
      g.addColorStop(0, 'rgba(255,255,255,0.03)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, rect.width, rect.height);

      const branchesRef.current.forEach((b) => {
        const thickness = Math.max(2, 9 - b.level * 2);

        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.lineWidth = thickness + 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.lineWidth = thickness;
        let baseColor = COLOR_PENDING;
        if (b.completed) baseColor = COLOR_COMPLETED;
        else if (b.ratio > 0) baseColor = COLOR_INPROG;
        ctx.strokeStyle = baseColor;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (
          !b.completed &&
          b.ratio > 0 &&
          b.ratio < 1 &&
          b.level >= 0
        ) {
          const dx = b.x2 - b.x1;
          const dy = b.y2 - b.y1;
          const gx = b.x1 + dx * b.ratio;
          const gy = b.y1 + dy * b.ratio;
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(gx, gy);
          ctx.lineWidth = thickness;
          ctx.strokeStyle = COLOR_COMPLETED;
          ctx.globalAlpha = 0.85;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        if (b.level >= 0) {
          const tipX = b.tipX;
          const tipY = b.tipY;
          if (b.completed) {
            const rg = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 18);
            rg.addColorStop(0, 'rgba(16,185,129,0.35)');
            rg.addColorStop(1, 'rgba(16,185,129,0)');
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 18, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(
            tipX,
            tipY,
            b.completed ? 6 : b.ratio > 0 ? 4.5 : 3.5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = b.completed
            ? COLOR_COMPLETED
            : b.ratio > 0
            ? COLOR_INPROG
            : '#cbd5e1';
          ctx.fill();

          const uid = b.node.task?.userId;
          if (uid && memberMap.has(uid)) {
            const mem = memberMap.get(uid)!;
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(tipX + 14, tipY - 10, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(tipX + 14, tipY - 10, 8.5, 0, Math.PI * 2);
            ctx.fillStyle =
              '#' +
              (mem.name
                .split('')
                .reduce((acc, c) => acc + c.charCodeAt(0).toString(16), '')
                .padEnd(6, 'f')
                .slice(0, 6);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mem.name[0], tipX + 14, tipY - 10);
            ctx.restore();
          }
        }
      });

      if (highlightTaskId) {
        const found = branchesRef.current.find(
          (b) => b.node.task?._id === highlightTaskId
        );
        if (found) {
          ctx.save();
          ctx.strokeStyle = 'rgba(99,102,241)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(found.tipX, found.tipY, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (particlesRef.current.length > 0) {
        const remaining: Particle[] = [];
        particlesRef.current.forEach((p) => {
          p.life += dt;
          const t = Math.min(1, p.life / p.maxLife);
          p.x += (p.vx * dt) / 1000;
          p.y += (p.vy * dt) / 1000;
          p.vx *= 1 - dt / 800;
          p.vy = p.vy + (120 * dt) / 1000;
          ctx.save();
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (t < 1) remaining.push(p);
        });
        particlesRef.current = remaining;
      }

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [memberMap, highlightTaskId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
