import { useEffect, useRef, useState, useCallback } from 'react';
import type { NetworkNode, NetworkLink, NetworkData } from '../types';

interface NetworkGraphProps {
  data: NetworkData;
  onNodeClick: (id: string) => void;
  deletedIds?: Set<string>;
}

interface SimNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  width: number;
  height: number;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
  similarity: number;
  fadeOut?: boolean;
}

function getLinkColor(sim: number): string {
  const t = Math.min(1, Math.max(0, (sim - 0.3) / 0.7));
  const cool = { r: 96, g: 165, b: 250 };
  const warm = { r: 251, g: 146, b: 60 };
  const r = Math.round(cool.r + (warm.r - cool.r) * t);
  const g = Math.round(cool.g + (warm.g - cool.g) * t);
  const b = Math.round(cool.b + (warm.b - cool.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getLinkWidth(sim: number): number {
  const t = Math.min(1, Math.max(0, (sim - 0.3) / 0.7));
  return 1 + t * 3;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NetworkGraph({ data, onNodeClick, deletedIds = new Set() }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const [, forceRender] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: SimNode } | null>(null);
  const [dims, setDims] = useState({ w: 600, h: 500 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const draggingNodeRef = useRef<SimNode | null>(null);
  const panningRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const fadeOutLinksRef = useRef<Set<number>>(new Set());
  const [fadeOutLinks, setFadeOutLinks] = useState<Set<number>>(new Set());

  const simplify = data.nodes.length > 40;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const initSimulation = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    setDims({ w: W, h: H });

    const centerX = W / 2;
    const centerY = H / 2;

    const nodeMap = new Map<string, SimNode>();

    const simNodes: SimNode[] = data.nodes.map((n, i) => {
      const isCenter = n.isCenter;
      const angle = (i / Math.max(data.nodes.length, 1)) * Math.PI * 2;
      const radius = isCenter ? 0 : 120 + Math.random() * 80;
      const node: SimNode = {
        ...n,
        x: isCenter ? centerX : centerX + Math.cos(angle) * radius,
        y: isCenter ? centerY : centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: isCenter ? centerX : null,
        fy: isCenter ? centerY : null,
        width: isCenter ? 72 : 52,
        height: isCenter ? 72 : 52,
      };
      if (isCenter) {
        node.fx = centerX;
        node.fy = centerY;
      }
      nodeMap.set(n.id, node);
      return node;
    });

    const simLinks: SimLink[] = data.links
      .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map((l) => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        similarity: l.similarity,
      }));

    nodesRef.current = simNodes;
    linksRef.current = simLinks;
    fadeOutLinksRef.current = new Set();
    setFadeOutLinks(new Set());
    forceRender((n) => n + 1);
  }, [data]);

  useEffect(() => {
    initSimulation();
    const onResize = () => initSimulation();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [initSimulation]);

  useEffect(() => {
    if (deletedIds.size === 0) return;
    const newFade = new Set<number>();
    linksRef.current.forEach((l, i) => {
      if (deletedIds.has(l.source.id) || deletedIds.has(l.target.id)) {
        newFade.add(i);
      }
    });
    fadeOutLinksRef.current = newFade;
    setFadeOutLinks(newFade);
  }, [deletedIds]);

  useEffect(() => {
    let lastTime = performance.now();
    let fpsCounter = 0;
    let fpsTime = lastTime;

    const step = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 3);
      lastTime = time;

      fpsCounter++;
      if (time - fpsTime > 1000) fpsTime = time;

      const nodes = nodesRef.current;
      const links = linksRef.current;
      if (nodes.length === 0) {
        animRef.current = requestAnimationFrame(step);
        return;
      }

      const W = dims.w;
      const H = dims.h;
      const cx = W / 2;
      const cy = H / 2;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.fx !== null) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        let fx = 0;
        let fy = 0;

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 100) distSq = 100;
          const dist = Math.sqrt(distSq);
          const repulse = (simplify ? 2500 : 3500) / distSq;
          fx += (dx / dist) * repulse;
          fy += (dy / dist) * repulse;
        }

        const kCenter = simplify ? 0.004 : 0.006;
        fx += (cx - n.x) * kCenter;
        fy += (cy - n.y) * kCenter;

        const kBound = 0.03;
        if (n.x < 40) fx += (40 - n.x) * kBound;
        if (n.x > W - 40) fx += (W - 40 - n.x) * kBound;
        if (n.y < 40) fy += (40 - n.y) * kBound;
        if (n.y > H - 40) fy += (H - 40 - n.y) * kBound;

        n.vx = (n.vx + fx * dt) * 0.82;
        n.vy = (n.vy + fy * dt) * 0.82;
      }

      for (const link of links) {
        const s = link.source;
        const t = link.target;
        if (s.fx !== null && t.fx !== null) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = link.similarity > 0.7 ? 140 : link.similarity > 0.5 ? 180 : 230;
        const diff = (dist - ideal) * (simplify ? 0.04 : 0.06) * dt;
        const ax = (dx / dist) * diff;
        const ay = (dy / dist) * diff;
        if (s.fx === null) {
          s.vx += ax;
          s.vy += ay;
        }
        if (t.fx === null) {
          t.vx -= ax;
          t.vy -= ay;
        }
      }

      for (const n of nodes) {
        if (n.fx !== null) {
          n.x = n.fx;
          n.y = n.fy;
        } else {
          n.x += n.vx * dt;
          n.y += n.vy * dt;
        }
      }

      forceRender((n) => (n + 1) % 1000000);
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, simplify]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (clientX - rect.left - panRef.current.x) / zoomRef.current;
    const y = (clientY - rect.top - panRef.current.y) / zoomRef.current;
    return { x, y };
  }, []);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.min(3, Math.max(0.3, zoomRef.current * (1 + delta)));
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - panRef.current.x) / zoomRef.current;
    const wy = (my - panRef.current.y) / zoomRef.current;
    const nz = newZoom;
    const nx = mx - wx * nz;
    const ny = my - wy * nz;
    setZoom(nz);
    setPan({ x: nx, y: ny });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    const nodeG = target.closest('.network-node-group');
    if (nodeG) {
      const id = nodeG.getAttribute('data-id');
      const node = nodesRef.current.find((n) => n.id === id);
      if (node) {
        draggingNodeRef.current = node;
        if (node.fx === null) {
          node.fx = node.x;
          node.fy = node.y;
        }
        return;
      }
    }
    panningRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeRef.current) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      draggingNodeRef.current.fx = x;
      draggingNodeRef.current.fy = y;
      return;
    }
    if (panningRef.current) {
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      setPan({
        x: panningRef.current.panX + dx,
        y: panningRef.current.panY + dy,
      });
    }
  };

  const onMouseUp = () => {
    if (draggingNodeRef.current && !draggingNodeRef.current.isCenter) {
      draggingNodeRef.current.fx = null;
      draggingNodeRef.current.fy = null;
    }
    draggingNodeRef.current = null;
    panningRef.current = null;
  };

  const onNodeEnter = (e: React.MouseEvent, node: SimNode) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + 14,
      y: e.clientY - rect.top + 14,
      node,
    });
  };

  const onNodeLeave = () => setTooltip(null);

  const nodes = nodesRef.current;
  const links = linksRef.current;

  return (
    <div
      ref={containerRef}
      className="network-container"
      onWheel={onWheel}
    >
      <svg
        ref={svgRef}
        className="network-svg"
        width={dims.w}
        height={dims.h}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { onMouseUp(); onNodeLeave(); }}
      >
        <defs>
          {nodes.map((n) => (
            <clipPath key={n.id} id={`clip-${n.id}`}>
              <circle cx={n.width / 2} cy={n.height / 2} r={n.width / 2 - 1} />
            </clipPath>
          ))}
          <radialGradient id="center-glow">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="node-glow">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <g className="links-layer">
            {links.map((l, i) => {
              const opacity = l.similarity > 0.6 ? 0.85 : 0.45;
              const color = getLinkColor(l.similarity);
              const width = getLinkWidth(l.similarity);
              const isFading = fadeOutLinks.has(i);
              return (
                <line
                  key={`${l.source.id}-${l.target.id}-${i}`}
                  className={`link-line ${isFading ? 'fade-out' : ''}`}
                  x1={l.source.x}
                  y1={l.source.y}
                  x2={l.target.x}
                  y2={l.target.y}
                  stroke={color}
                  strokeWidth={width}
                  style={{ color, opacity: isFading ? opacity : opacity }}
                />
              );
            })}
          </g>
          <g className="nodes-layer">
            {nodes.map((n) => {
              const isFading = deletedIds.has(n.id);
              const r = n.width / 2;
              const glowR = r + 14;
              return (
                <g
                  key={n.id}
                  className={`network-node-group ${isFading ? 'fade-out' : ''}`}
                  data-id={n.id}
                  transform={`translate(${n.x - r}, ${n.y - r})`}
                  onClick={() => onNodeClick(n.id)}
                  onMouseEnter={(e) => onNodeEnter(e, n)}
                  onMouseLeave={onNodeLeave}
                >
                  <circle
                    cx={r}
                    cy={r}
                    r={glowR}
                    fill={n.isCenter ? 'url(#center-glow)' : 'url(#node-glow)'}
                    opacity={0.8}
                  />
                  <circle
                    className={`node-circle-bg ${n.isCenter ? 'is-center' : ''}`}
                    cx={r}
                    cy={r}
                    r={r}
                    stroke={n.isCenter ? '#fbbf24' : '#a78bfa'}
                    strokeWidth={n.isCenter ? 3 : 2}
                  />
                  <image
                    className={`node-clip-img ${isFading ? 'fade-out' : ''}`}
                    href={n.thumbnail}
                    x={0}
                    y={0}
                    width={n.width}
                    height={n.height}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#clip-${n.id})`}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      {tooltip && (
        <div className="network-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tooltip-title">{tooltip.node.title}</div>
          <div className="tooltip-date">{formatDate(tooltip.node.createdAt)}</div>
          {tooltip.node.similarity !== undefined && (
            <div className="tooltip-similarity">
              相似度：{Math.round(tooltip.node.similarity * 100)}%
            </div>
          )}
          {tooltip.node.isCenter && (
            <div className="tooltip-similarity" style={{ color: '#fbbf24' }}>
              ★ 当前中心节点
            </div>
          )}
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 12,
        fontSize: 11,
        color: '#475569',
        pointerEvents: 'none'
      }}>
        缩放 {(zoom * 100).toFixed(0)}% · 滚轮缩放 · 拖拽平移
      </div>
    </div>
  );
}
