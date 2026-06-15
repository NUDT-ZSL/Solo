import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  LayoutBlock,
  LayoutConnection,
  LayoutBlockType,
  GRID_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BLOCK_LABELS,
  DEFAULT_BLOCK_DIMENSIONS,
  snapPointToGrid,
  adjustBlockPosition,
  adjustChildrenPositions,
  getEdgeMidpoint,
  findNearestEdge,
  getAdjacentBlocks,
} from './LayoutEngine';

interface CanvasProps {
  blocks: Map<string, LayoutBlock>;
  connections: LayoutConnection[];
  selectedBlockId: string | null;
  selectedConnectionId: string | null;
  onBlockSelect: (id: string | null) => void;
  onConnectionSelect: (id: string | null) => void;
  onBlockMove: (id: string, x: number, y: number) => void;
  onBlockDrop: (type: LayoutBlockType, x: number, y: number) => void;
  onConnectionCreate: (fromId: string, toId: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  deletingBlockIds: Set<string>;
  deletingConnectionIds: Set<string>;
  externalDragState: {
    isDragging: boolean;
    type: LayoutBlockType | null;
    mouseX: number;
    mouseY: number;
  };
  onExternalDragEnd: (e: MouseEvent) => void;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  (
    {
      blocks,
      connections,
      selectedBlockId,
      selectedConnectionId,
      onBlockSelect,
      onConnectionSelect,
      onBlockMove,
      onBlockDrop,
      onConnectionCreate,
      zoom,
      onZoomChange,
      deletingBlockIds,
      deletingConnectionIds,
      externalDragState,
      onExternalDragEnd,
    },
    ref
  ) => {
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasInnerRef = useRef<HTMLDivElement>(null);
    const rafIdRef = useRef<number | null>(null);
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const viewOffsetRef = useRef(viewOffset);

    useEffect(() => {
      viewOffsetRef.current = viewOffset;
    }, [viewOffset]);

    useEffect(() => {
      const container = canvasContainerRef.current;
      if (!container) return;
      const updateCenter = () => {
        const rect = container.getBoundingClientRect();
        setViewOffset({
          x: (rect.width - CANVAS_WIDTH) / 2,
          y: (rect.height - CANVAS_HEIGHT) / 2,
        });
      };
      updateCenter();
      const resizeObserver = new ResizeObserver(updateCenter);
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, []);

    const [blockDragState, setBlockDragState] = useState<{
      isDragging: boolean;
      blockId: string | null;
      offsetX: number;
      offsetY: number;
    }>({
      isDragging: false,
      blockId: null,
      offsetX: 0,
      offsetY: 0,
    });

    const [connectionDrag, setConnectionDrag] = useState<{
      isDragging: boolean;
      fromBlockId: string | null;
      fromEdge: 'top' | 'right' | 'bottom' | 'left' | null;
      currentX: number;
      currentY: number;
    }>({
      isDragging: false,
      fromBlockId: null,
      fromEdge: null,
      currentX: 0,
      currentY: 0,
    });

    const [hoveredEdge, setHoveredEdge] = useState<{
      blockId: string;
      edge: 'top' | 'right' | 'bottom' | 'left';
    } | null>(null);

    const blockDragRef = useRef(blockDragState);
    const connectionDragRef = useRef(connectionDrag);
    const hoveredEdgeRef = useRef(hoveredEdge);
    const blocksRef = useRef(blocks);
    const zoomRef = useRef(zoom);

    useEffect(() => {
      blockDragRef.current = blockDragState;
    }, [blockDragState]);

    useEffect(() => {
      connectionDragRef.current = connectionDrag;
    }, [connectionDrag]);

    useEffect(() => {
      hoveredEdgeRef.current = hoveredEdge;
    }, [hoveredEdge]);

    useEffect(() => {
      blocksRef.current = blocks;
    }, [blocks]);

    useEffect(() => {
      zoomRef.current = zoom;
    }, [zoom]);

    useImperativeHandle(ref, () => canvasInnerRef.current as HTMLDivElement);

    const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
      const rect = canvasInnerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / zoomRef.current,
        y: (clientY - rect.top) / zoomRef.current,
      };
    }, []);

