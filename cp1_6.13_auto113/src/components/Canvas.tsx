import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, OnDragEndResponder, OnDragUpdateResponder } from 'react-beautiful-dnd';
import NodeCard from './NodeCard';
import type { BookmarkNode } from '../api/bookmarks';
import type { FlatBookmarkMap } from '../App';

interface CanvasProps {
  flatMap: FlatBookmarkMap;
  bookmarks: BookmarkNode[];
  newNodeIds: Set<string>;
  deletingNodeIds: Set<string>;
  onAddBookmark: (parentId: string, title: string, url: string) => void;
  onUpdateParent: (nodeId: string, newParentId: string) => void;
  onDeleteBookmark: (id: string) => void;
}

const NODE_WIDTH = 240;
const NODE_HEIGHT = 72;
const CANVAS_PADDING = 20;

export default function Canvas({
  flatMap,
  bookmarks,
  newNodeIds,
  deletingNodeIds,
  onAddBookmark,
  onUpdateParent,
  onDeleteBookmark,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 1200, height: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, viewX: 0, viewY: 0 });

  const nodeIds = useMemo(() => Object.keys(flatMap), [flatMap]);

  const getAllDescendantIds = useCallback((nodeId: string): string[] => {
    const descendants: string[] = [];
    const children = nodeIds.filter(id => flatMap[id].parentId === nodeId);
    children.forEach(childId => {
      descendants.push(childId);
      descendants.push(...getAllDescendantIds(childId));
    });
    return descendants;
  }, [flatMap, nodeIds]);

  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#cbd5e1';
    const dotSize = 2;
    const spacing = 40;

    const offsetX = -(viewport.x % spacing);
    const offsetY = -(viewport.y % spacing);

    for (let x = offsetX; x < rect.width; x += spacing) {
      for (let y = offsetY; y < rect.height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [viewport.x, viewport.y]);

  const drawConnections = useCallback(() => {
    const canvas = lineCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    Object.values(flatMap).forEach(node => {
      if (!node.parentId) return;
      const parent = flatMap[node.parentId];
      if (!parent) return;

      const startX = parent.x + NODE_WIDTH / 2 - viewport.x;
      const startY = parent.y + NODE_HEIGHT / 2 - viewport.y;
      const endX = node.x + NODE_WIDTH / 2 - viewport.x;
      const endY = node.y + NODE_HEIGHT / 2 - viewport.y;

      const dx = endX - startX;
      const dy = endY - startY;
      const controlOffset = Math.min(Math.abs(dx) * 0.5, 120);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX + controlOffset,
        startY,
        endX - controlOffset,
        endY,
        endX,
        endY
      );
      ctx.stroke();
    });
  }, [flatMap, viewport.x, viewport.y]);

  const renderFrame = useCallback(() => {
    drawBackground();
    drawConnections();
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [drawBackground, drawConnections]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderFrame]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setViewport(prev => ({ ...prev, width: rect.width, height: rect.height }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const findNodeAtPosition = useCallback((clientX: number, clientY: number): string | null => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left + viewport.x;
    const y = clientY - rect.top + viewport.y;

    for (const nodeId of nodeIds) {
      const node = flatMap[nodeId];
      if (!node) continue;

      if (
        x >= node.x &&
        x <= node.x + NODE_WIDTH &&
        y >= node.y &&
        y <= node.y + NODE_HEIGHT
      ) {
        return nodeId;
      }
    }

    return null;
  }, [flatMap, nodeIds, viewport.x, viewport.y]);

  const onDragStart = useCallback((result: any) => {
    setDraggingNodeId(result.draggableId);
  }, []);

  const onDragUpdate: OnDragUpdateResponder = useCallback((update) => {
    if (!update.destination) return;

    const clientX = update.draggableId ? (window as any).__lastMouseX : 0;
    const clientY = update.draggableId ? (window as any).__lastMouseY : 0;

    const targetId = findNodeAtPosition(clientX, clientY);
    const draggingId = update.draggableId;

    if (targetId && targetId !== draggingId) {
      const descendants = getAllDescendantIds(draggingId);
      if (!descendants.includes(targetId)) {
        setDropTargetId(targetId);
        return;
      }
    }
    setDropTargetId(null);
  }, [findNodeAtPosition, getAllDescendantIds]);

  const onDragEnd: OnDragEndResponder = useCallback((result) => {
    setDraggingNodeId(null);

    const targetId = dropTargetId;
    const draggingId = result.draggableId;

    setDropTargetId(null);

    if (!targetId || targetId === draggingId) return;

    const descendants = getAllDescendantIds(draggingId);
    if (descendants.includes(targetId)) return;

    onUpdateParent(draggingId, targetId);
  }, [dropTargetId, getAllDescendantIds, onUpdateParent]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      (window as any).__lastMouseX = e.clientX;
      (window as any).__lastMouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === bgCanvasRef.current || e.target === lineCanvasRef.current) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        viewX: viewport.x,
        viewY: viewport.y,
      };
    }
  }, [viewport.x, viewport.y]);

  const handleMouseMove2 = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setViewport(prev => ({
      ...prev,
      x: Math.max(0, panStartRef.current.viewX - dx),
      y: Math.max(0, panStartRef.current.viewY - dy),
    }));
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const visibleNodeIds = useMemo(() => {
    return nodeIds.filter(id => {
      const node = flatMap[id];
      if (!node) return false;
      return (
        node.x + NODE_WIDTH >= viewport.x - 100 &&
        node.x <= viewport.x + viewport.width + 100 &&
        node.y + NODE_HEIGHT >= viewport.y - 100 &&
        node.y <= viewport.y + viewport.height + 100
      );
    });
  }, [flatMap, nodeIds, viewport]);

  const canvasContentSize = useMemo(() => {
    let maxX = 1000;
    let maxY = 800;
    Object.values(flatMap).forEach(node => {
      maxX = Math.max(maxX, node.x + NODE_WIDTH + CANVAS_PADDING);
      maxY = Math.max(maxY, node.y + NODE_HEIGHT + CANVAS_PADDING);
    });
    return { width: maxX, height: maxY };
  }, [flatMap]);

  return (
    <DragDropContext
      onDragStart={onDragStart as any}
      onDragUpdate={onDragUpdate}
      onDragEnd={onDragEnd}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : 'grab',
          padding: `${CANVAS_PADDING}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove2}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={bgCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
        <canvas
          ref={lineCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        <Droppable
          droppableId="canvas"
          mode="standard"
          renderClone={(provided, snapshot, rubric) => {
            const nodeId = rubric.source.draggableId;
            const node = flatMap[nodeId];
            if (!node) return null;

            return (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                style={{
                  ...provided.draggableProps.style,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  opacity: 0.7,
                  pointerEvents: 'none',
                }}
              >
                <NodeCard
                  node={node}
                  index={0}
                  isDragging={true}
                  onAdd={() => {}}
                  onDelete={() => {}}
                />
              </div>
            );
          }}
        >
          {(provided) => (
            <div
              ref={(el) => {
                provided.innerRef(el);
                (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }}
              {...provided.droppableProps}
              style={{
                position: 'relative',
                width: canvasContentSize.width,
                height: canvasContentSize.height,
                transform: `translate(${-viewport.x + CANVAS_PADDING}px, ${-viewport.y + CANVAS_PADDING}px)`,
              }}
            >
              {visibleNodeIds.map((nodeId, index) => {
                const node = flatMap[nodeId];
                if (!node) return null;

                return (
                  <div
                    key={nodeId}
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      width: NODE_WIDTH,
                      height: NODE_HEIGHT,
                      zIndex: draggingNodeId === nodeId ? 100 : dropTargetId === nodeId ? 50 : 2,
                    }}
                  >
                    <NodeCard
                      node={node}
                      index={index}
                      isNew={newNodeIds.has(nodeId)}
                      isDeleting={deletingNodeIds.has(nodeId)}
                      isDropTarget={dropTargetId === nodeId}
                      isDragging={draggingNodeId === nodeId}
                      onAdd={onAddBookmark}
                      onDelete={onDeleteBookmark}
                    />
                  </div>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}
