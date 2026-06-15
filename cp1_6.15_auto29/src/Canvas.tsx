import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  LayoutBlock,
  LayoutConnection,
  LayoutBlockType,
  GRID_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BLOCK_LABELS,
  DEFAULT_BLOCK_DIMENSIONS,
  DEFAULT_BACKGROUND_COLORS,
  snapPointToGrid,
  adjustBlockPosition,
  adjustChildrenPositions,
  getEdgeMidpoint,
  findNearestEdge,
  getAdjacentBlocks,
  getBlockGap,
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
}

interface DragState {
  isDragging: boolean;
  blockId: string | null;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
}

interface ConnectionDragState {
  isDragging: boolean;
  fromBlockId: string | null;
  fromEdge: 'top' | 'right' | 'bottom' | 'left' | null;
  currentX: number;
  currentY: number;
}

const Canvas: React.FC<CanvasProps> = ({
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
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    blockId: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  });
  const [connectionDrag, setConnectionDrag] = useState<ConnectionDragState>({
    isDragging: false,
    fromBlockId: null,
    fromEdge: null,
    currentX: 0,
    currentY: 0,
  });
  const [hoveredEdge, setHoveredEdge] = useState<{ blockId: string; edge: 'top' | 'right' | 'bottom' | 'left' } | null>(null);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number; width: number; height: number; visible: boolean }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const blockType = e.dataTransfer.types.includes('blockType');
    if (blockType) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const type = e.dataTransfer.getData('blockType') as LayoutBlockType;
      if (type) {
        const dims = DEFAULT_BLOCK_DIMENSIONS[type];
        const snapped = snapPointToGrid(coords.x - dims.width / 2, coords.y - dims.height / 2);
        setDropPreview({
          x: Math.max(0, Math.min(snapped.x, CANVAS_WIDTH - dims.width)),
          y: Math.max(0, Math.min(snapped.y, CANVAS_HEIGHT - dims.height)),
          width: dims.width,
          height: dims.height,
          visible: true,
        });
      }
    }
  }, [getCanvasCoords]);

  const handleDragLeave = useCallback(() => {
    setDropPreview((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const blockType = e.dataTransfer.getData('blockType') as LayoutBlockType;
      if (blockType) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const dims = DEFAULT_BLOCK_DIMENSIONS[blockType];
        const snapped = snapPointToGrid(coords.x - dims.width / 2, coords.y - dims.height / 2);
        onBlockDrop(
          blockType,
          Math.max(0, Math.min(snapped.x, CANVAS_WIDTH - dims.width)),
          Math.max(0, Math.min(snapped.y, CANVAS_HEIGHT - dims.height))
        );
      }
      setDropPreview((prev) => ({ ...prev, visible: false }));
    },
    [getCanvasCoords, onBlockDrop]
  );

  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, blockId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onBlockSelect(blockId);

      const block = blocks.get(blockId);
      if (!block) return;

      const coords = getCanvasCoords(e.clientX, e.clientY);
      setDragState({
        isDragging: true,
        blockId,
        offsetX: coords.x - block.x,
        offsetY: coords.y - block.y,
        startX: block.x,
        startY: block.y,
      });
    },
    [blocks, getCanvasCoords, onBlockSelect]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);

      if (dragState.isDragging && dragState.blockId) {
        const block = blocks.get(dragState.blockId);
        if (block) {
          let newX = coords.x - dragState.offsetX;
          let newY = coords.y - dragState.offsetY;
          const snapped = snapPointToGrid(newX, newY);
          newX = Math.max(0, Math.min(snapped.x, CANVAS_WIDTH - block.width));
          newY = Math.max(0, Math.min(snapped.y, CANVAS_HEIGHT - block.height));
          onBlockMove(dragState.blockId, newX, newY);
        }
      }

      if (connectionDrag.isDragging) {
        setConnectionDrag((prev) => ({
          ...prev,
          currentX: coords.x,
          currentY: coords.y,
        }));

        let foundEdge: { blockId: string; edge: 'top' | 'right' | 'bottom' | 'left' } | null = null;
        for (const block of blocks.values()) {
          if (block.id === connectionDrag.fromBlockId) continue;
          const result = findNearestEdge(block, coords.x, coords.y);
          const edgePoint = getEdgeMidpoint(block, result.edge);
          const dist = Math.sqrt(Math.pow(coords.x - edgePoint.x, 2) + Math.pow(coords.y - edgePoint.y, 2));
          if (dist < 30) {
            foundEdge = { blockId: block.id, edge: result.edge };
            break;
          }
        }
        setHoveredEdge(foundEdge);
      }
    },
    [dragState, connectionDrag, blocks, getCanvasCoords, onBlockMove]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (dragState.isDragging && dragState.blockId) {
        const block = blocks.get(dragState.blockId);
        if (block) {
          const adjusted = adjustBlockPosition(block, blocks, dragState.blockId);
          onBlockMove(dragState.blockId, adjusted.x, adjusted.y);

          if (block.parentId) {
            const updated = adjustChildrenPositions(block.parentId, new Map(blocks));
            const updatedBlock = updated.get(dragState.blockId);
            if (updatedBlock && (updatedBlock.x !== block.x || updatedBlock.y !== block.y)) {
              onBlockMove(dragState.blockId, updatedBlock.x, updatedBlock.y);
            }
          }
        }
      }

      if (connectionDrag.isDragging && hoveredEdge && connectionDrag.fromBlockId) {
        onConnectionCreate(connectionDrag.fromBlockId, hoveredEdge.blockId);
      }

      setDragState({
        isDragging: false,
        blockId: null,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
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
    [dragState, connectionDrag, hoveredEdge, blocks, onBlockMove, onConnectionCreate]
  );

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

  const renderConnection = (conn: LayoutConnection, index: number) => {
    const fromBlock = blocks.get(conn.fromId);
    const toBlock = blocks.get(conn.toId);
    if (!fromBlock || !toBlock) return null;

    const fromResult = findNearestEdge(fromBlock, toBlock.x + toBlock.width / 2, toBlock.y + toBlock.height / 2);
    const toResult = findNearestEdge(toBlock, fromBlock.x + fromBlock.width / 2, fromBlock.y + fromBlock.height / 2);
    const fromPoint = getEdgeMidpoint(fromBlock, fromResult.edge);
    const toPoint = getEdgeMidpoint(toBlock, toResult.edge);

    const isSelected = selectedConnectionId === conn.id;
    const isDeleting = deletingConnectionIds.has(conn.id);

    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;
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
          opacity: isDeleting ? 0 : 1,
          transition: 'opacity 0.2s ease',
          animation: isDeleting ? 'lineFadeOut 0.2s ease forwards' : undefined,
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
        />
        <polygon
          points={`${toPoint.x},${toPoint.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
          fill={isSelected ? '#2563eb' : '#6b7280'}
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
  };

  const renderBlock = (block: LayoutBlock) => {
    const isSelected = selectedBlockId === block.id;
    const isDragging = dragState.isDragging && dragState.blockId === block.id;
    const isDeleting = deletingBlockIds.has(block.id);
    const adjacentBlocks = isDragging ? getAdjacentBlocks(block, blocks) : [];

    return (
      <React.Fragment key={block.id}>
        <div
          onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
          style={{
            position: 'absolute',
            left: block.x,
            top: block.y,
            width: block.width,
            height: block.height,
            backgroundColor: block.backgroundColor,
            borderRadius: block.borderRadius,
            border: isSelected ? '2px solid #2563eb' : '1px solid #9ca3af',
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.6 : 1,
            boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease, border-color 0.2s ease',
            userSelect: 'none',
            animation: isDeleting ? 'fadeOut 0.2s ease forwards' : 'scaleIn 0.3s ease forwards',
            zIndex: isSelected ? 10 : isDragging ? 100 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 500,
            color: '#374151',
          }}
        >
          {BLOCK_LABELS[block.type]}
        </div>

        {['top', 'right', 'bottom', 'left'].map((edge) => {
          const edgePos = getEdgePosition(block, edge as 'top' | 'right' | 'bottom' | 'left');
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

        {adjacentBlocks.map(({ block: adjBlock, gap }, idx) => {
          const gapLabel = gap.horizontal > 0 ? `${gap.horizontal}px` : `${gap.vertical}px`;
          const labelPos = getGapLabelPosition(block, adjBlock, gap);
          return (
            <div
              key={`${block.id}-gap-${idx}`}
              style={{
                position: 'absolute',
                left: labelPos.x,
                top: labelPos.y,
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
  };

  const getEdgePosition = (block: LayoutBlock, edge: 'top' | 'right' | 'bottom' | 'left'): React.CSSProperties => {
    const handleSize = 8;
    switch (edge) {
      case 'top':
        return {
          left: block.x + block.width / 2 - handleSize,
          top: block.y - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
      case 'right':
        return {
          left: block.x + block.width - handleSize,
          top: block.y + block.height / 2 - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
      case 'bottom':
        return {
          left: block.x + block.width / 2 - handleSize,
          top: block.y + block.height - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
      case 'left':
        return {
          left: block.x - handleSize,
          top: block.y + block.height / 2 - handleSize,
          width: handleSize * 2,
          height: handleSize * 2,
        };
    }
  };

  const getGapLabelPosition = (
    block: LayoutBlock,
    adjBlock: LayoutBlock,
    gap: { horizontal: number; vertical: number }
  ): { x: number; y: number } => {
    if (gap.horizontal > 0) {
      const minY = Math.max(block.y, adjBlock.y);
      const maxY = Math.min(block.y + block.height, adjBlock.y + adjBlock.height);
      return {
        x: Math.min(block.x + block.width, adjBlock.x + adjBlock.width) + gap.horizontal / 2 - 15,
        y: minY + (maxY - minY) / 2 - 10,
      };
    } else {
      const minX = Math.max(block.x, adjBlock.x);
      const maxX = Math.min(block.x + block.width, adjBlock.x + adjBlock.width);
      return {
        x: minX + (maxX - minX) / 2 - 15,
        y: Math.min(block.y + block.height, adjBlock.y + adjBlock.height) + gap.vertical / 2 - 10,
      };
    }
  };

  const gridLines = [];
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
    gridLines.push(
      <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={CANVAS_HEIGHT} stroke="#e5e7eb" strokeWidth={1} />
    );
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
    gridLines.push(
      <line key={`h-${y}`} x1={0} y1={y} x2={CANVAS_WIDTH} y2={y} stroke="#e5e7eb" strokeWidth={1} />
    );
  }

  const renderConnectionDragLine = () => {
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
  };

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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

        {dropPreview.visible && (
          <div
            style={{
              position: 'absolute',
              left: dropPreview.x,
              top: dropPreview.y,
              width: dropPreview.width,
              height: dropPreview.height,
              border: '2px dashed #93c5fd',
              backgroundColor: 'rgba(147, 197, 253, 0.3)',
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}

        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'auto' }}
        >
          {connections.map(renderConnection)}
          {renderConnectionDragLine()}
        </svg>

        {Array.from(blocks.values()).map(renderBlock)}
      </div>
    </div>
  );
};

export default Canvas;
