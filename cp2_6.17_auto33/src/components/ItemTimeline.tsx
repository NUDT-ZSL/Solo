import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { Item } from '../types';

interface ItemTimelineProps {
  item: Item;
}

interface NodeInfo {
  userId: string;
  time: string;
  message: string;
  x: number;
  y: number;
  isOwner?: boolean;
}

export default function ItemTimeline({ item }: ItemTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const animOffsetRef = useRef(0);
  const nodesRef = useRef<NodeInfo[]>([]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const nodes: NodeInfo[] = [];
    const totalNodes = item.exchangeHistory.length + 1;
    const nodeRadius = 24;
    const spacing = rect.width / (totalNodes + 1);
    const centerY = rect.height / 2;

    nodes.push({
      userId: item.ownerId,
      time: item.createdAt,
      message: '物品发布',
      x: spacing,
      y: centerY,
      isOwner: true,
    });

    item.exchangeHistory.forEach((record, idx) => {
      nodes.push({
        userId: record.toUserId,
        time: record.time,
        message: record.message,
        x: spacing * (idx + 2),
        y: centerY,
      });
    });

    nodesRef.current = nodes;

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.strokeStyle = '#d8f3dc';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -animOffsetRef.current;

      ctx.beginPath();
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (i === 0) {
          ctx.moveTo(node.x, node.y);
        } else {
          const prevNode = nodes[i - 1];
          const midX = (prevNode.x + node.x) / 2;
          const yOffset = (i % 2 === 1 ? 30 : -30);
          ctx.bezierCurveTo(midX, prevNode.y + yOffset, midX, node.y + yOffset, node.x, node.y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#2d6a4f';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = node.isOwner ? '发' : (nodes.indexOf(node));
        ctx.fillText(String(label), node.x, node.y);
      });

      animOffsetRef.current = (animOffsetRef.current + 20 / 60) % 16;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [item]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found: NodeInfo | null = null;
    for (const node of nodesRef.current) {
      const dist = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
      if (dist <= 28) {
        found = node;
        break;
      }
    }

    if (found) {
      setHoveredNode(found);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10 });
    } else {
      setHoveredNode(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  if (item.exchangeHistory.length === 0) {
    return (
      <div className="timeline-section">
        <h3 className="timeline-title">物品流转轨迹</h3>
        <div style={{ textAlign: 'center', color: '#888', padding: '30px 0' }}>
          该物品暂无流转记录
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-section">
      <h3 className="timeline-title">物品流转轨迹</h3>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          className="timeline-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {hoveredNode && (
          <div
            style={{
              position: 'absolute',
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: 'translate(-50%, -100%)',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: 13,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {hoveredNode.isOwner ? '发布人' : `交换者`}
            </div>
            <div style={{ opacity: 0.9, marginBottom: 4 }}>
              {dayjs(hoveredNode.time).format('YYYY-MM-DD HH:mm')}
            </div>
            {hoveredNode.message && (
              <div style={{ opacity: 0.8, fontStyle: 'italic' }}>
                「{hoveredNode.message}」
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
