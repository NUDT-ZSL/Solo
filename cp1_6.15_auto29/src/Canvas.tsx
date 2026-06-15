import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
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

interface BlockDragState {
  isDragging: boolean;
  blockId: string | null;
  offsetX: number;
  offsetY: number;
}

interface ConnectionDragState {
  isDragging: boolean;
  fromBlockId: string | null;
  fromEdge: 'top' | 'right' | 'bottom' | 'left' | null;
  currentX: number;
  currentY: number;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(({
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
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => canvasInnerRef.current as HTMLDivElement);

  const [blockDragState, setBlockDragState] = useState<BlockDragState>({
    isDragging: false,
    blockId: null,
    offsetX: 0,
    offsetY: 0,
  });

  const [connectionDrag, setConnectionDrag] = useState<ConnectionDragState>({
    isDragging: false,
    fromBlockId: null,
    fromEdge: null,
    currentX: 0,
    currentY: 0,
  });

  const [hoveredEdge, setHoveredEdge] = useState<{ blockId: string; edge: 'top' | 'right' | 'bottom' | 'left' } | null>(null);

  const blockPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const connectionDragRef = useRef(connectionDrag);
  const blockDragRef = useRef(blockDragState);
  const externalDragRef = useRef(externalDragState);
  const hoveredEdgeRef = useRef(hoveredEdge);

  useEffect(() => {
    connectionDragRef.current = connectionDrag;
  }, [connectionDrag]);

  useEffect(() => {
    blockDragRef.current = blockDragState;
  }, [blockDragState]);

  useEffect(() => {
    externalDragRef.current = externalDragState;
  }, [externalDragState]);

  useEffect(() => {
    hoveredEdgeRef.current = hoveredEdge;
  }, [hoveredEdge]);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasInnerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom,
      };
    },
    [zoom]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(2, Math.max(0.5, zoom + delta));
      onZoomChange(Math.round(newZoom * 10) / 10);
    },
    [zoom, onZoomChange]
  );

  const updateBlockPositionRAF = useCallback((blockId: string, x: number, y: number) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      onBlockMove(blockId, x, y);
      rafRef.current = null;
    });
  }, [onBlockMove]);

  const updateConnectionDragRAF = useCallback((x: number, y: number) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setConnectionDrag((prev) => ({
        ...prev,
        currentX: x,
        currentY: y,
      }));
      rafRef.current = null;
    });
  }, []);

  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, blockId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onBlockSelect(blockId);

      const block = blocks.get(blockId);
      if (!block) return;

      const coords = getCanvasCoords(e.clientX, e.clientY);
      setBlockDragState({
        isDragging: true,
        blockId,
        offsetX: coords.x - block.x,
        offsetY: coords.y - block.y,
      });
    },
    [blocks, getCanvasCoords, onBlockSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);

      if (blockDragRef.current.isDragging && blockDragRef.current.blockId) {
        const blockId = blockDragRef.current.blockId;
        const block = blocks.get(blockId);
        if (block) {
          let newX = coords.x - blockDragRef.current.offsetX;
          let newY = coords.y - blockDragRef.current.offsetY;
          const snapped = snapPointToGrid(newX, newY);
          newX = Math.max(0, Math.min(snapped.x, CANVAS_WIDTH - block.width));
          newY = Math.max(0, Math.min(snapped.y, CANVAS_HEIGHT - block.height));
          updateBlockPositionRAF(blockId, newX, newY);
        }
      }

      if (connectionDragRef.current.isDragging) {
        updateConnectionDragRAF(coords.x, coords.y);

        let foundEdge: { blockId: string; edge: 'top' | 'right' | 'bottom' | 'left' } | null = null;
        for (const block of blocks.values()) {
          if (block.id === connectionDragRef.current.fromBlockId) continue;
          const result = findNearestEdge(block, coords.x, coords.y);
          const edgePoint = getEdgeMidpoint(block, result.edge);
          const dist = Math.sqrt(Math.pow(coords.x - edgePoint.x, 2) + Math.pow(coords.y - edgePoint.y, 2));
          if (dist < 30) {
            foundEdge = { blockId: block.id, edge: result.edge };
            break;
          }
        }
        if (
          (!hoveredEdgeRef.current && foundEdge) ||
          (hoveredEdgeRef.current && foundEdge && (hoveredEdgeRef.current.blockId !== foundEdge.blockId || hoveredEdgeRef.current.edge !== foundEdge.edge)) ||
          (hoveredEdgeRef.current && !foundEdge)
        ) {
          setHoveredEdge(foundEdge);
        }
      }
    },
    [blocks, getCanvasCoords, updateBlockPositionRAF, updateConnectionDragRAF]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (blockDragRef.current.isDragging && blockDragRef.current.blockId) {
        const blockId = blockDragRef.current.blockId;
        const block = blocks.get(blockId);
        if (block) {
          const adjusted = adjustBlockPosition(block, blocks, blockId);
          onBlockMove(blockId, adjusted.x, adjusted.y);

          if (block.parentId) {
            const updated = adjustChildrenPositions(block.parentId, new Map(blocks));
            const updatedBlock = updated.get(blockId);
            if (updatedBlock && (updatedBlock.x !== block.x || updatedBlock.y !== block.y)) {
              onBlockMove(blockId, updatedBlock.x, updatedBlock.y);
            }
          }
        }
      }

      if (connectionDragRef.current.isDragging && hoveredEdgeRef.current && connectionDragRef.current.fromBlockId) {
        onConnectionCreate(connectionDragRef.current.fromBlockId, hoveredEdgeRef.current.blockId);
      }

      if (externalDragRef.current.isDragging) {
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
    [blocks, onBlockMove, onConnectionCreate, onExternalDragEnd]
  );

  useEffect(() => {
    if (blockDragState.isDragging || connectionDrag.isDragging || externalDragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [blockDragState.isDragging, connectionDrag.isDragging, externalDragState.isDragging, handleMouseMove, handleMouseUp]);

  const handleEdgeMouseDown = useCallback(
    (e: React.MouseEvent, blockId: string, edge: 'top' | 'right' | 'bottom' | 'left') => {
      e.stopPropagation();
      e.preventDefault();
      const block = blocks.get(blockId);
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
    [blocks]
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

      const fromResult = findNearestEdge(fromBlock, toBlock.x + toBlock.width / 2, toBlock.y + toBlock.height / 2);
      const toResult = findNearestEdge(toBlock, fromBlock.x + fromBlock.width / 2, fromBlock.y + fromBlock.height / 2);
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
          style={{
            cursor: 'pointer',
          }}
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

  const getEdgePositionForBlock = (
    block: LayoutBlock,
    edge: 'top' | 'right' | 'bottom' | 'left',
    isChild: boolean
  ): React.CSSProperties => {
    const handleSize = 8;
    const x = isChild ? 0 : block.x;
    const y = isChild ? 0 : block.y;

    switch (edge) {
      case 'top':
        return {
          left: x + block.width / 2 - handleSize,
          top: y - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
      case 'right':
        return {
          left: x + block.width - handleSize,
          top: y + block.height / 2 - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
      case 'bottom':
        return {
          left: x + block.width / 2 - handleSize,
          top: y + block.height - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
      case 'left':
        return {
          left: x - handleSize,
          top: y + block.height / 2 - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
    }
  };

  const renderBlock = useCallback(
    (block: LayoutBlock, isChild: boolean = false): React.ReactNode => {
      const isSelected = selectedBlockId === block.id;
      const isDragging = blockDragState.isDragging && blockDragState.blockId === block.id;
      const isDeleting = deletingBlockIds.has(block.id);
      const adjacentBlocks = isDragging ? getAdjacentBlocks(block, blocks) : [];

      const childBlocks = block.children
        .map((cid) => blocks.get(cid))
        .filter((b): b is LayoutBlock => b !== undefined);

      const blockStyle: React.CSSProperties = isChild
        ? {
            position: 'relative',
            width: block.width,
            height: block.height,
            backgroundColor: block.backgroundColor,
            borderRadius: block.borderRadius,
            border: isSelected ? '2px solid #2563eb' : '1px solid #9ca3af',
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.5 : 1,
            boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 500,
            color: '#374151',
            left: block.x,
            top: block.y,
            animation: isDeleting ? 'fadeOut 0.2s ease forwards' : 'scaleIn 0.3s ease forwards',
          }
        : {
            position: 'absolute',
            left: block.x,
            top: block.y,
            width: block.width,
            height: block.height,
            backgroundColor: block.backgroundColor,
            borderRadius: block.borderRadius,
            border: isSelected ? '2px solid #2563eb' : '1px solid #9ca3af',
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.5 : 1,
            boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 500,
            color: '#374151',
            animation: isDeleting ? 'fadeOut 0.2s ease forwards' : 'scaleIn 0.3s ease forwards',
            zIndex: isSelected ? 10 : isDragging ? 100 : 1,
          };

      const edgeContainerStyle: React.CSSProperties = isChild
        ? {
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }
        : {};

      return (
        <React.Fragment key={block.id}>
          <div
            onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
            style={blockStyle}
          >
            {BLOCK_LABELS[block.type]}

            {childBlocks.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {childBlocks.map((child) => (
                  <div
                    key={child.id}
                    style={{
                      position: 'absolute',
                      left: child.x - block.x,
                      top: child.y - block.y,
                      pointerEvents: 'auto',
                    }}
                  >
                    {renderBlock(child, true)}
                  </div>
                ))}
              </div>
            )}

            <div style={edgeContainerStyle}>
              {['top', 'right', 'bottom', 'left'].map((edge) => {
                const edgePos = getEdgePositionForBlock(block, edge as 'top' | 'right' | 'bottom' | 'left', isChild);
                const isHovered = hoveredEdge && hoveredEdge.blockId === block.id && hoveredEdge.edge === edge;
                return (
                  <div
                    key={`${block.id}-${edge}`}
                    onMouseDown={(e) => handleEdgeMouseDown(e, block.id, edge as 'top' | 'right' | 'bottom' | 'left')}
                    style={{
                      position: 'absolute',
                      ...edgePos,
                      backgroundColor: isHovered ? '#2563eb' : 'transparent',
                      cursor: 'crosshair',
                      zIndex: 20,
                      transition: 'background-color 0.15s ease',
                      pointerEvents: 'auto',
                    }}
                    onMouseEnter={() => setHoveredEdge({ blockId: block.id, edge: edge as 'top' | 'right' | 'bottom' | 'left' })}
                    onMouseLeave={() => {
                      if (!connectionDrag.isDragging) {
                        setHoveredEdge(null);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          {!isChild && adjacentBlocks.length > 0 && adjacentBlocks.map(({ block: adjBlock, gap }, idx) => {
            const gapLabel = gap.horizontal > 0 ? `${gap.horizontal}px` : `${gap.vertical}px`;
            const minX = Math.max(block.x, adjBlock.x);
            const maxX = Math.min(block.x + block.width, adjBlock.x + adjBlock.width);
            const minY = Math.max(block.y, adjBlock.y);
            const maxY = Math.min(block.y + block.height, adjBlock.y + adjBlock.height);
            let labelX: number, labelY: number;

            if (gap.horizontal > 0) {
              labelX = Math.min(block.x + block.width, adjBlock.x + adjBlock.width) + gap.horizontal / 2 - 15;
              labelY = minY + (maxY - minY) / 2 - 10;
            } else {
              labelX = minX + (maxX - minX) / 2 - 15;
              labelY = Math.min(block.y + block.height, adjBlock.y + adjBlock.height) + gap.vertical / 2 - 10;
            }

            return (
              <div
                key={`${block.id}-gap-${idx}`}
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
    [blocks, selectedBlockId, blockDragState, deletingBlockIds, hoveredEdge, connectionDrag.isDragging, handleBlockMouseDown, handleEdgeMouseDown]
  );

  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      lines.push(
        <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={CANVAS_HEIGHT} stroke="#e5e7eb" strokeWidth={1} />
      );
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      lines.push(
        <line key={`h-${y}`} x1={0} y1={y} x2={CANVAS_WIDTH} y2={y} stroke="#e5e7eb" strokeWidth={1} />
      );
    }
    return lines;
  }, []);

  const renderConnectionDragLine = useCallback(() => {
    if (!connectionDrag.isDragging || !connectionDrag.fromBlockId || !connectionDrag.fromEdge) return null;
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

  const externalDragPreview = useMemo(() => {
    if (!externalDragState.isDragging || !externalDragState.type) return null;

    const dims = DEFAULT_BLOCK_DIMENSIONS[externalDragState.type];
    const coords = getCanvasCoords(externalDragState.mouseX, externalDragState.mouseY);
    const snapped = snapPointToGrid(coords.x - dims.width / 2, coords.y - dims.height / 2);
    const x = Math.max(0, Math.min(snapped.x, CANVAS_WIDTH - dims.width));
    const y = Math.max(0, Math.min(snapped.y, CANVAS_HEIGHT - dims.height));

    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: dims.width,
          height: dims.height,
          border: '2px solid #93c5fd',
          backgroundColor: 'rgba(147, 197, 253, 0.4)',
          borderRadius: 4,
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      />
    );
  }, [externalDragState, getCanvasCoords]);

  const rootBlocks = useMemo(() => {
    return Array.from(blocks.values()).filter((b) => b.parentId === null);
  }, [blocks]);

  return (
    <div
      ref={canvasRef}
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
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {gridLines}
        </svg>

        {externalDragPreview}

        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'auto' }}
        >
          {connections.map(renderConnection)}
          {renderConnectionDragLine()}
        </svg>

        {rootBlocks.map((block) => renderBlock(block, false))}
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
