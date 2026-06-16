import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StorageLogic,
  StorageModule,
  GridConfig
} from '../logics/StorageLogic';
import { MODULE_STYLES, ModuleType } from '../data';

interface GridCanvasProps {
  onModuleDoubleClick: (moduleId: string) => void;
  highlightedModuleIds: Set<string>;
  flashModuleIds: Set<string>;
}

const GridCanvas: React.FC<GridCanvasProps> = ({
  onModuleDoubleClick,
  highlightedModuleIds,
  flashModuleIds
}) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState({});
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: number;
    value: string;
  } | null>(null);
  const [flashingCells, setFlashingCells] = useState<Set<string>>(new Set());
  const [overlapFlashingCells, setOverlapFlashingCells] = useState<Set<string>>(new Set());
  const [collisionMessage, setCollisionMessage] = useState<string | null>(null);
  const [draggingModule, setDraggingModule] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const gridConfig = StorageLogic.getGridConfig();
  const cells = StorageLogic.getCells();
  const modules = StorageLogic.getModules();
  const gridPixelSize = StorageLogic.getGridPixelSize();

  useEffect(() => {
    const unsubscribe = StorageLogic.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const triggerCellFlash = (row: number, col: number) => {
    const key = `${row}-${col}`;
    setFlashingCells((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setFlashingCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);
  };

  const triggerOverlapFlash = (row: number, col: number) => {
    const key = `${row}-${col}`;
    setOverlapFlashingCells((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setOverlapFlashingCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 500);
  };

  const showCollisionMessage = (message: string) => {
    setCollisionMessage(message);
    setTimeout(() => {
      setCollisionMessage(null);
    }, 1500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!gridContainerRef.current) return;

    const moduleType = e.dataTransfer.getData('application/module-type');
    if (!moduleType) return;

    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + gridContainerRef.current.scrollLeft;
    const y = e.clientY - rect.top + gridContainerRef.current.scrollTop;

    const position = StorageLogic.pixelToGridPosition(x, y);
    const style = MODULE_STYLES[moduleType as ModuleType];
    if (!style) return;

    const collision = StorageLogic.checkPlacementCollision(
      position.row,
      position.col,
      style.widthCells,
      style.heightCells
    );

    if (collision.hasCollision) {
      const endRow = position.row + style.heightCells - 1;
      const endCol = position.col + style.widthCells - 1;

      if (collision.collisionType === 'boundary') {
        flashGridBorder();
        for (let r = position.row; r <= Math.min(endRow, gridConfig.rows - 1); r++) {
          for (let c = position.col; c <= Math.min(endCol, gridConfig.cols - 1); c++) {
            if (r >= 0 && c >= 0) {
              triggerCellFlash(r, c);
            }
          }
        }
        showCollisionMessage('⚠️ 超出网格边界！');
      } else if (collision.collisionType === 'overlap') {
        const overlapModule = collision.overlappingModuleId
          ? StorageLogic.getModule(collision.overlappingModuleId)
          : null;
        const overlapLabel = overlapModule
          ? MODULE_STYLES[overlapModule.type].label
          : '其他模块';

        for (let r = position.row; r <= Math.min(endRow, gridConfig.rows - 1); r++) {
          for (let c = position.col; c <= Math.min(endCol, gridConfig.cols - 1); c++) {
            if (r >= 0 && c >= 0) {
              triggerOverlapFlash(r, c);
            }
          }
        }
        showCollisionMessage(`⚠️ 与 ${overlapLabel} 位置重叠！`);
      }
      return;
    }

    const result = StorageLogic.placeModule(
      moduleType as ModuleType,
      position.row,
      position.col
    );

    if (!result.success) {
      flashGridBorder();
    }
  };

  const flashGridBorder = () => {
    if (gridContainerRef.current) {
      gridContainerRef.current.style.animation = 'flashRed 0.3s ease';
      setTimeout(() => {
        if (gridContainerRef.current) {
          gridContainerRef.current.style.animation = '';
        }
      }, 300);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    const cell = StorageLogic.getCell(row, col);
    setEditingCell({
      row,
      col,
      value: cell?.name || ''
    });
  };

  const handleCellNameSubmit = () => {
    if (editingCell) {
      StorageLogic.setCellName(editingCell.row, editingCell.col, editingCell.value);
      setEditingCell(null);
    }
  };

  const handleModuleMouseDown = (
    e: React.MouseEvent,
    module: StorageModule
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const gridRect = gridContainerRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    setDraggingModule({
      id: module.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      currentX: rect.left - gridRect.left + gridContainerRef.current!.scrollLeft,
      currentY: rect.top - gridRect.top + gridContainerRef.current!.scrollTop
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingModule || !gridContainerRef.current) return;

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const x =
        e.clientX -
        gridRect.left +
        gridContainerRef.current.scrollLeft -
        draggingModule.offsetX;
      const y =
        e.clientY -
        gridRect.top +
        gridContainerRef.current.scrollTop -
        draggingModule.offsetY;

      setDraggingModule((prev) =>
        prev ? { ...prev, currentX: x, currentY: y } : null
      );
    },
    [draggingModule]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draggingModule || !gridContainerRef.current) {
        setDraggingModule(null);
        return;
      }

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const x =
        e.clientX -
        gridRect.left +
        gridContainerRef.current.scrollLeft -
        draggingModule.offsetX;
      const y =
        e.clientY -
        gridRect.top +
        gridContainerRef.current.scrollTop -
        draggingModule.offsetY;

      const position = StorageLogic.pixelToGridPosition(
        x + gridConfig.cellSize / 2,
        y + gridConfig.cellSize / 2
      );

      const module = StorageLogic.getModule(draggingModule.id);
      if (module) {
        const collision = StorageLogic.checkPlacementCollision(
          position.row,
          position.col,
          module.widthCells,
          module.heightCells,
          draggingModule.id
        );

        if (collision.hasCollision) {
          const endRow = position.row + module.heightCells - 1;
          const endCol = position.col + module.widthCells - 1;

          if (collision.collisionType === 'boundary') {
            flashGridBorder();
            for (let r = position.row; r <= Math.min(endRow, gridConfig.rows - 1); r++) {
              for (let c = position.col; c <= Math.min(endCol, gridConfig.cols - 1); c++) {
                if (r >= 0 && c >= 0) {
                  triggerCellFlash(r, c);
                }
              }
            }
            showCollisionMessage('⚠️ 超出网格边界！');
          } else if (collision.collisionType === 'overlap') {
            const overlapModule = collision.overlappingModuleId
              ? StorageLogic.getModule(collision.overlappingModuleId)
              : null;
            const overlapLabel = overlapModule
              ? MODULE_STYLES[overlapModule.type].label
              : '其他模块';

            for (let r = position.row; r <= Math.min(endRow, gridConfig.rows - 1); r++) {
              for (let c = position.col; c <= Math.min(endCol, gridConfig.cols - 1); c++) {
                if (r >= 0 && c >= 0) {
                  triggerOverlapFlash(r, c);
                }
              }
            }
            showCollisionMessage(`⚠️ 与 ${overlapLabel} 位置重叠！`);
          }
        } else {
          StorageLogic.moveModule(
            draggingModule.id,
            position.row,
            position.col
          );
        }
      }

      setDraggingModule(null);
    },
    [draggingModule, gridConfig.cellSize, gridConfig.rows, gridConfig.cols]
  );

  useEffect(() => {
    if (draggingModule) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingModule, handleMouseMove, handleMouseUp]);

  const containerStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#F5F5DC',
    borderRadius: '8px',
    padding: '16px',
    overflow: 'auto',
    border: '2px solid #D3D3D3',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    transition: 'background-color 0.3s ease'
  };

  const gridWrapperStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: gridConfig.gridBgColor,
    border: `2px solid ${gridConfig.gridLineColor}`,
    borderRadius: '4px',
    overflow: 'hidden'
  };

  const gridStyle: React.CSSProperties = {
    position: 'relative',
    width: `${gridPixelSize.width}px`,
    height: `${gridPixelSize.height}px`
  };

  const renderGridCells = () => {
    const cellElements: React.ReactNode[] = [];

    for (let row = 0; row < gridConfig.rows; row++) {
      for (let col = 0; col < gridConfig.cols; col++) {
        const key = `${row}-${col}`;
        const cell = StorageLogic.getCell(row, col);
        const isBoundaryFlashing = flashingCells.has(key);
        const isOverlapFlashing = overlapFlashingCells.has(key);
        const isEditing =
          editingCell && editingCell.row === row && editingCell.col === col;

        const cellBgColor = isOverlapFlashing
          ? 'rgba(255, 215, 0, 0.4)'
          : isBoundaryFlashing
          ? 'rgba(255, 107, 107, 0.3)'
          : 'transparent';

        const cellAnimation = isOverlapFlashing
          ? 'flashGold 0.5s ease'
          : isBoundaryFlashing
          ? 'flashRed 0.3s ease'
          : undefined;

        cellElements.push(
          <div
            key={key}
            onClick={() => handleCellClick(row, col)}
            style={{
              position: 'absolute',
              left: `${col * gridConfig.cellSize}px`,
              top: `${row * gridConfig.cellSize}px`,
              width: `${gridConfig.cellSize}px`,
              height: `${gridConfig.cellSize}px`,
              border: `1px solid ${gridConfig.gridLineColor}`,
              boxSizing: 'border-box',
              backgroundColor: cellBgColor,
              transition: 'background-color 0.15s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              padding: '2px 4px',
              fontSize: '10px',
              color: '#999',
              overflow: 'hidden',
              animation: cellAnimation
            }}
            title={cell?.name ? `${cell.name} (${row + 1}行${col + 1}列)` : `点击编辑名称 (${row + 1}行${col + 1}列)`}
          >
            {isEditing ? (
              <input
                autoFocus
                value={editingCell!.value}
                onChange={(e) =>
                  setEditingCell({
                    ...editingCell!,
                    value: e.target.value
                  })
                }
                onBlur={handleCellNameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCellNameSubmit();
                  if (e.key === 'Escape') setEditingCell(null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid #FFD700',
                  outline: 'none',
                  fontSize: '11px',
                  padding: '0 2px',
                  borderRadius: '2px',
                  color: '#2F4F4F',
                  backgroundColor: '#FFFEF0'
                }}
              />
            ) : (
              cell?.name && (
                <span
                  style={{
                    color: '#2F4F4F',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}
                >
                  {cell.name}
                </span>
              )
            )}
          </div>
        );
      }
    }

    return cellElements;
  };

  const renderModules = () => {
    return modules.map((module) => {
      const style = MODULE_STYLES[module.type];
      const isDragging = draggingModule?.id === module.id;
      const isHighlighted = highlightedModuleIds.has(module.id);
      const isFlashing = flashModuleIds.has(module.id);

      const pixelPos = isDragging && draggingModule
        ? { x: draggingModule.currentX, y: draggingModule.currentY }
        : StorageLogic.gridToPixelPosition(module.row, module.col);

      const width = module.widthCells * gridConfig.cellSize;
      const height = module.heightCells * gridConfig.cellSize;

      return (
        <div
          key={module.id}
          onMouseDown={(e) => handleModuleMouseDown(e, module)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onModuleDoubleClick(module.id);
          }}
          style={{
            position: 'absolute',
            left: `${pixelPos.x}px`,
            top: `${pixelPos.y}px`,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: style.bgColor,
            borderRadius: '4px',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 600,
            userSelect: 'none',
            zIndex: isDragging ? 100 : isHighlighted ? 50 : 10,
            opacity: isDragging ? 0.7 : 1,
            boxShadow: isDragging
              ? '0 12px 24px rgba(0,0,0,0.3)'
              : isHighlighted
              ? `0 0 0 3px #FFD700, 0 4px 12px rgba(0,0,0,0.2)`
              : '0 2px 6px rgba(0,0,0,0.15)',
            border: isHighlighted
              ? `3px solid #FFD700`
              : `1px solid rgba(0,0,0,0.2)`,
            transition: isDragging
              ? 'none'
              : 'left 0.2s ease, top 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            animation: isFlashing ? 'flashGold 0.5s ease' : undefined,
            overflow: 'hidden',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
          title={`${style.label} - 双击管理物品 (${module.row + 1}行${module.col + 1}列)`}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '4px'
            }}
          >
            <span>{style.label}</span>
            {module.items.length > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: '#2F4F4F',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  textShadow: 'none'
                }}
              >
                {module.items.length}类物品
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {collisionMessage && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FF6B6B',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            animation: 'modalFadeIn 0.2s ease'
          }}
        >
          {collisionMessage}
        </div>
      )}
      <div
        ref={gridContainerRef}
        data-grid-canvas
        style={containerStyle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div style={gridWrapperStyle}>
          <div style={gridStyle}>
            {renderGridCells()}
            {renderModules()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridCanvas;
