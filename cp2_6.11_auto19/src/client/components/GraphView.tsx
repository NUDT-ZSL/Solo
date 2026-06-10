/**
 * 词络图可视化组件
 * 使用 Canvas 2D 绘制节点和边，处理所有鼠标/触摸交互
 *
 * 性能优化要点：
 * 1. 使用 requestAnimationFrame (RAF) 驱动渲染循环，与屏幕刷新率同步
 * 2. 节流控制：时间戳判断，目标FPS=60，节点>300时降到30FPS
 * 3. 空间网格索引 (SpatialGrid) 加速节点命中检测，从 O(n) → O(1)
 * 4. 节点位置缓存 + 脏区域检测，避免不必要的全量重绘
 * 5. 力导向布局每帧仅迭代一次，拖拽时暂停布局计算
 * 6. Canvas 变换使用 save/restore 减少状态切换开销
 * 7. 拖拽时直接通过 store.updateNode 更新全局状态，确保数据持久化
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

// ========== 性能配置常量 ==========
const TARGET_FPS_HIGH = 60;       // 节点少时目标帧率
const TARGET_FPS_LOW = 30;        // 节点多时目标帧率
const NODE_COUNT_THRESHOLD = 300; // 帧率切换阈值
const FRAME_TIME_HIGH = 1000 / TARGET_FPS_HIGH;
const FRAME_TIME_LOW = 1000 / TARGET_FPS_LOW;

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
  const edgesRef = useRef(edges);
  const spatialGridRef = useRef<SpatialGrid>(new SpatialGrid(60));
  const prevNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animationFrameRef = useRef<number>();

  // ========== 性能优化：帧节流引用 ==========
  const lastFrameTimeRef = useRef<number>(0);   // 上一帧实际渲染时间戳
  const fpsAccumulatorRef = useRef<number>(0);  // FPS计算累积帧
  const fpsUpdateTimeRef = useRef<number>(0);   // FPS上次更新时间
  const needsRepaintRef = useRef<boolean>(true); // 脏标记：是否需要重绘

  // 交互状态（全部用ref避免React re-render导致卡顿）
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const dragNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const hoveredNodeIdRef = useRef<string | null>(null);

  // 视图变换ref，避免闭包捕获旧值
  const viewScaleRef = useRef(viewScale);
  const viewOffsetXRef = useRef(viewOffsetX);
  const viewOffsetYRef = useRef(viewOffsetY);
  const selectedNodeIdRef = useRef(selectedNodeId);
  const highlightNodeIdsRef = useRef(highlightNodeIds);

  // 性能监控
  const [fps, setFps] = useState(0);

  // 同步store数据到ref，避免RAF闭包捕获旧值
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { viewScaleRef.current = viewScale; }, [viewScale]);
  useEffect(() => { viewOffsetXRef.current = viewOffsetX; }, [viewOffsetX]);
  useEffect(() => { viewOffsetYRef.current = viewOffsetY; }, [viewOffsetY]);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);
  useEffect(() => { highlightNodeIdsRef.current = highlightNodeIds; }, [highlightNodeIds]);
  useEffect(() => { hoveredNodeIdRef.current = hoveredNodeId; }, [hoveredNodeId]);

  // 节点变化时重建空间索引
  useEffect(() => {
    spatialGridRef.current.rebuild(nodes);
    needsRepaintRef.current = true;
  }, [nodes]);

  /**
   * 屏幕坐标 → 画布坐标转换
   */
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - viewOffsetXRef.current) / viewScaleRef.current,
      y: (screenY - rect.top - viewOffsetYRef.current) / viewScaleRef.current,
    };
  }, []);

  /**
   * 查找鼠标下的节点（使用空间索引优化）
   */
  const findNodeAtPosition = useCallback((canvasX: number, canvasY: number): GraphNode | null => {
    const nearbyNodes = spatialGridRef.current.queryNearby(canvasX, canvasY);
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

    nodes.forEach(node => {
      if (node.word.toLowerCase().includes(query)) {
        matchedIds.add(node.id);
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
   *
   * 性能优化关键实现：
   * 1. 时间戳节流：根据节点数量动态调整目标帧率
   * 2. 脏标记检测：needsRepaintRef 为 true 时才重绘
   * 3. 节点拖拽时跳过力导向计算，节省CPU
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
      // ========== 帧节流逻辑 ==========
      // 动态目标帧率：节点越多帧率越低，保证流畅度
      const currentNodes = nodesRef.current;
      const targetFrameTime = currentNodes.length > NODE_COUNT_THRESHOLD
        ? FRAME_TIME_LOW
        : FRAME_TIME_HIGH;

      // FPS 统计（每秒更新一次）
      fpsAccumulatorRef.current++;
      if (timestamp - fpsUpdateTimeRef.current >= 1000) {
        setFps(fpsAccumulatorRef.current);
        fpsAccumulatorRef.current = 0;
        fpsUpdateTimeRef.current = timestamp;
      }

      // 时间戳节流：未到下一帧时间则跳过
      const timeSinceLastFrame = timestamp - lastFrameTimeRef.current;
      if (timeSinceLastFrame < targetFrameTime) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTimeRef.current = timestamp;

      // 脏标记检查：没有变化则跳过绘制（但仍继续循环）
      if (!needsRepaintRef.current && !isDraggingRef.current && !isPanningRef.current) {
        // 即使不重绘也检查是否需要重新布局
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      needsRepaintRef.current = false;

      // 更新节点映射
      nodeMap.clear();
      currentNodes.forEach(n => nodeMap.set(n.id, n));

      // ========== 力导向布局更新 ==========
      // 性能优化：节点少于500个时启用实时布局，拖拽/平移时暂停
      if (currentNodes.length < 500 && !isDraggingRef.current && !isPanningRef.current) {
        const laidOutNodes = forceDirectedStep(currentNodes, edgesRef.current, {
          repulsion: 8000,
          attraction: 0.008,
          damping: 0.92,
          centerGravity: 0.001,
          centerX: width / 2 - viewOffsetXRef.current / viewScaleRef.current,
          centerY: height / 2 - viewOffsetYRef.current / viewScaleRef.current,
        });
        // 将布局结果同步回 ref
        nodesRef.current = laidOutNodes;
        laidOutNodes.forEach(n => nodeMap.set(n.id, n));
      }

      // ========== 绘制 ==========
      // 1. 绘制背景
      drawBackground(ctx, width, height);

      // 2. 应用视图变换
      ctx.save();
      ctx.translate(viewOffsetXRef.current, viewOffsetYRef.current);
      ctx.scale(viewScaleRef.current, viewScaleRef.current);

      // 构建画布状态
      const canvasState: CanvasState = {
        ctx,
        width,
        height,
        scale: viewScaleRef.current,
        offsetX: viewOffsetXRef.current,
        offsetY: viewOffsetYRef.current,
        hoveredNodeId: hoveredNodeIdRef.current,
        selectedNodeId: selectedNodeIdRef.current,
        highlightNodeIds: highlightNodeIdsRef.current,
        time: performance.now(),
      };

      // 3. 绘制连线（先画连线，后画节点，避免连线盖住节点）
      const hasHighlight = highlightNodeIdsRef.current.size > 0;
      edgesRef.current.forEach(edge => {
        const source = nodeMap.get(edge.sourceId);
        const target = nodeMap.get(edge.targetId);
        if (!source || !target) return;

        let opacity = 1;
        if (hasHighlight) {
          const sourceHighlighted = highlightNodeIdsRef.current.has(source.id);
          const targetHighlighted = highlightNodeIdsRef.current.has(target.id);
          opacity = sourceHighlighted && targetHighlighted ? 1 : 0.15;
        }

        drawEdge(canvasState, edge, source, target, opacity);
      });

      // 4. 绘制节点
      currentNodes.forEach(node => {
        let opacity = 1;
        if (hasHighlight) {
          opacity = highlightNodeIdsRef.current.has(node.id) ? 1 : 0.25;
        }
        drawNode(canvasState, node, opacity);
      });

      ctx.restore();

      // 保存当前节点位置用于脏区域检测
      currentNodes.forEach(node => {
        prevNodePositionsRef.current.set(node.id, { x: node.x, y: node.y });
      });

      // 标记需要继续重绘（力导向还在运行时）
      if (currentNodes.length < 500 && !isDraggingRef.current) {
        needsRepaintRef.current = true;
      }

      // 继续下一帧
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height]);

  /**
   * 鼠标移动 - 处理悬停检测
   * 性能优化：直接操作ref，不触发React re-render
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    mousePosRef.current = { x, y };

    if (isDraggingRef.current && dragNodeIdRef.current) {
      // ===== 修复问题1：拖拽直接更新store中的节点坐标 =====
      // 实时更新store，确保数据全局同步，刷新后位置不会弹回
      const newX = x - dragOffsetRef.current.x;
      const newY = y - dragOffsetRef.current.y;

      // 同步更新ref（避免下一帧布局计算覆盖）
      const node = nodesRef.current.find(n => n.id === dragNodeIdRef.current);
      if (node) {
        node.x = newX;
        node.y = newY;
      }

      // 更新全局store（持久化位置）
      updateNode(dragNodeIdRef.current, { x: newX, y: newY });
      needsRepaintRef.current = true;

    } else if (isPanningRef.current) {
      // 平移画布
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const newOffsetX = panStartRef.current.offsetX + dx;
      const newOffsetY = panStartRef.current.offsetY + dy;
      setViewTransform(viewScaleRef.current, newOffsetX, newOffsetY);
      needsRepaintRef.current = true;

    } else {
      // 悬停检测 - 只有节点变化时才更新store（减少re-render）
      const node = findNodeAtPosition(x, y);
      const newHoveredId = node?.id || null;
      if (newHoveredId !== hoveredNodeIdRef.current) {
        hoveredNodeIdRef.current = newHoveredId;
        setHoveredNode(newHoveredId);
        needsRepaintRef.current = true;
      }
    }
  }, [screenToCanvas, updateNode, setViewTransform, findNodeAtPosition, setHoveredNode]);

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
      isDraggingRef.current = true;
      updateNode(node.id, { isDragging: true });
    } else {
      // 开始平移画布
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: viewOffsetXRef.current,
        offsetY: viewOffsetYRef.current,
      };
    }
  }, [screenToCanvas, findNodeAtPosition, hideContextMenu, updateNode]);

  /**
   * 鼠标释放 - 结束拖拽/平移，处理点击
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current && dragNodeIdRef.current) {
      // 结束拖拽
      const draggedNodeId = dragNodeIdRef.current;
      updateNode(draggedNodeId, { isDragging: false });

      // 判断是否为点击（移动距离很小）
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const node = nodesRef.current.find(n => n.id === draggedNodeId);
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
      isDraggingRef.current = false;
      needsRepaintRef.current = true;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      needsRepaintRef.current = true;
    }
  }, [screenToCanvas, updateNode, selectNode, expandNode]);

  /**
   * 鼠标离开画布
   */
  const handleMouseLeave = useCallback(() => {
    if (hoveredNodeIdRef.current) {
      hoveredNodeIdRef.current = null;
      setHoveredNode(null);
    }
    if (isDraggingRef.current && dragNodeIdRef.current) {
      updateNode(dragNodeIdRef.current, { isDragging: false });
    }
    isDraggingRef.current = false;
    isPanningRef.current = false;
    dragNodeIdRef.current = null;
    needsRepaintRef.current = true;
  }, [setHoveredNode, updateNode]);

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
    const newScale = Math.max(0.3, Math.min(3, viewScaleRef.current * delta));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newOffsetX = mouseX - (mouseX - viewOffsetXRef.current) * (newScale / viewScaleRef.current);
      const newOffsetY = mouseY - (mouseY - viewOffsetYRef.current) * (newScale / viewScaleRef.current);
      setViewTransform(newScale, newOffsetX, newOffsetY);
    } else {
      setViewTransform(newScale, viewOffsetXRef.current, viewOffsetYRef.current);
    }
    needsRepaintRef.current = true;
  }, [setViewTransform]);

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
          cursor: isDraggingRef.current ? 'grabbing' : isPanningRef.current ? 'grabbing' : 'default',
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
