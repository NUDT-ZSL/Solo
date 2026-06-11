import React, { useRef, useEffect, useCallback, useState } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
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

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  sourceId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const NODE_RADIUS = 25;
const LINK_DISTANCE = 150;
const CHARGE_STRENGTH = -400;
const COLLIDE_RADIUS = 60;

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
  const simulationRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const nodesRef = useRef<CausalNode[]>([]);
  const edgesRef = useRef<CausalEdge[]>([]);
  const dragStateRef = useRef<DragState | null>(null);
  const connectStateRef = useRef<ConnectState | null>(null);
  const [, forceUpdate] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const centerX = width / 2;
    const centerY = height / 2 + 30;

    const simNodes = nodes.map(n => ({ ...n }));
    const simLinks = edges.map(e => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

    const simulation = forceSimulation(simNodes as any)
      .force('link', forceLink(simLinks as any).id((d: any) => d.id).distance(LINK_DISTANCE))
      .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
      .force('center', forceCenter(centerX, centerY))
      .force('collision', forceCollide(COLLIDE_RADIUS))
      .alphaDecay(0.02)
      .on('tick', () => {
        simNodes.forEach((node, i) => {
          if (nodesRef.current[i] && nodesRef.current[i].fx === undefined) {
            onNodeUpdate(node.id, {
              x: node.x,
              y: node.y,
              vx: node.vx,
              vy: node.vy,
            });
          }
        });
        forceUpdate(n => n + 1);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes.length, edges.length, onNodeUpdate]);

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  }, [nodes.length, edges.length]);

  useEffect(() => {
    const tick = () => {
      forceUpdate(n => n + 1);
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isSimulating) return;
    const { x, y } = getSVGPoint(e.clientX, e.clientY);
    onCanvasDoubleClick(x, y);
  }, [isSimulating, getSVGPoint, onCanvasDoubleClick]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      onNodeSelect(null);
      if (weightSlider) {
        onCloseWeightSlider();
      }
    }
  }, [onNodeSelect, weightSlider, onCloseWeightSlider]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (isSimulating) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const { x, y } = getSVGPoint(e.clientX, e.clientY);
    
    if (e.shiftKey) {
      connectStateRef.current = {
        sourceId: nodeId,
        startX: node.x,
        startY: node.y,
        currentX: x,
        currentY: y,
      };
    } else {
      dragStateRef.current = {
        nodeId,
        startX: node.x,
        startY: node.y,
        offsetX: x - node.x,
        offsetY: y - node.y,
      };
      onNodeUpdate(nodeId, { fx: node.x, fy: node.y });
    }
    
    onNodeSelect(nodeId);
  }, [isSimulating, nodes, getSVGPoint, onNodeUpdate, onNodeSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getSVGPoint(e.clientX, e.clientY);

    if (dragStateRef.current) {
      const { nodeId, offsetX, offsetY } = dragStateRef.current;
      const newX = x - offsetX;
      const newY = y - offsetY;
      onNodeUpdate(nodeId, { x: newX, y: newY, fx: newX, fy: newY });
    }

    if (connectStateRef.current) {
      connectStateRef.current.currentX = x;
      connectStateRef.current.currentY = y;
      forceUpdate(n => n + 1);
    }
  }, [getSVGPoint, onNodeUpdate]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragStateRef.current) {
      const { nodeId } = dragStateRef.current;
      onNodeUpdate(nodeId, { fx: null, fy: null });
      dragStateRef.current = null;
    }

    if (connectStateRef.current) {
      const { sourceId, startX, startY } = connectStateRef.current;
      const { x, y } = getSVGPoint(e.clientX, e.clientY);
      
      const targetNode = nodes.find(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        return Math.sqrt(dx * dx + dy * dy) < NODE_RADIUS;
      });
      
      if (targetNode && targetNode.id !== sourceId) {
        onEdgeCreate(sourceId, targetNode.id, startX, startY);
      }
      
      connectStateRef.current = null;
      forceUpdate(n => n + 1);
    }
  }, [nodes, getSVGPoint, onNodeUpdate, onEdgeCreate]);

  const handleEdgeClick = useCallback((e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    if (isSimulating) return;
    const { x, y } = getSVGPoint(e.clientX, e.clientY);
    onEdgeClick(edgeId, x, y);
  }, [isSimulating, getSVGPoint, onEdgeClick]);

  const getNodePosition = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  }, [nodes]);

  const getEdgePath = useCallback((edge: CausalEdge) => {
    const source = getNodePosition(edge.source);
    const target = getNodePosition(edge.target);
    
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    
    const cx = midX - dy * 0.1;
    const cy = midY + dx * 0.1;
    
    return `M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`;
  }, [getNodePosition]);

  const getEdgeMidpoint = useCallback((edge: CausalEdge) => {
    const source = getNodePosition(edge.source);
    const target = getNodePosition(edge.target);
    return {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    };
  }, [getNodePosition]);

  const getEdgeWeight = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    return edge ? edge.weight : 0.5;
  }, [edges]);

  const renderArrowMarker = () => (
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 255, 255, 0.4)" />
      </marker>
      <marker
        id="arrowhead-active"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#FF8C00" />
      </marker>
    </defs>
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        className="svg-canvas"
        onDoubleClick={handleDoubleClick}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderArrowMarker()}
        
        <g className="edges">
          {edges.map(edge => {
            const isActivated = activatedEdges.includes(edge.id);
            const midpoint = getEdgeMidpoint(edge);
            return (
              <g key={edge.id}>
                <path
                  className={`edge-path ${isActivated ? 'activated' : ''}`}
                  d={getEdgePath(edge)}
                  markerEnd={isActivated ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  onClick={(e) => handleEdgeClick(e, edge.id)}
                />
                <text
                  className="edge-weight-text"
                  x={midpoint.x}
                  y={midpoint.y - 8}
                >
                  {edge.weight.toFixed(1)}
                </text>
              </g>
            );
          })}
        </g>
        
        {connectStateRef.current && (
          <line
            x1={connectStateRef.current.startX}
            y1={connectStateRef.current.startY}
            x2={connectStateRef.current.currentX}
            y2={connectStateRef.current.currentY}
            stroke="#00D4FF"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.8"
          />
        )}
        
        <g className="nodes">
          {nodes.map(node => {
            const activation = activations.get(node.id);
            const isSelected = selectedNodeId === node.id;
            const isDragging = dragStateRef.current?.nodeId === node.id;
            const nodeColor = getNodeColor(node);
            
            return (
              <g
                key={node.id}
                className={`node-group ${isDragging ? 'dragging' : ''}`}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                {activation?.isInitial && (
                  <circle
                    className="initial-pulse-ring"
                    r={25}
                    cx={0}
                    cy={0}
                  />
                )}
                <circle
                  className={`node-circle ${isSelected ? 'selected' : ''}`}
                  r={NODE_RADIUS}
                  fill={nodeColor}
                  stroke="white"
                  strokeWidth="1"
                  style={{
                    color: nodeColor,
                    filter: isSelected 
                      ? `drop-shadow(0 0 80px ${nodeColor})` 
                      : `drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))`,
                  }}
                />
                <text className="node-text" y={3}>
                  {node.name}
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
            left: particle.x,
            top: particle.y,
            backgroundColor: particle.color,
            boxShadow: `0 0 10px ${particle.color}`,
          }}
        />
      ))}
      
      {weightSlider && (
        <div
          className="weight-slider-container"
          style={{
            left: weightSlider.x + 10,
            top: weightSlider.y - 30,
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
        </div>
      )}
    </div>
  );
};

export default CausalGraph;
