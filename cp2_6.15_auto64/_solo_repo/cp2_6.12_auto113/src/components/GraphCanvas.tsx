import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Node, Edge, NodeColor, EdgeDragState } from '@/types';
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph';
import {
  GRID_SIZE,
  CANVAS_BACKGROUND,
  EDGE_DRAG_COLOR,
  LAYOUT_ANIMATION_DURATION,
  MOBILE_BREAKPOINT,
} from '@/utils/constants';
import { createLayoutWorker } from '@/utils/forceLayout';
import { exportToPNG, exportToJSON } from '@/utils/exportUtils';
import { NodeComponent } from './NodeComponent';
import { EdgeComponent } from './EdgeComponent';
import { Toolbar } from './Toolbar';
import { ColorLegend } from './ColorLegend';
import { ContextMenu } from './ContextMenu';

export const GraphCanvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    nodes,
    edges,
    addNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    changeNodeColor,
    clearCanvas,
    applyLayout,
    saveToStorage,
  } = useKnowledgeGraph();

  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [isMobile, setIsMobile] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<NodeColor | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    nodeId: undefined as string | undefined,
  });
  const [edgeDrag, setEdgeDrag] = useState<EdgeDragState>({
    isDragging: false,
    sourceNodeId: '',
    mouseX: 0,
    mouseY: 0,
  });
  const [viewport, setViewport] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setCanvasSize({ width, height });
      setIsMobile(width < MOBILE_BREAKPOINT);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    saveToStorage();
  }, [nodes, edges, saveToStorage]);

  const svgToCanvas = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - viewport.offsetX) / viewport.scale;
    const y = (clientY - rect.top - viewport.offsetY) / viewport.scale;
    return { x, y };
  }, [viewport]);

  const nodeCountByColor = useMemo(() => {
    const counts: Record<NodeColor, number> = {
      red: 0, orange: 0, yellow: 0, green: 0,
      cyan: 0, blue: 0, purple: 0, gray: 0,
    };
    nodes.forEach((n) => {
      counts[n.color] = (counts[n.color] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const isNodeFiltered = useCallback((node: Node) => {
    return colorFilter !== null && node.color !== colorFilter;
  }, [colorFilter]);

  const isEdgeFiltered = useCallback((edge: Edge) => {
    if (colorFilter === null) return false;
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return false;
    return source.color !== colorFilter || target.color !== colorFilter;
  }, [colorFilter, nodeMap]);

  const handleAddNodeAtCenter = useCallback(() => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;
    addNode(centerX + offsetX, centerY + offsetY);
  }, [addNode, canvasSize]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0 || isAnimating) return;
    setIsAnimating(true);

    const worker = createLayoutWorker();
    const options = {
      width: canvasSize.width,
      height: canvasSize.height,
      iterations: 300,
      nodeDistance: 120,
    };

    const startPositions = new Map(
      nodes.map((n) => [n.id, { x: n.x, y: n.y }])
    );

    worker.postMessage({
      nodes: nodes.map((n) => ({
        ...n,
        isRoot: n.isRoot || nodes.length > 0 && n.id === nodes[0].id,
      })),
      edges,
      options,
    });

    const handleMessage = (event: MessageEvent) => {
      const result = event.data;
      worker.removeEventListener('message', handleMessage);

      const targetPositions = new Map<string, { id: string; x: number; y: number }>(
        result.nodes.map((n: { id: string; x: number; y: number }) => [n.id, n])
      );

      const startTime = performance.now();
      const duration = LAYOUT_ANIMATION_DURATION * 1000;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const t = progress;
        const easeInOut = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;

        nodes.forEach((node) => {
          const start = startPositions.get(node.id);
          const target = targetPositions.get(node.id);
          if (start && target) {
            const newX = start.x + (target.x - start.x) * easeInOut;
            const newY = start.y + (target.y - start.y) * easeInOut;
            updateNodePosition(node.id, newX, newY);
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          applyLayout(result.nodes);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    };

    worker.addEventListener('message', handleMessage);
  }, [nodes, edges, canvasSize, applyLayout, updateNodePosition, isAnimating]);

  const handleExportPNG = useCallback(async () => {
    if (!svgRef.current || nodes.length === 0) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((n) => {
        minX = Math.min(minX, n.x - n.width / 2);
        minY = Math.min(minY, n.y - n.height / 2);
        maxX = Math.max(maxX, n.x + n.width / 2);
        maxY = Math.max(maxY, n.y + n.height / 2);
      });
      const padding = 60;
      const width = Math.ceil(maxX - minX + padding * 2);
      const height = Math.ceil(maxY - minY + padding * 2);
      await exportToPNG(svgRef.current, width, height);
    } catch (err) {
      console.error('Export PNG failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [nodes]);

  const handleExportJSON = useCallback(() => {
    if (nodes.length === 0) return;
    setIsExporting(true);
    setTimeout(() => {
      exportToJSON(nodes, edges);
      setIsExporting(false);
    }, 500);
  }, [nodes, edges]);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: undefined });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as SVGElement;
    const nodeElement = target.closest('[data-node-id]');
    let nodeId: string | undefined;
    if (nodeElement) {
      nodeId = nodeElement.getAttribute('data-node-id') || undefined;
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      nodeId,
    });
  }, []);

  const handleContextMenuAddNode = useCallback(() => {
    const pos = svgToCanvas(contextMenu.x, contextMenu.y);
    addNode(pos.x, pos.y);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: undefined });
  }, [contextMenu.x, contextMenu.y, addNode, svgToCanvas]);

  const handleContextMenuDeleteNode = useCallback(() => {
    if (contextMenu.nodeId) {
      deleteNode(contextMenu.nodeId);
      if (selectedNodeId === contextMenu.nodeId) {
        setSelectedNodeId(null);
      }
    }
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: undefined });
  }, [contextMenu.nodeId, deleteNode, selectedNodeId]);

  const handleContextMenuEditNode = useCallback(() => {
    if (contextMenu.nodeId) {
      setSelectedNodeId(contextMenu.nodeId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: undefined });
  }, [contextMenu.nodeId]);

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }, []);

  const handleNodeDeselect = useCallback(() => {
    // Do nothing on anchor click
  }, []);

  const handleNodeDragStart = useCallback((_id: string, _e: React.MouseEvent) => {
    // Drag handled in node component
  }, []);

  const handleNodeDragMove = useCallback((id: string, x: number, y: number) => {
    updateNodePosition(id, x, y);
  }, [updateNodePosition]);

  const handleNodeDragEnd = useCallback(() => {
    // Drag ended
  }, []);

  const handleAnchorDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    const pos = svgToCanvas(e.clientX, e.clientY);
    const node = nodeMap.get(nodeId);
    if (node) {
      setEdgeDrag({
        isDragging: true,
        sourceNodeId: nodeId,
        mouseX: node.x,
        mouseY: node.y + node.height / 2,
      });
    }
    void pos;
  }, [svgToCanvas, nodeMap]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (edgeDrag.isDragging) {
      const pos = svgToCanvas(e.clientX, e.clientY);
      setEdgeDrag((prev) => ({
        ...prev,
        mouseX: pos.x,
        mouseY: pos.y,
      }));
    }
    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        offsetX: prev.offsetX + (e.clientX - panStart.x),
        offsetY: prev.offsetY + (e.clientY - panStart.y),
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [edgeDrag.isDragging, svgToCanvas, isPanning, panStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (edgeDrag.isDragging) {
      const pos = svgToCanvas(e.clientX, e.clientY);
      let targetNodeId: string | null = null;

      for (const node of nodes) {
        const halfW = (isMobile ? Math.max(node.width, 150) : node.width) / 2;
        const halfH = node.height / 2;
        if (
          pos.x >= node.x - halfW &&
          pos.x <= node.x + halfW &&
          pos.y >= node.y - halfH &&
          pos.y <= node.y + halfH &&
          node.id !== edgeDrag.sourceNodeId
        ) {
          targetNodeId = node.id;
          break;
        }
      }

      if (targetNodeId) {
        addEdge(edgeDrag.sourceNodeId, targetNodeId);
      }

      setEdgeDrag({
        isDragging: false,
        sourceNodeId: '',
        mouseX: 0,
        mouseY: 0,
      });
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [edgeDrag, svgToCanvas, nodes, addEdge, isMobile, isPanning]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(3, prev.scale * delta)),
    }));
  }, []);

  const edgeDragSourceNode = nodeMap.get(edgeDrag.sourceNodeId);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: CANVAS_BACKGROUND,
      }}
      onContextMenu={handleContextMenu}
    >
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        style={{
          display: 'block',
          cursor: isPanning ? 'grabbing' : edgeDrag.isDragging ? 'crosshair' : 'default',
        }}
      >
        <defs>
          <pattern
            id="grid"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
              fill="none"
              stroke="#9e9e9e"
              strokeWidth="0.5"
              opacity="0.1"
            />
          </pattern>
        </defs>

        <g
          transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}
        >
          <rect
            x={-10000}
            y={-10000}
            width={20000}
            height={20000}
            fill="url(#grid)"
          />

          <g>
            {edges.map((edge) => (
              <EdgeComponent
                key={edge.id}
                edge={edge}
                sourceNode={nodeMap.get(edge.source)}
                targetNode={nodeMap.get(edge.target)}
                isSelected={selectedEdgeId === edge.id}
                isFiltered={isEdgeFiltered(edge)}
                onSelect={setSelectedEdgeId}
                onUpdateEdge={updateEdge}
                onDelete={deleteEdge}
              />
            ))}
          </g>

          {edgeDrag.isDragging && edgeDragSourceNode && (
            <motion.line
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              x1={edgeDragSourceNode.x}
              y1={edgeDragSourceNode.y + edgeDragSourceNode.height / 2}
              x2={edgeDrag.mouseX}
              y2={edgeDrag.mouseY}
              stroke={EDGE_DRAG_COLOR}
              strokeWidth={2}
              strokeDasharray="6 6"
              pointerEvents="none"
            />
          )}

          <g>
            {nodes.map((node) => (
              <g key={node.id} data-node-id={node.id}>
                <NodeComponent
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  isFiltered={isNodeFiltered(node)}
                  scale={viewport.scale}
                  onSelect={handleNodeSelect}
                  onDeselect={handleNodeDeselect}
                  onDragStart={handleNodeDragStart}
                  onDragMove={handleNodeDragMove}
                  onDragEnd={handleNodeDragEnd}
                  onAnchorDragStart={handleAnchorDragStart}
                  onUpdateNode={updateNode}
                  onChangeColor={changeNodeColor}
                  onDelete={(id) => {
                    deleteNode(id);
                    setSelectedNodeId(null);
                  }}
                />
              </g>
            ))}
          </g>
        </g>
      </svg>

      <Toolbar
        isMobile={isMobile}
        isExporting={isExporting}
        showLegend={showLegend}
        onAddNode={handleAddNodeAtCenter}
        onAutoLayout={handleAutoLayout}
        onToggleLegend={() => setShowLegend((v) => !v)}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        onClearCanvas={() => {
          clearCanvas();
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
      />

      <AnimatePresence>
        {showLegend && nodes.length > 0 && (
          <ColorLegend
            activeFilter={colorFilter}
            onFilterChange={setColorFilter}
            nodeCountByColor={nodeCountByColor}
          />
        )}
      </AnimatePresence>

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        hasNode={!!contextMenu.nodeId}
        onAddNode={handleContextMenuAddNode}
        onDeleteNode={handleContextMenuDeleteNode}
        onEditNode={handleContextMenuEditNode}
        onClose={() =>
          setContextMenu({ visible: false, x: 0, y: 0, nodeId: undefined })
        }
      />

      <div
        style={{
          position: 'fixed',
          left: 16,
          top: 16,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: '8px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
          color: '#616161',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <span>
            <strong style={{ color: '#1976d2' }}>{nodes.length}</strong> 节点
          </span>
          <span>
            <strong style={{ color: '#ff9800' }}>{edges.length}</strong> 连线
          </span>
          <span>
            缩放 <strong style={{ color: '#424242' }}>{Math.round(viewport.scale * 100)}%</strong>
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: '#9e9e9e',
          }}
        >
          {isMobile ? '长按节点可拖动，滚轮缩放' : 'Alt+拖动平移 | 滚轮缩放 | 右键添加节点'}
        </div>
      </div>

      {nodes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#9e9e9e',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              opacity: 0.5,
            }}
          >
            🧠
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#757575', marginBottom: 8 }}>
            开始创建你的知识图谱
          </div>
          <div style={{ fontSize: 13 }}>
            {isMobile ? '点击右上角 + 按钮添加第一个节点' : '右键点击画布或点击右上角 + 按钮添加第一个节点'}
          </div>
          {!isMobile && (
            <div style={{ fontSize: 12, marginTop: 12, opacity: 0.7 }}>
              💡 从节点底部蓝色圆点拖拽可创建连线
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default GraphCanvas;
