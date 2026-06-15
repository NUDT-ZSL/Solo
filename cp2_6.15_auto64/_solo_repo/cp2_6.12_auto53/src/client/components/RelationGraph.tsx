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
import { Character, Relation, Chapter, RELATION_COLORS, RELATION_STYLES } from '../types';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  avatar?: string;
  chapterCount: number;
  radius: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  type: Relation['type'];
}

interface RelationGraphProps {
  characters: Character[];
  relations: Relation[];
  chapters: Chapter[];
  onAddRelation: (source: string, target: string, type: Relation['type']) => void;
  onDeleteRelation: (id: string) => void;
}

const MIN_RADIUS = 15;
const MAX_RADIUS = 50;
const FPS_SAMPLE_INTERVAL = 500;

const RelationGraph: React.FC<RelationGraphProps> = ({
  characters,
  relations,
  chapters,
  onAddRelation,
  onDeleteRelation,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);
  const frameRef = useRef<number>(0);
  const fpsFrames = useRef<number[]>([]);
  const nodesMapRef = useRef<Map<string, GraphNode>>(new Map());

  const getChapterCount = useCallback(
    (charId: string): number => {
      return chapters.filter((ch) => ch.characterIds.includes(charId)).length;
    },
    [chapters]
  );

  const computeRadius = useCallback(
    (charId: string): number => {
      const count = getChapterCount(charId);
      const maxCount = Math.max(
        1,
        ...characters.map((c) => getChapterCount(c.id))
      );
      const ratio = maxCount > 0 ? count / maxCount : 0;
      return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
    },
    [characters, getChapterCount]
  );

  useEffect(() => {
    const graphNodes: GraphNode[] = characters.map((c) => {
      const r = computeRadius(c.id);
      const existing = nodesMapRef.current.get(c.id);
      return {
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        chapterCount: getChapterCount(c.id),
        radius: r,
        x: existing?.x ?? undefined,
        y: existing?.y ?? undefined,
      };
    });

    const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    nodesMapRef.current = nodeMap;

    const graphLinks: GraphLink[] = relations
      .filter((r) => nodeMap.has(r.source as string) && nodeMap.has(r.target as string))
      .map((r) => ({
        source: r.source,
        target: r.target,
        type: r.type,
      }));

    const container = containerRef.current;
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = forceSimulation<GraphNode>(graphNodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(graphLinks)
          .id((d) => d.id)
          .distance(120)
      )
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<GraphNode>().radius((d) => d.radius + 10))
      .alphaDecay(0.02)
      .on('tick', () => {
        setNodes([...graphNodes]);
        setLinks([...graphLinks]);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [characters, relations, chapters, computeRadius, getChapterCount]);

  useEffect(() => {
    let animId: number;
    const measure = () => {
      fpsFrames.current.push(performance.now());
      const now = performance.now();
      fpsFrames.current = fpsFrames.current.filter((t) => now - t < FPS_SAMPLE_INTERVAL);
      setFps(fpsFrames.current.length * (1000 / FPS_SAMPLE_INTERVAL));
      animId = requestAnimationFrame(measure);
    };
    animId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleMouseDown = (node: GraphNode, e: React.MouseEvent) => {
    e.preventDefault();
    setDragNode(node.id);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
    }
    node.fx = node.x;
    node.fy = node.y;
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragNode || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const node = nodes.find((n) => n.id === dragNode);
      if (node) {
        node.fx = x;
        node.fy = y;
        setNodes([...nodes]);
      }
    },
    [dragNode, nodes]
  );

  const handleMouseUp = useCallback(() => {
    if (dragNode) {
      const node = nodes.find((n) => n.id === dragNode);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      setDragNode(null);
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
    }
  }, [dragNode, nodes]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleNodeHover = (node: GraphNode | null, e?: React.MouseEvent) => {
    setHoveredNode(node);
    if (node && e) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: (node.x ?? 0) - rect.left,
          y: (node.y ?? 0) - rect.top - node.radius - 16,
        });
      }
    }
  };

  const linkDashArray = (type: Relation['type']): string => {
    switch (type) {
      case 'enemy':
        return '8,4';
      case 'lover':
        return '3,5';
      default:
        return 'none';
    }
  };

  return (
    <div className="graph-container" ref={containerRef}>
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(26,35,50,0.85)',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
          zIndex: 10,
        }}
      >
        FPS: {Math.round(fps)} | 节点: {nodes.length}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(26,35,50,0.85)',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 11,
          color: 'var(--text-secondary)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {(['friend', 'enemy', 'lover', 'family'] as const).map((type) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="24" height="4">
              <line
                x1="0"
                y1="2"
                x2="24"
                y2="2"
                stroke={RELATION_COLORS[type]}
                strokeWidth="2"
                strokeDasharray={linkDashArray(type)}
              />
            </svg>
            <span>
              {type === 'friend' ? '朋友' : type === 'enemy' ? '敌人' : type === 'lover' ? '恋人' : '家人'}
            </span>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="graph-svg"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <defs>
          {characters.map((c) => (
            <clipPath key={c.id} id={`clip-${c.id}`}>
              <circle r={20} />
            </clipPath>
          ))}
        </defs>

        {links.map((link, i) => {
          const src = link.source as GraphNode;
          const tgt = link.target as GraphNode;
          if (!src?.x || !tgt?.x) return null;

          return (
            <line
              key={`link-${i}`}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={RELATION_COLORS[link.type]}
              strokeWidth={2}
              strokeDasharray={linkDashArray(link.type)}
              opacity={0.7}
            />
          );
        })}

        {nodes.map((node) => (
          <g
            key={node.id}
            className="graph-node"
            transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
            onMouseDown={(e) => handleMouseDown(node, e)}
            onMouseEnter={(e) => handleNodeHover(node, e)}
            onMouseLeave={() => handleNodeHover(null)}
            style={{ cursor: dragNode === node.id ? 'grabbing' : 'grab' }}
          >
            <circle
              r={node.radius}
              fill="var(--bg-tertiary)"
              stroke="var(--accent)"
              strokeWidth={dragNode === node.id ? 3 : 2}
              opacity={0.9}
            />
            {node.avatar ? (
              <image
                href={node.avatar}
                x={-20}
                y={-20}
                width={40}
                height={40}
                clipPath={`url(#clip-${node.id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={Math.max(12, node.radius * 0.5)}
                fontWeight={600}
              >
                {node.name.charAt(0)}
              </text>
            )}
            <text
              y={node.radius + 14}
              textAnchor="middle"
              fill="var(--text-secondary)"
              fontSize={11}
            >
              {node.name}
            </text>
          </g>
        ))}
      </svg>

      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            className="graph-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <h4>{hoveredNode.name}</h4>
            <p>出场章节: {hoveredNode.chapterCount}</p>
            <p>
              节点半径: {hoveredNode.radius.toFixed(0)}px
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RelationGraph;
