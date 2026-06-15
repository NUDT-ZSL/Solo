import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type { NodeData, EdgeData, Particle, ViewMode } from '../types';
import { edgeApi, nodeApi } from '../api';
import {
  distance,
  generateRandomHue,
  hslToString,
  mixHue,
  getBezierPoint,
  snapToGrid,
  isMobile,
  heatColor,
  heatSize,
  edgeOpacity,
  lerp,
} from '../utils';

interface CanvasProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onNodesChange: (nodes: NodeData[] | ((prev: NodeData[]) => NodeData[])) => void;
  onEdgesChange: (edges: EdgeData[] | ((prev: EdgeData[]) => EdgeData[])) => void;
  viewMode: ViewMode;
  readOnly?: boolean;
}

export interface CanvasHandle {
  getCanvasSnapshot: () => void;
}

type DragState =
  | { type: 'none' }
  | { type: 'node'; nodeId: string; offsetX: number; offsetY: number }
  | { type: 'connecting'; fromNodeId: string; mouseX: number; mouseY: number };

interface InputModalState {
  visible: boolean;
  x: number;
  y: number;
  value: string;
}

const VIRTUAL_THRESHOLD = 50;
const MAX_PARTICLES = 200;
const PARTICLES_PER_SECOND = 10;

const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  ({ nodes, edges, onNodesChange, onEdgesChange, viewMode, readOnly }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragState, setDragState] = useState<DragState>({ type: 'none' });
    const [inputModal, setInputModal] = useState<InputModalState>({
      visible: false,
      x: 0,
      y: 0,
      value: '',
    });
    const [particles, setParticles] = useState<Particle[]>([]);
    const [mobile] = useState(() => isMobile());
    const nodeSize = mobile ? 32 : 40;
    const particleIdRef = useRef(0);
    const lastParticleTimeRef = useRef<Record<string, number>>({});
    const likedEdgesRef = useRef<Set<string>>(new Set());
    const snapAnimRef = useRef<number | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const [viewport, setViewport] = useState({ width: 1920, height: 1080 });

    useImperativeHandle(ref, () => ({
      getCanvasSnapshot: () => {
        console.log('画布快照', { nodes, edges });
      },
    }));

    const edgeConnections = useMemo(() => {
      const conn: Record<string, number> = {};
      nodes.forEach((n) => (conn[n.id] = 0));
      edges.forEach((e) => {
        conn[e.from] = (conn[e.from] || 0) + 1;
        conn[e.to] = (conn[e.to] || 0) + 1;
      });
      return conn;
    }, [nodes, edges]);

    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setViewport({ width: rect.width, height: rect.height });
        }
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }, []);

    const visibleNodes = useMemo(() => {
      if (nodes.length <= VIRTUAL_THRESHOLD) return nodes;
      const pad = 120;
      return nodes.filter(
        (n) =>
          n.x >= -pad &&
          n.x <= viewport.width + pad &&
          n.y >= -pad &&
          n.y <= viewport.height + pad
      );
    }, [nodes, viewport]);

    const visibleNodeIds = useMemo(
      () => new Set(visibleNodes.map((n) => n.id)),
      [visibleNodes]
    );

    const visibleEdges = useMemo(() => {
      if (nodes.length <= VIRTUAL_THRESHOLD) return edges;
      return edges.filter(
        (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)
      );
    }, [edges, visibleNodeIds, nodes.length]);

    const getSvgCoords = useCallback((clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }, []);

    const createNode = useCallback(
      async (text: string, x: number, y: number) => {
        const newNode: NodeData = {
          id: `temp_${Date.now()}`,
          text,
          x,
          y,
          hue: generateRandomHue(),
          createdAt: Date.now(),
        };
        onNodesChange([...nodes, newNode]);
        try {
          const saved = await nodeApi.createOrUpdate(newNode);
          onNodesChange((prev) =>
            prev.map((n) => (n.id === newNode.id ? saved : n))
          );
        } catch (e) {
          console.error('创建节点失败:', e);
        }
      },
      [nodes, onNodesChange]
    );

    const createEdge = useCallback(
      async (from: string, to: string) => {
        if (from === to) return;
        const exists = edges.some(
          (e) =>
            (e.from === from && e.to === to) || (e.from === to && e.to === from)
        );
        if (exists) return;
        try {
          const newEdge = await edgeApi.create(from, to);
          onEdgesChange([...edges, newEdge]);
          lastParticleTimeRef.current[newEdge.id] = Date.now();
        } catch (e) {
          console.error('创建连线失败:', e);
        }
      },
      [edges, onEdgesChange]
    );

    const triggerParticleBurst = useCallback((edgeId: string) => {
      const now = Date.now();
      const start = lastParticleTimeRef.current[edgeId] || now;
      const elapsed = (now - start) / 1000;
      const totalParticles = Math.min(
        Math.floor(elapsed * PARTICLES_PER_SECOND),
        40
      );
      const burst: Particle[] = [];
      for (let i = 0; i < totalParticles; i++) {
        particleIdRef.current++;
        burst.push({
          id: particleIdRef.current,
          progress: (i / totalParticles) * 0.8,
          edgeId,
          size: 3 + Math.random() * 2,
          opacity: 1,
          duration: 2000,
          startTime: now - i * (2000 / totalParticles),
        });
      }
      setParticles((prev) => {
        const combined = [...prev, ...burst];
        if (combined.length > MAX_PARTICLES) {
          return combined.slice(combined.length - MAX_PARTICLES);
        }
        return combined;
      });
    }, []);

    useEffect(() => {
      const loop = () => {
        const now = Date.now();
        setParticles((prev) => {
          let changed = false;
          const updated = prev
            .map((p) => {
              const elapsed = now - p.startTime;
              const progress = elapsed / p.duration;
              if (progress >= 1) {
                changed = true;
                return null;
              }
              const newProgress = progress;
              const newOpacity = progress > 0.8
                ? 1 - (progress - 0.8) / 0.2
                : 1;
              if (
                Math.abs(newProgress - p.progress) > 0.001 ||
                Math.abs(newOpacity - p.opacity) > 0.01
              ) {
                changed = true;
                return { ...p, progress: newProgress, opacity: newOpacity };
              }
              return p;
            })
            .filter((p): p is Particle => p !== null);
          return changed ? updated : prev;
        });

        edges.forEach((edge) => {
          const lastT = lastParticleTimeRef.current[edge.id] || 0;
          if (now - lastT >= 1000 / PARTICLES_PER_SECOND) {
            lastParticleTimeRef.current[edge.id] = now;
            particleIdRef.current++;
            setParticles((prev) => {
              if (prev.length >= MAX_PARTICLES) return prev;
              return [
                ...prev,
                {
                  id: particleIdRef.current,
                  progress: 0,
                  edgeId: edge.id,
                  size: 3 + Math.random() * 2,
                  opacity: 1,
                  duration: 2000,
                  startTime: now,
                },
              ];
            });
          }
        });

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, [edges]);

    const handleLike = useCallback(
      async (edgeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (likedEdgesRef.current.has(edgeId)) return;
        likedEdgesRef.current.add(edgeId);
        try {
          const res = await edgeApi.like(edgeId);
          onEdgesChange((prev) =>
            prev.map((ed) => (ed.id === edgeId ? { ...ed, likes: res.likes } : ed))
          );
        } catch (err) {
          console.error('点赞失败:', err);
          likedEdgesRef.current.delete(edgeId);
        }
      },
      [onEdgesChange]
    );

    const handleCanvasClick = useCallback(
      (e: React.MouseEvent) => {
        if (readOnly) return;
        if (dragState.type !== 'none') return;
        const { x, y } = getSvgCoords(e.clientX, e.clientY);
        setInputModal({ visible: true, x, y, value: '' });
      },
      [dragState, readOnly, getSvgCoords]
    );

    const handleNodeMouseDown = useCallback(
      (e: React.MouseEvent, node: NodeData) => {
        if (readOnly) return;
        e.stopPropagation();
        const { x, y } = getSvgCoords(e.clientX, e.clientY);
        setDragState({
          type: 'node',
          nodeId: node.id,
          offsetX: x - node.x,
          offsetY: y - node.y,
        });
      },
      [readOnly, getSvgCoords]
    );

    const handleNodeMouseUp = useCallback(
      (e: React.MouseEvent, targetNode: NodeData) => {
        if (readOnly) return;
        if (dragState.type === 'connecting' && dragState.fromNodeId !== targetNode.id) {
          e.stopPropagation();
          createEdge(dragState.fromNodeId, targetNode.id);
        }
        setDragState({ type: 'none' });
      },
      [readOnly, dragState, createEdge]
    );

    const handleConnectStart = useCallback(
      (e: React.MouseEvent, node: NodeData) => {
        if (readOnly) return;
        e.stopPropagation();
        e.preventDefault();
        const { x, y } = getSvgCoords(e.clientX, e.clientY);
        setDragState({ type: 'connecting', fromNodeId: node.id, mouseX: x, mouseY: y });
      },
      [readOnly, getSvgCoords]
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        const { x, y } = getSvgCoords(e.clientX, e.clientY);

        if (dragState.type === 'node') {
          const newX = x - dragState.offsetX;
          const newY = y - dragState.offsetY;
          onNodesChange((prev) =>
            prev.map((n) => (n.id === dragState.nodeId ? { ...n, x: newX, y: newY } : n))
          );
        } else if (dragState.type === 'connecting') {
          setDragState({ ...dragState, mouseX: x, mouseY: y });
        }
      },
      [dragState, onNodesChange, getSvgCoords]
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (dragState.type === 'node') {
          const node = nodes.find((n) => n.id === dragState.nodeId);
          if (node) {
            const snapped = snapToGrid(node, nodes, mobile ? 32 : 40, 100);
            if (snapped) {
              const startX = node.x;
              const startY = node.y;
              const startTime = performance.now();
              const duration = 200;
              if (snapAnimRef.current) cancelAnimationFrame(snapAnimRef.current);
              const animate = (now: number) => {
                const t = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                const ix = lerp(startX, snapped.x, eased);
                const iy = lerp(startY, snapped.y, eased);
                onNodesChange((prev) =>
                  prev.map((n) => (n.id === node.id ? { ...n, x: ix, y: iy } : n))
                );
                if (t < 1) {
                  snapAnimRef.current = requestAnimationFrame(animate);
                }
              };
              snapAnimRef.current = requestAnimationFrame(animate);
            }
          }
        }
        setDragState({ type: 'none' });
      },
      [dragState, nodes, onNodesChange, mobile]
    );

    useEffect(() => {
      return () => {
        if (snapAnimRef.current) cancelAnimationFrame(snapAnimRef.current);
      };
    }, []);

    const renderEdge = (edge: EdgeData) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const curvature = mobile ? edge.curvature / 2 : edge.curvature;
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const mx = (fromNode.x + toNode.x) / 2;
      const my = (fromNode.y + toNode.y) / 2;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const curveAmount = len * curvature;
      const cx = mx + nx * curveAmount;
      const cy = my + ny * curveAmount;

      const fromHue =
        viewMode === 'heat'
          ? heatColor(edgeConnections[edge.from] || 0)
          : fromNode.hue;
      const toHue =
        viewMode === 'heat'
          ? heatColor(edgeConnections[edge.to] || 0)
          : toNode.hue;
      const midHue = mixHue(fromHue, toHue, 0.5);

      let opacity = 1;
      if (viewMode === 'heat') {
        opacity = edgeOpacity(
          edgeConnections[edge.from] || 0,
          edgeConnections[edge.to] || 0
        );
      }

      const gradId = `grad-${edge.id}`;
      const midPoint = getBezierPoint(
        fromNode.x,
        fromNode.y,
        cx,
        cy,
        toNode.x,
        toNode.y,
        0.5
      );

      const edgeParticles = particles.filter((p) => p.edgeId === edge.id);

      return (
        <g key={edge.id} className="edge-group">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                stopColor={hslToString(fromHue, 80, 70)}
                stopOpacity={opacity}
              />
              <stop
                offset="50%"
                stopColor={hslToString(midHue, 80, 70)}
                stopOpacity={opacity}
              />
              <stop
                offset="100%"
                stopColor={hslToString(toHue, 80, 70)}
                stopOpacity={opacity}
              />
            </linearGradient>
          </defs>

          <path
            className="edge-path"
            d={`M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${toNode.x} ${toNode.y}`}
            stroke={`url(#${gradId})`}
            strokeWidth={2.5}
            strokeOpacity={opacity}
          />

          {edgeParticles.map((p) => {
            const pt = getBezierPoint(
              fromNode.x,
              fromNode.y,
              cx,
              cy,
              toNode.x,
              toNode.y,
              p.progress
            );
            const particleHue =
              p.progress < 0.5
                ? mixHue(fromHue, midHue, p.progress * 2)
                : mixHue(midHue, toHue, (p.progress - 0.5) * 2);
            return (
              <circle
                key={p.id}
                cx={pt.x}
                cy={pt.y}
                r={p.size}
                fill={hslToString(particleHue, 90, 80)}
                opacity={p.opacity}
                style={{
                  filter: `drop-shadow(0 0 ${p.size * 2}px ${hslToString(
                    particleHue,
                    90,
                    70,
                    p.opacity
                  )})`,
                }}
              />
            );
          })}

          <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
            <rect
              x={-edge.spark.length * 7 - 8}
              y={-26}
              width={edge.spark.length * 14 + 16}
              height={22}
              rx={11}
              fill="rgba(0, 0, 0, 0.55)"
              opacity={0.9}
            />
            <text className="spark-label" y={-15}>
              {edge.spark}
            </text>

            <g
              transform={`translate(${-8}, 6)`}
              onClick={(e) => handleLike(edge.id, e)}
              className={`like-btn ${likedEdgesRef.current.has(edge.id) ? 'liked' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill={likedEdgesRef.current.has(edge.id) ? '#ff6584' : 'rgba(255,255,255,0.5)'}
                  stroke="#ff6584"
                  strokeWidth="1"
                />
              </svg>
              <text className="like-count" x={14} y={12}>
                {edge.likes}
              </text>
            </g>
          </g>
        </g>
      );
    };

    const renderNode = (node: NodeData) => {
      const isDragging =
        dragState.type === 'node' && dragState.nodeId === node.id;
      const connCount = edgeConnections[node.id] || 0;

      let hue = node.hue;
      let size = nodeSize;
      if (viewMode === 'heat') {
        hue = heatColor(connCount);
        size = heatSize(connCount, nodeSize, 8);
      }

      const fillColor = `hsla(${hue}, 80%, 90%, 0.25)`;
      const strokeColor = `hsl(${hue}, 80%, 70%)`;
      const textColor = `hsl(${hue}, 40%, 20%)`;

      return (
        <g
          key={node.id}
          className={`node ${isDragging ? 'dragging' : ''}`}
          transform={`translate(${node.x}, ${node.y})`}
          onMouseDown={(e) => handleNodeMouseDown(e, node)}
          onMouseUp={(e) => handleNodeMouseUp(e, node)}
          style={{ color: strokeColor }}
        >
          <circle
            className="node-glass"
            cx={0}
            cy={0}
            r={size / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              filter: isDragging
                ? `drop-shadow(0 0 16px ${strokeColor})`
                : 'none',
            }}
          />

          <text
            className="node-text"
            x={0}
            y={0}
            fill={textColor}
            fontSize={Math.max(9, Math.min(12, size / 3.5))}
          >
            {node.text.length > 4 ? node.text.slice(0, 4) + '…' : node.text}
          </text>

          {!readOnly && (
            <circle
              cx={size / 2 - 2}
              cy={0}
              r={5}
              fill="#6c63ff"
              stroke="#fff"
              strokeWidth={1.5}
              style={{
                cursor: 'crosshair',
                filter: 'drop-shadow(0 0 4px #6c63ff)',
              }}
              onMouseDown={(e) => handleConnectStart(e, node)}
            />
          )}

          {viewMode === 'heat' && connCount > 0 && (
            <text
              x={0}
              y={size / 2 + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="10"
            >
              {connCount}连接
            </text>
          )}
        </g>
      );
    };

    const renderTempLine = () => {
      if (dragState.type !== 'connecting') return null;
      const fromNode = nodes.find((n) => n.id === dragState.fromNodeId);
      if (!fromNode) return null;
      const mx = (fromNode.x + dragState.mouseX) / 2;
      const my = (fromNode.y + dragState.mouseY) / 2;
      const curvature = 0.3;
      const dx = dragState.mouseX - fromNode.x;
      const dy = dragState.mouseY - fromNode.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cx = mx + (-dy / len) * len * curvature;
      const cy = my + (dx / len) * len * curvature;

      return (
        <path
          d={`M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${dragState.mouseX} ${dragState.mouseY}`}
          fill="none"
          stroke="rgba(108, 99, 255, 0.6)"
          strokeWidth={2}
          strokeDasharray="6 4"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(108, 99, 255, 0.6))',
            pointerEvents: 'none',
          }}
        />
      );
    };

    return (
      <div
        ref={containerRef}
        className="canvas-container"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          className="canvas-svg"
          style={{
            width: viewport.width,
            height: viewport.height,
          }}
        >
          <defs>
            <radialGradient id="bg-gradient" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1f1f3a" />
              <stop offset="100%" stopColor="#1a1a2e" />
            </radialGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(108, 99, 255, 0.04)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#bg-gradient)" />
          <rect width="100%" height="100%" fill="url(#grid)" />

          {visibleEdges.map(renderEdge)}
          {renderTempLine()}
          {visibleNodes.map(renderNode)}
        </svg>

        {inputModal.visible && !readOnly && (
          <div
            className="input-modal"
            style={{
              left: Math.min(inputModal.x + 20, window.innerWidth - 360),
              top: Math.min(inputModal.y + 20, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>✨ 创建灵感节点</h3>
            <input
              autoFocus
              placeholder="输入一个词或想法..."
              value={inputModal.value}
              onChange={(e) =>
                setInputModal({ ...inputModal, value: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputModal.value.trim()) {
                  createNode(
                    inputModal.value.trim(),
                    inputModal.x,
                    inputModal.y
                  );
                  setInputModal({ ...inputModal, visible: false, value: '' });
                } else if (e.key === 'Escape') {
                  setInputModal({ ...inputModal, visible: false, value: '' });
                }
              }}
              maxLength={20}
            />
            <div className="modal-buttons">
              <button
                className="btn-secondary"
                onClick={() =>
                  setInputModal({ ...inputModal, visible: false, value: '' })
                }
              >
                取消
              </button>
              <button
                className="btn-primary"
                disabled={!inputModal.value.trim()}
                onClick={() => {
                  if (inputModal.value.trim()) {
                    createNode(
                      inputModal.value.trim(),
                      inputModal.x,
                      inputModal.y
                    );
                    setInputModal({ ...inputModal, visible: false, value: '' });
                  }
                }}
              >
                创建
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';
export default Canvas;
