import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { CausalNode, CausalEdge, ActivationState } from './types';

interface CausalGraphProps {
  nodes: CausalNode[];
  edges: CausalEdge[];
  selectedNodeId: string | null;
  activations: Map<string, ActivationState>;
  activatedEdges: string[];
  isSimulating: boolean;
  getNodeColor: (node: CausalNode) => string;
  weightSlider: { edgeId: string; x: number; y: number } | null;
  particles: Array<{ id: string; x: number; y: number; color: string }>;
  onCanvasDoubleClick: (x: number, y: number) => void;
  onNodeUpdate: (id: string, updates: Partial<CausalNode>) => void;
  onEdgeCreate: (sourceId: string, targetId: string, sourceX: number, sourceY: number) => void;
  onEdgeClick: (edgeId: string, x: number, y: number) => void;
  onWeightChange: (edgeId: string, weight: number) => void;
  onCloseWeightSlider: () => void;
  onNodeSelect: (nodeId: string | null) => void;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  name: string;
  color: string;
  __ref: CausalNode;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string;
  weight: number;
}

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

interface ConnectState {
  sourceId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const NODE_RADIUS = 25;
const ACTIVATION_DURATION = 3000;

const CausalGraph: React.FC<CausalGraphProps> = ({
  nodes,
  edges,
  selectedNodeId,
  activations,
  activatedEdges,
  isSimulating,
  getNodeColor,
  weightSlider,
  particles,
  onCanvasDoubleClick,
  onNodeUpdate,
  onEdgeCreate,
  onEdgeClick,
  onWeightChange,
  onCloseWeightSlider,
  onNodeSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode, SimLink>> | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const simLinksRef = useRef<SimLink[]>([]);
  const dragStateRef = useRef<DragState | null>(null);
  const connectStateRef = useRef<ConnectState | null>(null);
  const nodesRef = useRef<CausalNode[]>(nodes);
  const edgesRef = useRef<CausalEdge[]>(edges);
  const [, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  nodesRef.current = nodes;
  edgesRef.current = edges;

  const { width, height } = useMemo(() => {
    if (typeof window !== 'undefined' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width || 1000, height: rect.height || 800 };
    }
    return { width: 1000, height: 800 };
  }, [typeof window !== 'undefined' ? containerRef.current?.clientWidth + '-' + containerRef.current?.clientHeight : 'init']);

  useEffect(() => {
    const simNodes: SimNode[] = [];
    const idMap = new Map<string, SimNode>();

    nodes.forEach(node => {
      const existing = simNodesRef.current.get(node.id);
      const sn: SimNode = {
        id: node.id,
        name: node.name,
        color: node.color,
        x: existing?.x ?? node.x,
        y: existing?.y ?? node.y,
        vx: existing?.vx,
        vy: existing?.vy,
        fx: existing?.fx,
        fy: existing?.fy,
        __ref: node,
      };
      simNodes.push(sn);
      idMap.set(node.id, sn);
    });

    simNodesRef.current = idMap;

    const simLinks: SimLink[] = edges.map(edge => {
      const source = idMap.get(edge.source);
      const target = idMap.get(edge.target);
      return {
        id: edge.id,
        source: source as any,
        target: target as any,
        weight: edge.weight,
      };
    });
    simLinksRef.current = simLinks;

    if (!simulationRef.current) {
      const sim = forceSimulation<SimNode, SimLink>(simNodes)
        .force('link',
          forceLink<SimNode, SimLink>(simLinks)
            .id(d => d.id)
            .distance(d => 140 - d.weight * 40)
            .strength(d => 0.3 + d.weight * 0.5)
        )
        .force('charge', forceManyBody<SimNode>().strength(-350))
        .force('collide', forceCollide<SimNode>().radius(55).strength(0.8))
        .force('center', forceCenter(width / 2, height / 2 + 40).strength(0.05))
        .force('x', forceX<SimNode>(width / 2).strength(0.02))
        .force('y', forceY<SimNode>(height / 2 + 40).strength(0.02))
        .velocityDecay(0.4)
        .alpha(1)
        .alphaMin(0.001)
        .alphaDecay(0.02)
        .on('tick', () => {
          idMap.forEach((sn, id) => {
            const realNode = nodesRef.current.find(n => n.id === id);
            if (realNode && realNode.fx === undefined && sn.fx === undefined) {
              realNode.x = sn.x || 0;
              realNode.y = sn.y || 0;
            }
          });
        });

      simulationRef.current = sim;
    } else {
      simulationRef.current.nodes(simNodes);
      const linkForce = simulationRef.current.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>;
      if (linkForce) {
        linkForce.links(simLinks);
      }
      simulationRef.current
        .force('center', forceCenter(width / 2, height / 2 + 40).strength(0.05))
        .alpha(0.6)
        .restart();
    }

    return () => {};
  }, [nodes.map(n => n.id).join(','), edges.map(e => e.id).join(','), width, height]);

  useEffect(() => {
    const loop = () => {
      setTick(t => (t + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    syncTimerRef.current = window.setInterval(() => {
      const currentNodes = nodesRef.current;
      let changed = false;
      const updates: Array<{ id: string; x: number; y: number }> = [];
      
      simNodesRef.current.forEach((sn, id) => {
        const realNode = currentNodes.find(n => n.id === id);
        if (realNode) {
          const newX = realNode.fx ?? sn.x ?? realNode.x;
          const newY = realNode.fy ?? sn.y ?? realNode.y;
          if (Math.abs((realNode.x) - newX) > 0.5 || Math.abs((realNode.y) - newY) > 0.5) {
            updates.push({ id, x: newX, y: newY });
            changed = true;
          }
        }
      });
      
      if (changed) {
        updates.forEach(({ id, x, y }) => {
          const realNode = nodesRef.current.find(n => n.id === id);
          if (realNode && realNode.fx === undefined) {
            onNodeUpdate(id, { x, y });
          }
        });
      }
    }, 50);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [onNodeUpdate]);

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const vb = svg.getAttribute('viewBox');
    let scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0;
    if (vb) {
      const parts = vb.split(/\s+/).map(Number);
      const vbW = parts[2], vbH = parts[3];
      scaleX = vbW / rect.width;
      scaleY = vbH / rect.height;
      offsetX = parts[0];
      offsetY = parts[1];
    }
    return {
      x: (clientX - rect.left) * scaleX + offsetX,
      y: (clientY - rect.top) * scaleY + offsetY,
    };
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isSimulating) return;
    e.preventDefault();
    const target = e.target as SVGElement;
    if (target.tagName === 'circle' || target.tagName === 'text') return;
    const { x, y } = getSVGPoint(e.clientX, e.clientY);
    onCanvasDoubleClick(x, y);
  }, [isSimulating, getSVGPoint, onCanvasDoubleClick]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    onNodeSelect(null);
    if (weightSlider) onCloseWeightSlider();
  }, [onNodeSelect, weightSlider, onCloseWeightSlider]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSimulating) return;

    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    const { x, y } = getSVGPoint(e.clientX, e.clientY);

    if (e.shiftKey || e.button === 2) {
      connectStateRef.current = {
        sourceId: nodeId,
        startX: node.x,
        startY: node.y,
        currentX: x,
        currentY: y,
      };
    } else {
      const sn = simNodesRef.current.get(nodeId);
      if (sn) {
        sn.fx = node.x;
        sn.fy = node.y;
      }
      dragStateRef.current = {
        nodeId,
        offsetX: x - node.x,
        offsetY: y - node.y,
        moved: false,
      };
    }
    onNodeSelect(nodeId);
  }, [isSimulating, getSVGPoint, onNodeSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getSVGPoint(e.clientX, e.clientY);

    if (dragStateRef.current) {
      const { nodeId, offsetX, offsetY } = dragStateRef.current;
      dragStateRef.current.moved = true;
      const newX = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, x - offsetX));
      const newY = Math.max(NODE_RADIUS + 60, Math.min(height - NODE_RADIUS, y - offsetY));

      const sn = simNodesRef.current.get(nodeId);
      if (sn) {
        sn.fx = newX;
        sn.fy = newY;
      }
      onNodeUpdate(nodeId, { x: newX, y: newY, fx: newX, fy: newY });
      setTick(t => (t + 1) % 1000000);
    }

