import React, { useEffect, useRef, useState } from 'react';
import type { StickyNote, Connection, GraphNode } from '../types';

interface ForceGraphProps {
  stickies: StickyNote[];
  connections: Connection[];
  enabled: boolean;
  onUpdateNotePosition: (id: string, x: number, y: number) => void;
  isMobile: boolean;
}

const ForceGraph: React.FC<ForceGraphProps> = ({
  stickies,
  connections,
  enabled,
  onUpdateNotePosition,
  isMobile
}) => {
  const nodesRef = useRef<Map<string, GraphNode>>(new Map());
  const animFrameRef = useRef<number>(0);
  const iterationRef = useRef(0);
  const draggingIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [energy, setEnergy] = useState(0);
  const energyRef = useRef(0);

  const noteWidth = isMobile ? 100 : 120;
  const noteHeight = isMobile ? 80 : 100;

  useEffect(() => {
    if (!enabled) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      nodesRef.current.clear();
      return;
    }

    const connectionCounts = new Map<string, number>();
    connections.forEach((conn) => {
      connectionCounts.set(conn.fromId, (connectionCounts.get(conn.fromId) || 0) + 1);
      connectionCounts.set(conn.toId, (connectionCounts.get(conn.toId) || 0) + 1);
    });

    stickies.forEach((note) => {
      const count = connectionCounts.get(note.id) || 0;
      if (!nodesRef.current.has(note.id)) {
        nodesRef.current.set(note.id, {
          id: note.id,
          x: note.x + noteWidth / 2,
          y: note.y + noteHeight / 2,
          vx: 0,
          vy: 0,
          color: note.color,
          radius: Math.min(20 + count * 5, 50),
          connectionCount: count
        });
      } else {
        const node = nodesRef.current.get(note.id)!;
        node.radius = Math.min(20 + count * 5, 50);
        node.connectionCount = count;
        node.color = note.color;
      }
    });

    nodesRef.current.forEach((node, id) => {
      if (!stickies.find((s) => s.id === id)) {
        nodesRef.current.delete(id);
      }
    });

    iterationRef.current = 0;

    const simulate = () => {
      const nodes = Array.from(nodesRef.current.values());
      const maxIterationsPerFrame = 5;
      let frameEnergy = 0;

      for (let iter = 0; iter < maxIterationsPerFrame; iter++) {
        if (iterationRef.current >= 200 || (energyRef.current < 0.05 && iterationRef.current > 50)) {
          return;
        }

        iterationRef.current++;
        let totalEnergy = 0;

        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) dist = 1;

            const repulsion = (0.8 * 500) / (dist * dist);
            const fx = (dx / dist) * repulsion;
            const fy = (dy / dist) * repulsion;

            if (a.id !== draggingIdRef.current) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (b.id !== draggingIdRef.current) {
              b.vx += fx;
              b.vy += fy;
            }
            totalEnergy += repulsion * dist;
          }
        }

        connections.forEach((conn) => {
          const from = nodesRef.current.get(conn.fromId);
          const to = nodesRef.current.get(conn.toId);
          if (!from || !to) return;

          let dx = to.x - from.x;
          let dy = to.y - from.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) dist = 1;

          const displacement = dist - 120;
          const force = 0.3 * displacement;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (from.id !== draggingIdRef.current) {
            from.vx += fx;
            from.vy += fy;
          }
          if (to.id !== draggingIdRef.current) {
            to.vx -= fx;
            to.vy -= fy;
          }
          totalEnergy += Math.abs(force) * 10;
        });

        const damping = 0.85;
        nodes.forEach((node) => {
          if (node.id === draggingIdRef.current) {
            node.vx = 0;
            node.vy = 0;
            return;
          }
          node.vx *= damping;
          node.vy *= damping;
          node.vx = Math.max(-50, Math.min(50, node.vx));
          node.vy = Math.max(-50, Math.min(50, node.vy));
          node.x += node.vx * 0.1;
          node.y += node.vy * 0.1;

          totalEnergy += Math.abs(node.vx) + Math.abs(node.vy);
        });

        frameEnergy = totalEnergy / nodes.length;
        energyRef.current = frameEnergy;
      }

      setEnergy(Math.round(frameEnergy * 100) / 100);

      nodes.forEach((node) => {
        onUpdateNotePosition(node.id, node.x - noteWidth / 2, node.y - noteHeight / 2);
      });

      animFrameRef.current = requestAnimationFrame(simulate);
    };

    animFrameRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [enabled, stickies.length, connections.length, onUpdateNotePosition, noteWidth, noteHeight]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!enabled) return;

    const node = nodesRef.current.get(nodeId);
    if (!node) return;

    draggingIdRef.current = nodeId;
    dragOffsetRef.current = {
      x: e.clientX - node.x,
      y: e.clientY - node.y
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!draggingIdRef.current) return;
      const n = nodesRef.current.get(draggingIdRef.current);
      if (!n) return;
      n.x = ev.clientX - dragOffsetRef.current.x;
      n.y = ev.clientY - dragOffsetRef.current.y;
    };

    const handleMouseUp = () => {
      draggingIdRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!enabled) return null;

  const nodes = Array.from(nodesRef.current.values());

  return (
    <g style={{ pointerEvents: enabled ? 'auto' : 'none' }}>
      {enabled && (
        <foreignObject x={20} y={70} width={120} height={30}>
          <div
            style={{
              background: 'rgba(44, 62, 80, 0.9)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'monospace'
            }}
          >
            能量: {energy.toFixed(2)}
          </div>
        </foreignObject>
      )}
      {nodes.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius}
            fill={node.color}
            stroke="#333"
            strokeWidth={1}
            opacity={0.9}
            style={{
              cursor: 'grab',
              transition: 'box-shadow 0.2s',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          />
          {node.connectionCount > 0 && (
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fontSize={Math.max(10, node.radius / 3)}
              fill="#333"
              fontWeight={600}
              pointerEvents="none"
            >
              {node.connectionCount}
            </text>
          )}
        </g>
      ))}
    </g>
  );
};

export default ForceGraph;
