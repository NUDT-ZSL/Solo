import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { type GraphData, type GraphNode, applyForceLayout, computeIterationCount } from './GraphBuilder';

interface RoleGraphProps {
  graphData: GraphData;
  onRefresh: () => void;
  onNodeDoubleClick: (node: GraphNode) => void;
}

interface NodeInfo {
  node: GraphNode;
  screenX: number;
  screenY: number;
  relatedCount: number;
  relatedNames: string[];
  totalWeight: number;
}

const RoleGraph: React.FC<RoleGraphProps> = ({ graphData, onRefresh, onNodeDoubleClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spinning, setSpinning] = useState(false);
  const [infoCard, setInfoCard] = useState<NodeInfo | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  const layoutData = useRef<GraphData>(graphData);
  const offsetRef = useRef(offset);
  const scaleRef = useRef(scale);
  const draggingRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);

  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { draggingRef.current = draggingNode; }, [draggingNode]);
  useEffect(() => { hoverRef.current = hoverNode; }, [hoverNode]);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      const iterations = computeIterationCount(graphData.nodes.length);
      layoutData.current = applyForceLayout(graphData, iterations);
    } else {
      layoutData.current = graphData;
    }
    setInfoCard(null);
    setHoverNode(null);
  }, [graphData]);

  const buildInfoCardData = useCallback(
    (node: GraphNode, screenX: number, screenY: number): NodeInfo => {
      const related = layoutData.current.edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      const relatedNames = related.map((e) =>
        e.source === node.id ? e.target : e.source
      );
      const totalWeight = related.reduce((sum, e) => sum + e.weight, 0);
      return {
        node,
        screenX,
        screenY,
        relatedCount: relatedNames.length,
        relatedNames,
        totalWeight,
      };
    },
    []
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number, canvas: HTMLCanvasElement) => {
      const s = scaleRef.current;
      const o = offsetRef.current;
      return {
        x: (wx + o.x) * s + canvas.width / 2,
        y: (wy + o.y) * s + canvas.height / 2,
      };
    },
    []
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number, canvas: HTMLCanvasElement) => {
      const s = scaleRef.current;
      const o = offsetRef.current;
      return {
        x: (sx - canvas.width / 2) / s - o.x,
        y: (sy - canvas.height / 2) / s - o.y,
      };
    },
    []
  );

  const findNodeAt = useCallback(
    (sx: number, sy: number, canvas: HTMLCanvasElement) => {
      const world = screenToWorld(sx, sy, canvas);
      for (const node of layoutData.current.nodes) {
        const dx = world.x - node.x;
        const dy = world.y - node.y;
        if (dx * dx + dy * dy < node.radius * node.radius) {
          return node;
        }
      }
      return null;
    },
    [screenToWorld]
  );

  const drawLegend = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
      const legendW = 180;
      const legendH = 42;
      const padX = 12;
      const padY = height / dpr - legendH - 36;

      ctx.save();
      ctx.fillStyle = 'rgba(44, 62, 80, 0.85)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(padX, padY, legendW, legendH, 6);
      ctx.fill();
      ctx.stroke();

      const gradX = padX + 10;
      const gradY = padY + 10;
      const gradW = legendW - 20;
      const gradH = 10;

      const gradient = ctx.createLinearGradient(gradX, gradY, gradX + gradW, gradY);
      gradient.addColorStop(0, '#E74C3C');
      gradient.addColorStop(0.5, '#F1C40F');
      gradient.addColorStop(1, '#2ECC71');
      ctx.fillStyle = gradient;
      ctx.fillRect(gradX, gradY, gradW, gradH);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('敌对/疏远', gradX, gradY + gradH + 12);
      ctx.textAlign = 'center';
      ctx.fillText('中性', gradX + gradW / 2, gradY + gradH + 12);
      ctx.textAlign = 'right';
      ctx.fillText('友好/亲密', gradX + gradW, gradY + gradH + 12);

      ctx.restore();
    },
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#1A252F';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const data = layoutData.current;
    const dragging = draggingRef.current;
    const hovered = hoverRef.current;

    for (const edge of data.edges) {
      const sourceNode = data.nodes.find((n) => n.id === edge.source);
      const targetNode = data.nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) continue;

      const src = worldToScreen(sourceNode.x, sourceNode.y, canvas);
      const tgt = worldToScreen(targetNode.x, targetNode.y, canvas);

      const isHighlighted =
        (dragging && (edge.source === dragging || edge.target === dragging)) ||
        (hovered && (edge.source === hovered || edge.target === hovered));

      ctx.beginPath();
      ctx.moveTo(src.x / dpr, src.y / dpr);
      ctx.lineTo(tgt.x / dpr, tgt.y / dpr);
      ctx.strokeStyle = isHighlighted
        ? `rgba(255, 220, 100, 0.85)`
        : 'rgba(255,255,255,0.28)';
      ctx.lineWidth = edge.thickness * scaleRef.current * (isHighlighted ? 1.4 : 1);
      ctx.stroke();

      if (isHighlighted || scaleRef.current > 1.2) {
        const midX = (src.x / dpr + tgt.x / dpr) / 2;
        const midY = (src.y / dpr + tgt.y / dpr) / 2;
        const fs = Math.max(10, 11 * scaleRef.current);
        ctx.font = `${fs}px sans-serif`;
        ctx.fillStyle = isHighlighted
          ? 'rgba(255,220,100,1)'
          : 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(edge.interactionType, midX, midY - 6 * scaleRef.current);
      }
    }

    for (const node of data.nodes) {
      const screen = worldToScreen(node.x, node.y, canvas);
      const sx = screen.x / dpr;
      const sy = screen.y / dpr;
      const r = node.radius * scaleRef.current;
      const isDragging = dragging === node.id;
      const isHovered = hovered === node.id;

      if (isDragging || isHovered) {
        ctx.beginPath();
        ctx.arc(sx, sy, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(52, 152, 219, 0.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = isDragging
        ? '#F1C40F'
        : isHovered
        ? 'rgba(255,255,255,0.9)'
        : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isDragging || isHovered ? 3 : 2;
      ctx.stroke();

      ctx.font = `bold ${Math.max(10, 13 * scaleRef.current)}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, sx, sy);

      ctx.font = `${Math.max(8, 10 * scaleRef.current)}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`${node.appearanceCount}次`, sx, sy + r + 14 * scaleRef.current);
    }

    drawLegend(ctx, rect.width, rect.height, dpr);
  }, [worldToScreen, screenToWorld, drawLegend]);

  useEffect(() => {
    const loop = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.2, Math.min(3, s * delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const node = findNodeAt(sx, sy, canvas);
      if (node) {
        setDraggingNode(node.id);
        setHoverNode(node.id);
      } else {
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x * scale, y: e.clientY - offset.y * scale });
        setInfoCard(null);
      }
    },
    [findNodeAt, offset, scale]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (draggingNode) {
        const world = screenToWorld(sx, sy, canvas);
        const node = layoutData.current.nodes.find((n) => n.id === draggingNode);
        if (node) {
          node.x = world.x;
          node.y = world.y;
        }
      } else if (isPanning) {
        setOffset({
          x: (e.clientX - panStart.x) / scale,
          y: (e.clientY - panStart.y) / scale,
        });
      } else {
        const node = findNodeAt(sx, sy, canvas);
        if (node) {
          setHoverNode(node.id);
          canvas.style.cursor = 'pointer';
        } else {
          setHoverNode(null);
          canvas.style.cursor = 'default';
        }
      }
    },
    [draggingNode, isPanning, panStart, screenToWorld, scale, findNodeAt]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const node = findNodeAt(sx, sy, canvas);
      if (node) {
        const screen = worldToScreen(node.x, node.y, canvas);
        const info = buildInfoCardData(node, screen.x / (window.devicePixelRatio || 1), screen.y / (window.devicePixelRatio || 1));
        setInfoCard(info);
        onNodeDoubleClick(node);
      } else {
        setInfoCard(null);
      }
    },
    [findNodeAt, worldToScreen, buildInfoCardData, onNodeDoubleClick]
  );

  const handleRefreshClick = () => {
    setSpinning(true);
    onRefresh();
    setInfoCard(null);
    setTimeout(() => setSpinning(false), 500);
  };

  const handleResetView = () => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
    setInfoCard(null);
  };

  const infoCardStyle = useMemo<React.CSSProperties | null>(() => {
    if (!infoCard) return null;
    const rect = containerRef.current?.getBoundingClientRect();
    const containerW = rect?.width || 500;
    const containerH = rect?.height || 500;
    const cardW = 230;
    const cardH = 200;
    let left = infoCard.screenX + 40;
    let top = infoCard.screenY - cardH / 2;
    if (left + cardW > containerW - 10) left = infoCard.screenX - cardW - 40;
    if (left < 10) left = 10;
    if (top < 50) top = 50;
    if (top + cardH > containerH - 10) top = containerH - cardH - 10;
    return { left, top };
  }, [infoCard]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#2C3E50' }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const node = findNodeAt(e.clientX - rect.left, e.clientY - rect.top, canvas);
          if (!node) setInfoCard(null);
        }}
        style={{
          width: '100%',
          height: '100%',
          cursor: draggingNode
            ? 'grabbing'
            : isPanning
            ? 'move'
            : hoverNode
            ? 'pointer'
            : 'default',
        }}
      />

      <button
        onClick={handleRefreshClick}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: 'none',
          background: '#3498DB',
          color: '#fff',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.5s ease, background 0.2s ease',
          transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2980B9')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#3498DB')}
        title="刷新图谱"
      >
        ↻
      </button>

      <button
        onClick={handleResetView}
        style={{
          position: 'absolute',
          top: '12px',
          right: '58px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: 'none',
          background: '#27AE60',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#229954')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#27AE60')}
        title="重置视图"
      >
        ⤢
      </button>

      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          background: 'rgba(0,0,0,0.25)',
          padding: '4px 10px',
          borderRadius: '4px',
        }}
      >
        缩放: {Math.round(scale * 100)}%
      </div>

      {infoCard && infoCardStyle && (
        <div
          style={{
            position: 'absolute',
            width: '230px',
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '8px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
            padding: '14px 16px',
            zIndex: 100,
            ...infoCardStyle,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid #EEE',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: infoCard.node.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: '2px solid rgba(255,255,255,0.8)',
                }}
              >
                {infoCard.node.name[0]}
              </div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#2C3E50' }}>
                {infoCard.node.name}
              </div>
            </div>
            <button
              onClick={() => setInfoCard(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '2px',
              }}
            >
              <span style={{ color: '#7F8C8D' }}>出现频次</span>
              <span style={{ fontWeight: 600, color: '#2980B9' }}>
                {infoCard.node.appearanceCount} 次
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '2px',
              }}
            >
              <span style={{ color: '#7F8C8D' }}>关联角色</span>
              <span style={{ fontWeight: 600, color: '#8E44AD' }}>
                {infoCard.relatedCount} 个
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span style={{ color: '#7F8C8D' }}>互动总量</span>
              <span style={{ fontWeight: 600, color: '#E67E22' }}>
                {infoCard.totalWeight}
              </span>
            </div>

            <div style={{ marginTop: '6px', borderTop: '1px dashed #EEE', paddingTop: '8px' }}>
              <div style={{ color: '#7F8C8D', marginBottom: '4px' }}>关联角色：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {infoCard.relatedNames.length === 0 ? (
                  <span style={{ color: '#BBB', fontSize: '11px' }}>（暂无关联）</span>
                ) : (
                  infoCard.relatedNames.slice(0, 6).map((name) => (
                    <span
                      key={name}
                      style={{
                        background: '#ECF0F1',
                        color: '#2C3E50',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                    >
                      {name}
                    </span>
                  ))
                )}
                {infoCard.relatedNames.length > 6 && (
                  <span style={{ color: '#999', fontSize: '11px' }}>
                    +{infoCard.relatedNames.length - 6}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '10px',
              fontSize: '10px',
              color: '#AAA',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            双击画布空白处关闭 · 再次双击节点跳转章节
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '11px',
          textAlign: 'right',
        }}
      >
        滚轮缩放 · 拖拽移动 · 双击节点查看信息
      </div>
    </div>
  );
};

export default RoleGraph;