    if (connectStateRef.current) {
      connectStateRef.current.currentX = x;
      connectStateRef.current.currentY = y;
      setTick(t => (t + 1) % 1000000);
    }
  }, [getSVGPoint, onNodeUpdate, width, height]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragStateRef.current) {
      const { nodeId } = dragStateRef.current;
      const sn = simNodesRef.current.get(nodeId);
      if (sn) {
        const node = nodesRef.current.find(n => n.id === nodeId);
        if (node) {
          sn.x = node.x;
          sn.y = node.y;
        }
        sn.fx = null;
        sn.fy = null;
      }
      onNodeUpdate(nodeId, { fx: undefined, fy: undefined });
      if (simulationRef.current) {
        simulationRef.current.alpha(0.3).restart();
      }
      dragStateRef.current = null;
    }

    if (connectStateRef.current) {
      const { sourceId, startX, startY } = connectStateRef.current;
      const { x, y } = getSVGPoint(e.clientX, e.clientY);

      let targetNode: CausalNode | undefined;
      let minDist = NODE_RADIUS + 10;
      nodesRef.current.forEach(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          targetNode = node;
        }
      });

      if (targetNode && targetNode.id !== sourceId) {
        onEdgeCreate(sourceId, targetNode.id, startX, startY);
      }
      connectStateRef.current = null;
    }
  }, [getSVGPoint, onNodeUpdate, onEdgeCreate]);

  const handleEdgeClickCb = useCallback((e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    if (isSimulating) return;
    const realEdge = edgesRef.current.find(ed => ed.id === edgeId);
    if (!realEdge) return;
    const src = nodesRef.current.find(n => n.id === realEdge.source);
    const tgt = nodesRef.current.find(n => n.id === realEdge.target);
    if (!src || !tgt) return;
    const mx = (src.x + tgt.x) / 2;
    const my = (src.y + tgt.y) / 2;
    onEdgeClick(edgeId, mx, my);
  }, [isSimulating, onEdgeClick]);

  const getEdgeData = useCallback((edge: CausalEdge) => {
    const src = nodes.find(n => n.id === edge.source);
    const tgt = nodes.find(n => n.id === edge.target);
    if (!src || !tgt) return null;
    return { source: src, target: tgt };
  }, [nodes]);

  const getEdgePath = useCallback((source: CausalNode, target: CausalNode) => {
    const sx = source.x, sy = source.y;
    const tx = target.x, ty = target.y;
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return '';
    const nx = -dy / dist;
    const ny = dx / dist;
    const curveAmount = Math.min(dist * 0.15, 30);
    const mx = (sx + tx) / 2 + nx * curveAmount;
    const my = (sy + ty) / 2 + ny * curveAmount;
    return `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`;
  }, []);

  const getArrowPos = useCallback((source: CausalNode, target: CausalNode) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: target.x, y: target.y, angle: 0 };
    return {
      x: target.x - (dx / dist) * NODE_RADIUS,
      y: target.y - (dy / dist) * NODE_RADIUS,
      angle: Math.atan2(dy, dx),
    };
  }, []);

  const getInterpolationColor = useCallback((node: CausalNode): string => {
    const activation = activations.get(node.id);
    if (!activation) return node.color;

    const elapsed = Date.now() - activation.activatedAt;
    const t = Math.min(1, Math.max(0, elapsed / ACTIVATION_DURATION));

    const startColor = activation.isInitial ? '#FFD700' : node.color;
    const peakColor = '#FF8C00';
    const endColor = node.color;

    let r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, ratio: number;

    if (t < 0.3) {
      r1 = parseInt(startColor.slice(1, 3), 16);
      g1 = parseInt(startColor.slice(3, 5), 16);
      b1 = parseInt(startColor.slice(5, 7), 16);
      r2 = parseInt(peakColor.slice(1, 3), 16);
      g2 = parseInt(peakColor.slice(3, 5), 16);
      b2 = parseInt(peakColor.slice(5, 7), 16);
      ratio = t / 0.3;
    } else {
      r1 = parseInt(peakColor.slice(1, 3), 16);
      g1 = parseInt(peakColor.slice(3, 5), 16);
      b1 = parseInt(peakColor.slice(5, 7), 16);
      r2 = parseInt(endColor.slice(1, 3), 16);
      g2 = parseInt(endColor.slice(3, 5), 16);
      b2 = parseInt(endColor.slice(5, 7), 16);
      ratio = (t - 0.3) / 0.7;
    }

    const easeInOut = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
    const r = Math.round(r1 + (r2 - r1) * easeInOut);
    const g = Math.round(g1 + (g2 - g1) * easeInOut);
    const b = Math.round(b1 + (b2 - b1) * easeInOut);

    return `rgb(${r}, ${g}, ${b})`;
  }, [activations]);

  const displayColor = useCallback((node: CausalNode): string => {
    if (activations.size > 0) {
      return getInterpolationColor(node);
    }
    return getNodeColor(node);
  }, [activations.size, getInterpolationColor, getNodeColor]);

  const getEdgeWeight = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    return edge ? edge.weight : 0.5;
  }, [edges]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <svg
        ref={svgRef}
        className="svg-canvas"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onDoubleClick={handleDoubleClick}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.35)" />
          </marker>
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF8C00" />
          </marker>
          <filter id="node-glow-selected" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="12" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="activation-glow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="edges-layer">
          {edges.map(edge => {
            const data = getEdgeData(edge);
            if (!data) return null;
            const { source, target } = data;
            const isActivated = activatedEdges.includes(edge.id);
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            const arrow = getArrowPos(source, target);

            return (
              <g key={edge.id} className="edge-group">
                <path
                  d={getEdgePath(source, target)}
                  stroke="transparent"
                  strokeWidth={18}
                  fill="none"
                  style={{ cursor: isSimulating ? 'default' : 'pointer' }}
                  onClick={(e) => handleEdgeClickCb(e, edge.id)}
                />
                <path
                  className={`edge-path ${isActivated ? 'activated' : ''}`}
                  d={getEdgePath(source, target)}
                  markerEnd={isActivated ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                  style={{ pointerEvents: 'none' }}
                />
                {!isActivated && (
                  <text
                    className="edge-weight-text"
                    x={midX}
                    y={midY - 10}
                    style={{ pointerEvents: 'none' }}
                  >
                    {edge.weight.toFixed(1)}
                  </text>
                )}
                {isActivated && (
                  <circle r="5" fill="#FF8C00" cx={arrow.x} cy={arrow.y}>
                    <animate attributeName="r" values="3;7;3" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </g>

        {connectStateRef.current && (() => {
          const cs = connectStateRef.current;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <line
                x1={cs.startX}
                y1={cs.startY}
                x2={cs.currentX}
                y2={cs.currentY}
                stroke="#00D4FF"
                strokeWidth={2.5}
                strokeDasharray="8 6"
                strokeLinecap="round"
                opacity={0.9}
              />
              <circle cx={cs.currentX} cy={cs.currentY} r="8" fill="none" stroke="#00D4FF" strokeWidth={2} opacity={0.9}>
                <animate attributeName="r" values="6;12;6" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })()}

        <g className="nodes-layer">
          {nodes.map(node => {
            const activation = activations.get(node.id);
            const isSelected = selectedNodeId === node.id;
            const fillColor = displayColor(node);
            const isInitial = activation?.isInitial;

            return (
              <g
                key={node.id}
                className="node-group"
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                style={{ cursor: isSimulating ? 'default' : (dragStateRef.current?.nodeId === node.id ? 'grabbing' : 'grab') }}
              >
                {isInitial && (
                  <>
                    <circle r={25} fill="none" stroke="#FFD700" strokeWidth={2} opacity={0}>
                      <animate attributeName="r" values="25;55;25" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                    <circle r={25} fill="none" stroke="#FFD700" strokeWidth={2} opacity={0}>
                      <animate attributeName="r" values="25;55;25" dur="1.6s" begin="0.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" begin="0.4s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}

                {activation && !isInitial && (
                  <circle r={28} fill="none" stroke={fillColor} strokeWidth={1.5} opacity={0.6}>
                    <animate attributeName="r" values="26;34;26" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}

                <circle
                  className={`node-circle ${isSelected ? 'selected' : ''}`}
                  r={NODE_RADIUS}
                  fill={fillColor}
                  stroke={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.85)'}
                  strokeWidth={isSelected ? 2.5 : 1}
                  filter={
                    isSelected
                      ? 'url(#node-glow-selected)'
                      : activation
                        ? 'url(#activation-glow)'
                        : 'url(#node-glow)'
                  }
                  style={{
                    transition: dragStateRef.current?.nodeId === node.id
                      ? 'none'
                      : 'fill 0.15s ease-out, stroke 0.3s ease-out',
                    color: fillColor,
                  }}
                />

                <text
                  className="node-text"
                  y={1}
                  style={{ pointerEvents: 'none', fill: '#FFFFFF', fontWeight: 500, fontSize: 11 }}
                >
                  {node.name.length > 6 ? node.name.slice(0, 6) + '…' : node.name}
                </text>
                <text
                  className="node-text"
                  y={14}
                  style={{ pointerEvents: 'none', fill: 'rgba(255,255,255,0.6)', fontSize: 8 }}
                >
                  {activation ? `L${activation.depth}` : ''}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `calc(${(particle.x / width) * 100}% - 3px)`,
            top: `calc(${(particle.y / height) * 100}% - 3px)`,
            backgroundColor: particle.color,
            boxShadow: `0 0 8px ${particle.color}, 0 0 16px ${particle.color}`,
          }}
        />
      ))}

      {weightSlider && (
        <div
          className="weight-slider-container"
          style={{
            left: `calc(${(weightSlider.x / width) * 100}% + 15px)`,
            top: `calc(${(weightSlider.y / height) * 100}% - 35px)`,
          }}
        >
          <div className="weight-slider-label">
            <span>影响权重</span>
            <span className="weight-value">{getEdgeWeight(weightSlider.edgeId).toFixed(1)}</span>
          </div>
          <input
            className="weight-slider"
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={getEdgeWeight(weightSlider.edgeId)}
            onChange={(e) => onWeightChange(weightSlider.edgeId, parseFloat(e.target.value))}
            autoFocus
          />
          <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            点击画布空白处关闭
          </div>
        </div>
      )}
    </div>
  );
};

export default CausalGraph;
