import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  category: 'tech' | 'literature' | 'history' | 'philosophy' | 'art' | 'general';
  refCount: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface NoteSummary {
  id: string;
  content: string;
  book_title: string;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  tech: '#5b8db8',
  literature: '#6aaf6a',
  history: '#e8a848',
  philosophy: '#9b7db8',
  art: '#d4789c',
  general: '#95a5a6',
};

interface KnowledgeGraphProps {
  data: GraphData | null;
  onTagNotesRequest?: (tagId: string) => Promise<NoteSummary[]>;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, onTagNotesRequest }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode, GraphLink>> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const hoverRef = useRef<string | null>(null);
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({ nodeId: null, offsetX: 0, offsetY: 0 });
  const dimensionsRef = useRef({ width: 800, height: 600 });
  const [popup, setPopup] = useState<{ tagId: string; tagName: string; notes: NoteSummary[]; x: number; y: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const animFrameRef = useRef<number>(0);

  const getNodeRadius = useCallback((refCount: number) => {
    const minR = 15;
    const maxR = 40;
    const maxRef = Math.max(...nodesRef.current.map(n => n.refCount), 1);
    const ratio = maxRef > 0 ? refCount / maxRef : 0;
    return minR + (maxR - minR) * ratio;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = dimensionsRef.current;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const hoveredId = hoverRef.current;

    for (const link of linksRef.current) {
      const source = link.source as unknown as GraphNode;
      const target = link.target as unknown as GraphNode;
      if (!source.x || !source.y || !target.x || !target.y) continue;
      const lineW = Math.min(5, Math.max(1, link.weight));
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = 'rgba(44,62,80,0.15)';
      ctx.lineWidth = lineW;
      ctx.stroke();
    }

    for (const node of nodesRef.current) {
      if (!node.x || !node.y) continue;
      const r = getNodeRadius(node.refCount);
      const isHovered = hoveredId === node.id;
      const scale = isHovered ? 1.3 : 1;
      const drawR = r * scale;
      const color = categoryColors[node.category] || categoryColors.general;

      ctx.beginPath();
      ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = isHovered ? 1 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (isHovered) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 13px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2c3e50';
        ctx.fillText(node.name, node.x, node.y - drawR - 8);
        ctx.font = '11px "Noto Sans SC", sans-serif';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText(`引用 ${node.refCount} 次`, node.x, node.y - drawR + 6);
      }
    }
  }, [getNodeRadius]);

  useEffect(() => {
    if (!data || !data.nodes.length) return;

    const container = containerRef.current;
    if (container) {
      dimensionsRef.current = {
        width: container.clientWidth,
        height: Math.max(500, window.innerHeight - 160),
      };
    }

    nodesRef.current = data.nodes.map(n => ({ ...n }));
    linksRef.current = data.links.map(l => ({ ...l }));

    const { width, height } = dimensionsRef.current;

    const sim = forceSimulation<GraphNode, GraphLink>(nodesRef.current)
      .force('link', forceLink<GraphNode, GraphLink>(linksRef.current)
        .id(d => d.id)
        .distance(120)
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<GraphNode>().radius(d => getNodeRadius(d.refCount) + 8))
      .alphaDecay(0.02)
      .on('tick', () => {
        draw();
      });

    simRef.current = sim;

    return () => {
      sim.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [data, draw, getNodeRadius]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (container) {
        dimensionsRef.current = {
          width: container.clientWidth,
          height: Math.max(500, window.innerHeight - 160),
        };
        draw();
        if (simRef.current) {
          simRef.current.force('center', forceCenter(dimensionsRef.current.width / 2, dimensionsRef.current.height / 2));
          simRef.current.alpha(0.3).restart();
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const findNodeAt = useCallback((x: number, y: number): GraphNode | null => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      if (!n.x || !n.y) continue;
      const r = getNodeRadius(n.refCount);
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy <= (r * 1.3) * (r * 1.3)) return n;
    }
    return null;
  }, [getNodeRadius]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
      if (node) {
        node.fx = x;
        node.fy = y;
        if (simRef.current) simRef.current.alpha(0.3).restart();
      }
      return;
    }

    const found = findNodeAt(x, y);
    const prev = hoverRef.current;
    hoverRef.current = found ? found.id : null;
    canvas.style.cursor = found ? 'pointer' : 'default';
    if (prev !== hoverRef.current) draw();
  }, [draw, findNodeAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const found = findNodeAt(x, y);
    if (found) {
      dragRef.current = { nodeId: found.id, offsetX: 0, offsetY: 0 };
      found.fx = found.x;
      found.fy = found.y;
      if (simRef.current) simRef.current.alphaTarget(0.3).restart();
    }
  }, [findNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
      if (node) {
        node.fx = undefined;
        node.fy = undefined;
      }
      dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
      if (simRef.current) simRef.current.alphaTarget(0);
    }
  }, []);

  const handleDoubleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const found = findNodeAt(x, y);
    if (!found) return;

    if (onTagNotesRequest) {
      const notes = await onTagNotesRequest(found.id);
      const px = Math.min(e.clientX, window.innerWidth - 380);
      const py = Math.min(e.clientY, window.innerHeight - 400);
      setPopup({ tagId: found.id, tagName: found.name, notes, x: px, y: py });
    }
  }, [findNodeAt, onTagNotesRequest]);

  const closePopup = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setPopup(null); setClosing(false); }, 200);
  }, []);

  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

  if (!data || !data.nodes.length) {
    return (
      <div className="empty-state">
        <p>暂无知识点数据，请先为笔记添加标签</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ display: 'block', borderRadius: 'var(--radius)' }}
      />
      {popup && (
        <div className="modal-overlay" onClick={closePopup} style={{ background: 'rgba(44,62,80,0.25)', backdropFilter: 'blur(4px)' }}>
          <div className={`modal-content ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()} style={{ maxHeight: '60vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>知识点：{popup.tagName}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closePopup}>✕</button>
            </div>
            {popup.notes.length === 0 ? (
              <p style={{ color: 'var(--text-light)' }}>暂无关联笔记</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {popup.notes.map(n => (
                  <div key={n.id} style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 4 }}>《{n.book_title}》· {n.created_at.slice(0, 10)}</div>
                    <div>{stripHtml(n.content).slice(0, 200)}{stripHtml(n.content).length > 200 ? '...' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
