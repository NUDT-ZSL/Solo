import { useRef, useEffect, useState } from 'react';
import type { NetworkNode, NetworkEdge } from '@/types';

interface FlavorNetworkProps {
  data: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
}

export default function FlavorNetwork({ data }: FlavorNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const nodeMap = new Map<string, NetworkNode>();
    for (const node of data.nodes) {
      nodeMap.set(node.id, node);
    }

    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const edge of data.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const isHighlighted =
        hoveredNodeId === edge.source || hoveredNodeId === edge.target;
      const minOpacity = 0.15;
      const maxOpacity = 0.6;
      const opacity = minOpacity + (maxOpacity - minOpacity) * edge.weight;
      const lineWidth = 1 + 2 * edge.weight;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `rgba(196, 181, 165, ${isHighlighted ? Math.min(opacity + 0.3, 1) : (hoveredNodeId ? opacity * 0.3 : opacity)})`;
      ctx.lineWidth = isHighlighted ? lineWidth * 1.5 : lineWidth;
      ctx.stroke();
    }

    for (const node of data.nodes) {
      const isHovered = hoveredNodeId === node.id;
      const isConnected = hoveredNodeId
        ? data.edges.some(
            (e) =>
              (e.source === hoveredNodeId && e.target === node.id) ||
              (e.target === hoveredNodeId && e.source === node.id)
          )
        : false;
      const isDimmed = hoveredNodeId !== null && !isHovered && !isConnected;
      const radius = isHovered ? node.size * 1.3 : node.size;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isDimmed ? `${node.color}66` : node.color;
      ctx.fill();
      ctx.strokeStyle = isDimmed ? 'rgba(255,255,255,0.3)' : '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const node of data.nodes) {
      const isHovered = hoveredNodeId === node.id;
      const isConnected = hoveredNodeId
        ? data.edges.some(
            (e) =>
              (e.source === hoveredNodeId && e.target === node.id) ||
              (e.target === hoveredNodeId && e.source === node.id)
          )
        : false;
      const isDimmed = hoveredNodeId !== null && !isHovered && !isConnected;

      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isDimmed ? 'rgba(107, 76, 59, 0.3)' : '#6B4C3B';
      ctx.fillText(node.foodName, node.x, node.y + node.size + 4);
    }

    if (hoveredNodeId) {
      const hoveredNode = nodeMap.get(hoveredNodeId);
      if (hoveredNode) {
        const tooltipX = hoveredNode.x;
        const tooltipY = hoveredNode.y - hoveredNode.size * 1.3 - 12;
        const text = hoveredNode.foodName;
        ctx.font = 'bold 14px sans-serif';
        const metrics = ctx.measureText(text);
        const padding = 8;
        const tooltipW = metrics.width + padding * 2;
        const tooltipH = 28;
        const tooltipXPos = tooltipX - tooltipW / 2;
        const tooltipYPos = tooltipY - tooltipH;

        ctx.fillStyle = 'rgba(50, 30, 20, 0.9)';
        ctx.beginPath();
        ctx.roundRect(tooltipXPos, tooltipYPos, tooltipW, tooltipH, 6);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tooltipX, tooltipYPos + tooltipH / 2);
      }
    }
  }, [data, hoveredNodeId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: string | null = null;
    for (const node of data.nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < node.size) {
        found = node.id;
        break;
      }
    }

    setHoveredNodeId(found);
    canvas.style.cursor = found ? 'pointer' : 'default';
  };

  const handleMouseLeave = () => {
    setHoveredNodeId(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        minHeight: '500px',
        display: 'block',
        background: 'transparent',
      }}
    />
  );
}
