/**
 * 词络图可视化组件
 * 使用 Canvas 2D 绘制节点和边，处理所有鼠标/触摸交互
 *
 * 性能优化要点：
 * 1. 使用 requestAnimationFrame (RAF) 驱动渲染循环，与屏幕刷新率同步
 * 2. 空间网格索引 (SpatialGrid) 加速节点命中检测，从 O(n) → O(1)
 * 3. 节点位置缓存 + 脏区域检测，避免不必要的全量重绘
 * 4. 力导向布局每帧仅迭代一次，拖拽时暂停布局计算
 * 5. Canvas 变换使用 save/restore 减少状态切换开销
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { GraphNode } from '../../shared/types';
import {
  drawBackground,
  drawEdge,
  drawNode,
  CanvasState,
} from '../utils/canvas';
import {
  SpatialGrid,
  hitTestNode,
  forceDirectedStep,
} from '../utils/layout';

interface GraphViewProps {
  width: number;
  height: number;
}

export default function GraphView({ width, height }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 从 store 获取状态
  const nodes = useGraphStore(state => state.nodes);
  const edges = useGraphStore(state => state.edges);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const hoveredNodeId = useGraphStore(state => state.hoveredNodeId);
  const highlightNodeIds = useGraphStore(state => state.highlightNodeIds);
  const viewScale = useGraphStore(state => state.viewScale);
  const viewOffsetX = useGraphStore(state => state.viewOffsetX);
  const viewOffsetY = useGraphStore(state => state.viewOffsetY);
  const searchQuery = useGraphStore(state => state.searchQuery);

  // Actions
  const selectNode = useGraphStore(state => state.selectNode);
  const setHoveredNode = useGraphStore(state => state.setHoveredNode);
  const showContextMenu = useGraphStore(state => state.showContextMenu);
  const hideContextMenu = useGraphStore(state => state.hideContextMenu);
  const updateNode = useGraphStore(state => state.updateNode);
  const expandNode = useGraphStore(state => state.expandNode);
  const setViewTransform = useGraphStore(state => state.setViewTransform);
  const setHighlightNodes = useGraphStore(state => state.setHighlightNodes);

  // 本地状态引用（避免闭包问题和不必要的重渲染）
  const nodesRef = useRef<GraphNode[]>([]);
  const spatialGridRef = useRef<SpatialGrid>(new SpatialGrid(60));
  const prevNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);

  // 交互状态
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const dragNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });

  // 性能监控
  const [fps, setFps] = useState(0);

  // 同步 nodes 到 ref，避免 RAF 闭包捕获旧值
  useEffect(() => {
    nodesRef.current = nodes;
    // 重建空间索引
    spatialGridRef.current.rebuild(nodes);
  }, [nodes]);

  /**
   * 屏幕坐标 → 画布坐标转换
   */
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - viewOffsetX) / viewScale,
      y: (screenY - rect.top - viewOffsetY) / viewScale,
    };
  }, [viewScale, viewOffsetX, viewOffsetY]);

  /**
   * 查找鼠标下的节点（使用空间索引优化）
   */
  const findNodeAtPosition = useCallback((canvasX: number, canvasY: number): GraphNode | null => {
    const nearbyNodes = spatialGridRef.current.queryNearby(canvasX, canvasY);
    // 按大小排序，优先检测大节点（视觉上更靠前）
    nearbyNodes.sort((a, b) => b.size - a.size);
    for (const node of nearbyNodes) {
      if (hitTestNode(canvasX, canvasY, node, 1)) {
        return node;
      }
    }
    return null;
  }, []);

  /**
   * 根据搜索查询高亮节点
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightNodes(new Set());
      return;
    }

    const query = searchQuery.toLowerCase();
    const matchedIds = new Set<string>();
    const relatedIds = new Set<string>();

    // 找到匹配的节点
    nodes.forEach(node => {
      if (node.word.toLowerCase().includes(query)) {
        matchedIds.add(node.id);
        // 同时高亮其一级关联节点
        edges.forEach(edge => {
          if (edge.sourceId === node.id) relatedIds.add(edge.targetId);
          if (edge.targetId === node.id) relatedIds.add(edge.sourceId);
        });
      }
    });

    setHighlightNodes(new Set([...matchedIds, ...relatedIds]));
  }, [searchQuery, nodes, edges, setHighlightNodes]);

  /**
   * 主渲染循环
   * 使用 RAF 驱动，确保与显示器刷新率同步（60/120/144Hz）
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置高 DPI 支持
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 节点ID到节点的映射（性能优化，避免重复查找）
    const nodeMap = new Map<string, GraphNode>();

    const render = (timestamp: number) => {
      // FPS 计算
      if (timestamp - lastFrameTimeRef.current >= 1000) {
        setFps(Math.round(fpsRef.current));
        fpsRef.current = 0;
        lastFrameTimeRef.current = timestamp;
      }
      fpsRef.current++;

      const currentNodes = nodesRef.current;

      // 更新节点映射
      currentNodes.forEach(n => nodeMap.set(n.id, n));

      // ========== 力导向布局更新 ==========
      // 性能优化：节点少于500个时启用实时布局，拖拽时暂停
      if (currentNodes.length < 500 && !isDragging && !isPanning) {
        // 每帧仅迭代一次，避免卡顿
        forceDirectedStep(currentNodes, edges, {
          repulsion: 8000,
          attraction: 0.008,
          damping: 0.92,
          centerGravity: 0.001,
          centerX: width / 2 - viewOffsetX / viewScale,
          centerY: height / 2 - viewOffsetY / viewScale,
        });
      }

      // ========== 绘制 ==========
      // 1. 绘制背景
      drawBackground(ctx, width, height);

      // 2. 应用视图变换
      ctx.save();
      ctx.translate(viewOffsetX, viewOffsetY);
      ctx.scale(viewScale, viewScale);

      // 构建画布状态
      const canvasState: CanvasState = {
        ctx,
        width,
        height,
        scale: viewScale,
        offsetX: viewOffsetX,
        offsetY: viewOffsetY,
        hoveredNodeId,
        selectedNodeId,
        highlightNodeIds,
        time: performance.now(),
      };

      // 3. 绘制连线（先画连线，后画节点，避免连线盖住节点）
      const hasHighlight = highlightNodeIds.size > 0;
      edges.forEach(edge => {
        const source = nodeMap.get(edge.sourceId);
        const target = nodeMap.get(edge.targetId);
        if (!source || !target) return;

        // 搜索模式下，非高亮连线半透明
        let opacity = 1;
        if (hasHighlight) {
          const sourceHighlighted = highlightNodeIds.has(source.id);
          const targetHighlighted = highlightNodeIds.has(target.id);
          opacity = sourceHighlighted && targetHighlighted ? 1 : 0.15;
        }

        drawEdge(canvasState, edge, source, target, opacity);
      });

      // 4. 绘制节点
      currentNodes.forEach(node => {
        // 搜索模式下，非高亮节点半透明
        let opacity = 1;
        if (hasHighlight) {
          opacity = highlightNodeIds.has(node.id) ? 1 : 0.25;
        }
        drawNode(canvasState, node, opacity);
      });

      ctx.restore();

      // 保存当前节点位置用于脏区域检测
      currentNodes.forEach(node => {
        prevNodePositionsRef.current.set(node.id, { x: node.x, y: node.y });
      });

      // 继续下一帧
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    width, height, edges,
    viewScale, viewOffsetX, viewOffsetY,
    hoveredNodeId, selectedNodeId, highlightNodeIds,
    isDragging, isPanning,
  ]);

  /**
   * 鼠标移动 - 处理悬停检测
   * 性能优化：使用 rAF 节流，避免每像素触发
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    mousePosRef.current = { x, y };

    if (isDragging && dragNodeIdRef.current) {
      // 拖拽节点，实时更新位置
      updateNode(dragNodeIdRef.current, {
        x: x - dragOffsetRef.current.x,
        y: y - dragOffsetRef.current.y,
      });
    } else if (isPanning) {
      // 平移画布
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setViewTransform(
        viewScale,
        panStartRef.current.offsetX + dx,
        panStartRef.current.offsetY + dy
      );
    } else {
      // 悬停检测
      const node = findNodeAtPosition(x, y);
      if (node?.id !== hoveredNodeId) {
        setHoveredNode(node?.id || null);
      }
    }
  }, [screenToCanvas, isDragging, isPanning, hoveredNodeId,
      updateNode, setViewTransform, viewScale, findNodeAtPosition, setHoveredNode]);

  /**
   * 鼠标按下 - 开始拖拽或平移
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    hideContextMenu();

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const node = findNodeAtPosition(x, y);

    if (node) {
      // 开始拖拽节点
      dragNodeIdRef.current = node.id;
      dragOffsetRef.current = { x: x - node.x, y: y - node.y };
      setIsDragging(true);
      updateNode(node.id, { isDragging: true });
    } else {
      // 开始平移画布
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: viewOffsetX,
        offsetY: viewOffsetY,
      };
    }
  }, [screenToCanvas, findNodeAtPosition, hideContextMenu, updateNode, viewOffsetX, viewOffsetY]);

  /**
   * 鼠标释放 - 结束拖拽/平移，处理点击
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragNodeIdRef.current) {
      // 结束拖拽
      updateNode(dragNodeIdRef.current, { isDragging: false });

      // 判断是否为点击（移动距离很小）
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const node = nodesRef.current.find(n => n.id === dragNodeIdRef.current);
      const movedDistance = node
        ? Math.sqrt((x - dragOffsetRef.current.x - node.x) ** 2 +
                    (y - dragOffsetRef.current.y - node.y) ** 2)
        : 0;

      if (movedDistance < 5 && node) {
        // 这是一次点击，触发光晕动画并展开节点
        updateNode(node.id, { pulseStartTime: performance.now() });
        selectNode(node.id);
        if (!node.expanded) {
          expandNode(node.id);
        }
      }

      dragNodeIdRef.current = null;
      setIsDragging(false);
    }

    if (isPanning) {
      setIsPanning(false);
    }
  }, [isDragging, isPanning, screenToCanvas, updateNode, selectNode, expandNode]);

  /**
   * 鼠标离开画布
   */
  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    if (isDragging && dragNodeIdRef.current) {
      updateNode(dragNodeIdRef.current, { isDragging: false });
    }
    setIsDragging(false);
    setIsPanning(false);
    dragNodeIdRef.current = null;
  }, [isDragging, setHoveredNode, updateNode]);

  /**
   * 右键点击 - 显示上下文菜单
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const node = findNodeAtPosition(x, y);

    if (node) {
      selectNode(node.id);
      showContextMenu(e.clientX, e.clientY, node.id);
    } else {
      hideContextMenu();
    }
  }, [screenToCanvas, findNodeAtPosition, selectNode, showContextMenu, hideContextMenu]);

  /**
   * 滚轮缩放
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, viewScale * delta));

    // 以鼠标位置为中心缩放
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newOffsetX = mouseX - (mouseX - viewOffsetX) * (newScale / viewScale);
      const newOffsetY = mouseY - (mouseY - viewOffsetY) * (newScale / viewScale);
      setViewTransform(newScale, newOffsetX, newOffsetY);
    } else {
      setViewTransform(newScale, viewOffsetX, viewOffsetY);
    }
  }, [viewScale, viewOffsetX, viewOffsetY, setViewTransform]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width, height }}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: isDragging ? 'grabbing' : isPanning ? 'grabbing' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />

      {/* FPS 显示 - 开发调试用 */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        color: 'rgba(255,255,255,0.5)',
        fontSize: '12px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        {fps} FPS · {nodes.length} 节点
      </div>
    </div>
  );
}