    const rafThrottle = useCallback((fn: () => void) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        fn();
        rafIdRef.current = null;
      });
    }, []);

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const prevZoom = zoomRef.current;
        const newZoom = Math.min(2, Math.max(0.5, prevZoom + delta));
        if (newZoom === prevZoom) return;

        const rect = canvasInnerRef.current?.getBoundingClientRect();
        const containerRect = canvasContainerRef.current?.getBoundingClientRect();
        if (!rect || !containerRect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleChange = newZoom / prevZoom;
        const newOffsetX = scaleOffsetRef.current.x - (mouseX * (scaleChange - 1));
        const newOffsetY = scaleOffsetRef.current.y - (mouseY * (scaleChange - 1));

        rafThrottle(() => {
          onZoomChange(Math.round(newZoom * 10) / 10);
          setScaleOffset({ x: newOffsetX, y: newOffsetY });
        });
      },
      [onZoomChange, rafThrottle]
    );

    const dragPreviewPosition = useMemo(() => {
      if (!externalDragState.isDragging || !externalDragState.type) {
        return null;
      }
      const dims = DEFAULT_BLOCK_DIMENSIONS[externalDragState.type];
      const coords = getCanvasCoords(externalDragState.mouseX, externalDragState.mouseY);
      const snapped = snapPointToGrid(coords.x - dims.width / 2, coords.y - dims.height / 2);
      const x = Math.max(0, Math.min(snapped.x, CANVAS_WIDTH - dims.width));
      const y = Math.max(0, Math.min(snapped.y, CANVAS_HEIGHT - dims.height));
      return { x, y, width: dims.width, height: dims.height };
    }, [externalDragState, getCanvasCoords]);

    const handleBlockMouseDown = useCallback(
      (e: React.MouseEvent, blockId: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onBlockSelect(blockId);

        const block = blocksRef.current.get(blockId);
        if (!block) return;

        const coords = getCanvasCoords(e.clientX, e.clientY);
        setBlockDragState({
          isDragging: true,
          blockId,
          offsetX: coords.x - block.x,
          offsetY: coords.y - block.y,
        });
      },
      [getCanvasCoords, onBlockSelect]
    );

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const currentBlocks = blocksRef.current;

        if (blockDragRef.current.isDragging && blockDragRef.current.blockId) {
          const blockId = blockDragRef.current.blockId;
          const block = currentBlocks.get(blockId);
          if (block) {
            let newX = coords.x - blockDragRef.current.offsetX;
            let newY = coords.y - blockDragRef.current.offsetY;
            const snapped = snapPointToGrid(newX, newY);
            newX = Math.max(0, Math.min(snapped.x, CANVAS_WIDTH - block.width));
            newY = Math.max(0, Math.min(snapped.y, CANVAS_HEIGHT - block.height));
            rafThrottle(() => {
              onBlockMove(blockId, newX, newY);
            });
          }
        }

        if (connectionDragRef.current.isDragging) {
          rafThrottle(() => {
            setConnectionDrag((prev) => ({
              ...prev,
              currentX: coords.x,
              currentY: coords.y,
            }));
          });

          let foundEdge: { blockId: string; edge: 'top' | 'right' | 'bottom' | 'left' } | null = null;
          for (const block of currentBlocks.values()) {
            if (block.id === connectionDragRef.current.fromBlockId) continue;
            const result = findNearestEdge(block, coords.x, coords.y);
            const edgePoint = getEdgeMidpoint(block, result.edge);
            const dist = Math.sqrt(
              Math.pow(coords.x - edgePoint.x, 2) + Math.pow(coords.y - edgePoint.y, 2)
            );
            if (dist < 30) {
              foundEdge = { blockId: block.id, edge: result.edge };
              break;
            }
          }

          const currentHovered = hoveredEdgeRef.current;
          const hasChanged =
            (!currentHovered && foundEdge) ||
            (currentHovered &&
              foundEdge &&
              (currentHovered.blockId !== foundEdge.blockId ||
                currentHovered.edge !== foundEdge.edge)) ||
            (currentHovered && !foundEdge);

          if (hasChanged) {
            setHoveredEdge(foundEdge);
          }
        }
      },
      [getCanvasCoords, onBlockMove, rafThrottle]
    );

    const handleMouseUp = useCallback(
      (e: MouseEvent) => {
        const currentBlocks = blocksRef.current;

        if (blockDragRef.current.isDragging && blockDragRef.current.blockId) {
          const blockId = blockDragRef.current.blockId;
          const block = currentBlocks.get(blockId);
          if (block) {
            const adjusted = adjustBlockPosition(block, currentBlocks, blockId);
            onBlockMove(blockId, adjusted.x, adjusted.y);

            if (block.parentId) {
              const updated = adjustChildrenPositions(
                block.parentId,
                new Map(currentBlocks)
              );
              const updatedBlock = updated.get(blockId);
              if (updatedBlock && (updatedBlock.x !== block.x || updatedBlock.y !== block.y)) {
                onBlockMove(blockId, updatedBlock.x, updatedBlock.y);
              }
            }
          }
        }

        if (
          connectionDragRef.current.isDragging &&
          hoveredEdgeRef.current &&
          connectionDragRef.current.fromBlockId
        ) {
          onConnectionCreate(
            connectionDragRef.current.fromBlockId,
            hoveredEdgeRef.current.blockId
          );
        }

        if (externalDragState.isDragging) {
          onExternalDragEnd(e);
        }

        setBlockDragState({
          isDragging: false,
          blockId: null,
          offsetX: 0,
          offsetY: 0,
        });
        setConnectionDrag({
          isDragging: false,
          fromBlockId: null,
          fromEdge: null,
          currentX: 0,
          currentY: 0,
        });
        setHoveredEdge(null);
      },
      [onBlockMove, onConnectionCreate, onExternalDragEnd, externalDragState.isDragging]
    );

    useEffect(() => {
      if (
        blockDragState.isDragging ||
        connectionDrag.isDragging ||
        externalDragState.isDragging
      ) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [
      blockDragState.isDragging,
      connectionDrag.isDragging,
      externalDragState.isDragging,
      handleMouseMove,
      handleMouseUp,
    ]);

    const handleEdgeMouseDown = useCallback(
      (e: React.MouseEvent, blockId: string, edge: 'top' | 'right' | 'bottom' | 'left') => {
        e.stopPropagation();
        e.preventDefault();
        const block = blocksRef.current.get(blockId);
        if (!block) return;
        const point = getEdgeMidpoint(block, edge);
        setConnectionDrag({
          isDragging: true,
          fromBlockId: blockId,
          fromEdge: edge,
          currentX: point.x,
          currentY: point.y,
        });
      },
      []
    );

    const handleCanvasClick = useCallback(() => {
      onBlockSelect(null);
      onConnectionSelect(null);
    }, [onBlockSelect, onConnectionSelect]);

    const handleConnectionClick = useCallback(
      (e: React.MouseEvent, connectionId: string) => {
        e.stopPropagation();
        onConnectionSelect(connectionId);
        onBlockSelect(null);
      },
      [onConnectionSelect, onBlockSelect]
    );

    const renderConnection = useCallback(
      (conn: LayoutConnection) => {
        const fromBlock = blocks.get(conn.fromId);
        const toBlock = blocks.get(conn.toId);
        if (!fromBlock || !toBlock) return null;

        const fromResult = findNearestEdge(
          fromBlock,
          toBlock.x + toBlock.width / 2,
          toBlock.y + toBlock.height / 2
        );
        const toResult = findNearestEdge(
          toBlock,
          fromBlock.x + fromBlock.width / 2,
          fromBlock.y + fromBlock.height / 2
        );
        const fromPoint = getEdgeMidpoint(fromBlock, fromResult.edge);
        const toPoint = getEdgeMidpoint(toBlock, toResult.edge);

        const isSelected = selectedConnectionId === conn.id;
        const isDeleting = deletingConnectionIds.has(conn.id);

        const dx = toPoint.x - fromPoint.x;
        const dy = toPoint.y - fromPoint.y;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;

        const arrowPoint1 = {
          x: toPoint.x - arrowLength * Math.cos(angle - arrowAngle),
          y: toPoint.y - arrowLength * Math.sin(angle - arrowAngle),
        };
        const arrowPoint2 = {
          x: toPoint.x - arrowLength * Math.cos(angle + arrowAngle),
          y: toPoint.y - arrowLength * Math.sin(angle + arrowAngle),
        };

        return (
          <g
            key={conn.id}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleConnectionClick(e, conn.id)}
          >
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={isSelected ? '#2563eb' : '#6b7280'}
              strokeWidth={isSelected ? 3 : 2}
              fill="none"
              style={{
                opacity: isDeleting ? 0 : 1,
                transition: 'opacity 0.2s ease',
                animation: isDeleting ? 'lineFadeOut 0.2s ease forwards' : undefined,
              }}
            />
            <polygon
              points={`${toPoint.x},${toPoint.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
              fill={isSelected ? '#2563eb' : '#6b7280'}
              style={{
                opacity: isDeleting ? 0 : 1,
                transition: 'opacity 0.2s ease',
                animation: isDeleting ? 'lineFadeOut 0.2s ease forwards' : undefined,
              }}
            />
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke="transparent"
              strokeWidth={12}
              fill="none"
            />
          </g>
        );
      },
      [blocks, selectedConnectionId, deletingConnectionIds, handleConnectionClick]
    );

    const renderBlockContent = useCallback(
      (block: LayoutBlock, isRoot: boolean): React.ReactNode => {
        const isSelected = selectedBlockId === block.id;
        const isDragging = blockDragState.isDragging && blockDragState.blockId === block.id;
        const isDeleting = deletingBlockIds.has(block.id);

        const childBlocks = block.children
          .map((cid) => blocks.get(cid))
          .filter((b): b is LayoutBlock => b !== undefined);

        const adjacentBlocks =
          isDragging && isRoot ? getAdjacentBlocks(block, blocks) : [];

        const contentStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: block.backgroundColor,
          borderRadius: block.borderRadius,
          border: isSelected ? '2px solid #2563eb' : '1px solid #9ca3af',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.5 : 1,
          boxShadow: isSelected
            ? '0 0 0 3px rgba(37, 99, 235, 0.2)'
            : '0 1px 3px rgba(0,0,0,0.1)',
          transition: isDragging
            ? 'none'
            : 'box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
          animation: isDeleting ? 'fadeOut 0.2s ease forwards' : 'scaleIn 0.3s ease forwards',
          position: 'relative',
          overflow: 'visible',
        };

        return (
          <React.Fragment>
            <div style={contentStyle} onMouseDown={(e) => handleBlockMouseDown(e, block.id)}>
              {BLOCK_LABELS[block.type]}

              {['top', 'right', 'bottom', 'left'].map((edge) => {
                const handleSize = 8;
                const edgeStr = edge as 'top' | 'right' | 'bottom' | 'left';
                const isHovered =
                  hoveredEdge &&
                  hoveredEdge.blockId === block.id &&
                  hoveredEdge.edge === edgeStr;

                let position: React.CSSProperties = {};
                switch (edgeStr) {
                  case 'top':
                    position = {
                      left: block.width / 2 - handleSize,
                      top: -handleSize,
                    };
                    break;
                  case 'right':
                    position = {
                      left: block.width - handleSize,
                      top: block.height / 2 - handleSize,
                    };
                    break;
                  case 'bottom':
                    position = {
                      left: block.width / 2 - handleSize,
                      top: block.height - handleSize,
                    };
                    break;
                  case 'left':
                    position = {
                      left: -handleSize,
                      top: block.height / 2 - handleSize,
                    };
                    break;
                }

                return (
                  <div
                    key={`${block.id}-edge-${edge}`}
                    onMouseDown={(e) => handleEdgeMouseDown(e, block.id, edgeStr)}
                    onMouseEnter={() =>
                      setHoveredEdge({ blockId: block.id, edge: edgeStr })
                    }
                    onMouseLeave={() => {
                      if (!connectionDrag.isDragging) {
                        setHoveredEdge(null);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      width: handleSize * 2,
                      height: handleSize * 2,
                      backgroundColor: isHovered ? '#2563eb' : 'transparent',
                      cursor: 'crosshair',
                      zIndex: 20,
                      transition: 'background-color 0.15s ease',
                      pointerEvents: 'auto',
                      ...position,
                    }}
                  />
                );
              })}

              {childBlocks.length > 0 &&
                childBlocks.map((child) => {
                  const childLeft = child.x - block.x;
                  const childTop = child.y - block.y;
                  return (
                    <div
                      key={child.id}
                      style={{
                        position: 'absolute',
                        left: childLeft,
                        top: childTop,
                        width: child.width,
                        height: child.height,
                        pointerEvents: 'auto',
                      }}
                    >
                      {renderBlockContent(child, false)}
                    </div>
                  );
                })}
            </div>

            {isRoot && adjacentBlocks.length > 0 &&
              adjacentBlocks.map(({ block: adjBlock, gap }, idx) => {
                const gapLabel =
                  gap.horizontal > 0 ? `${gap.horizontal}px` : `${gap.vertical}px`;
                const minX = Math.max(block.x, adjBlock.x);
                const maxX = Math.min(
                  block.x + block.width,
                  adjBlock.x + adjBlock.width
                );
                const minY = Math.max(block.y, adjBlock.y);
                const maxY = Math.min(
                  block.y + block.height,
                  adjBlock.y + adjBlock.height
                );
                let labelX: number, labelY: number;

                if (gap.horizontal > 0) {
                  labelX =
                    Math.min(
                      block.x + block.width,
                      adjBlock.x + adjBlock.width
                    ) +
                    gap.horizontal / 2 -
                    15;
                  labelY = minY + (maxY - minY) / 2 - 10;
                } else {
                  labelX = minX + (maxX - minX) / 2 - 15;
                  labelY =
                    Math.min(
                      block.y + block.height,
                      adjBlock.y + adjBlock.height
                    ) +
                    gap.vertical / 2 -
                    10;
                }

                return (
                  <div
                    key={`gap-${block.id}-${idx}`}
                    style={{
                      position: 'absolute',
                      left: labelX,
                      top: labelY,
                      backgroundColor: '#1f2937',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      zIndex: 50,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {gapLabel}
                  </div>
                );
              })}
          </React.Fragment>
        );
      },
      [
        blocks,
        selectedBlockId,
        blockDragState,
        deletingBlockIds,
        hoveredEdge,
        connectionDrag.isDragging,
        handleBlockMouseDown,
        handleEdgeMouseDown,
      ]
    );

    const gridLines = useMemo(() => {
      const lines: React.ReactNode[] = [];
      for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
        lines.push(
          <line
            key={`v-${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={CANVAS_HEIGHT}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
        lines.push(
          <line
            key={`h-${y}`}
            x1={0}
            y1={y}
            x2={CANVAS_WIDTH}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      }
      return lines;
    }, []);

    const renderConnectionDragLine = useCallback(() => {
      if (
        !connectionDrag.isDragging ||
        !connectionDrag.fromBlockId ||
        !connectionDrag.fromEdge
      )
        return null;
      const fromBlock = blocks.get(connectionDrag.fromBlockId);
      if (!fromBlock) return null;
      const fromPoint = getEdgeMidpoint(fromBlock, connectionDrag.fromEdge);

      return (
        <line
          x1={fromPoint.x}
          y1={fromPoint.y}
          x2={connectionDrag.currentX}
          y2={connectionDrag.currentY}
          stroke="#2563eb"
          strokeWidth={2}
          strokeDasharray="5,5"
          fill="none"
        />
      );
    }, [connectionDrag, blocks]);

    const rootBlocks = useMemo(() => {
      return Array.from(blocks.values()).filter((b) => b.parentId === null);
    }, [blocks]);

    return (
      <div
        ref={canvasContainerRef}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: 20,
          position: 'relative',
        }}
      >
        <div
          ref={canvasInnerRef}
          style={{
            position: 'relative',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundColor: '#fafafa',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease',
          }}
        >
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          >
            {gridLines}
          </svg>

          {dragPreviewPosition && (
            <div
              style={{
                position: 'absolute',
                left: dragPreviewPosition.x,
                top: dragPreviewPosition.y,
                width: dragPreviewPosition.width,
                height: dragPreviewPosition.height,
                border: '2px solid #93c5fd',
                backgroundColor: 'rgba(147, 197, 253, 0.4)',
                borderRadius: 4,
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            />
          )}

          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'auto',
            }}
          >
            {connections.map(renderConnection)}
            {renderConnectionDragLine()}
          </svg>

          {rootBlocks.map((block) => (
            <div
              key={block.id}
              style={{
                position: 'absolute',
                left: block.x,
                top: block.y,
                width: block.width,
                height: block.height,
                zIndex: selectedBlockId === block.id ? 10 : 1,
                pointerEvents: 'auto',
              }}
            >
              {renderBlockContent(block, true)}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';

export default Canvas;
