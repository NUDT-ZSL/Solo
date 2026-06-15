import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ComponentPanel from './ComponentPanel';
import Canvas from './Canvas';
import PropertyPanel from './PropertyPanel';
import {
  LayoutBlock,
  LayoutConnection,
  LayoutBlockType,
  DEFAULT_BLOCK_DIMENSIONS,
  DEFAULT_BACKGROUND_COLORS,
  CANVAS_WIDTH,
  calculateActualWidth,
  adjustChildrenPositions,
  serializeToJSON,
  downloadJSON,
} from './LayoutEngine';

function App() {
  const [blocks, setBlocks] = useState<Map<string, LayoutBlock>>(new Map());
  const [connections, setConnections] = useState<LayoutConnection[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [deletingBlockIds, setDeletingBlockIds] = useState<Set<string>>(new Set());
  const [deletingConnectionIds, setDeletingConnectionIds] = useState<Set<string>>(new Set());
  const appRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((_type: LayoutBlockType) => {
  }, []);

  const handleBlockDrop = useCallback((type: LayoutBlockType, x: number, y: number) => {
    const dims = DEFAULT_BLOCK_DIMENSIONS[type];
    const id = uuidv4();
    const newBlock: LayoutBlock = {
      id,
      type,
      x,
      y,
      width: dims.width,
      height: dims.height,
      backgroundColor: DEFAULT_BACKGROUND_COLORS[type],
      borderRadius: 4,
      widthPercent: 100,
      parentId: null,
      children: [],
    };

    setBlocks((prev) => {
      const updated = new Map(prev);
      updated.set(id, newBlock);
      return updated;
    });
    setSelectedBlockId(id);
    setSelectedConnectionId(null);
  }, []);

  const handleBlockMove = useCallback((id: string, x: number, y: number) => {
    setBlocks((prev) => {
      const updated = new Map(prev);
      const block = updated.get(id);
      if (block) {
        updated.set(id, { ...block, x, y });
      }
      return updated;
    });
  }, []);

  const handleBlockSelect = useCallback((id: string | null) => {
    setSelectedBlockId(id);
    if (id) {
      setSelectedConnectionId(null);
    }
  }, []);

  const handleConnectionSelect = useCallback((id: string | null) => {
    setSelectedConnectionId(id);
    if (id) {
      setSelectedBlockId(null);
    }
  }, []);

  const handleWidthChange = useCallback((percent: number) => {
    if (!selectedBlockId) return;
    setBlocks((prev) => {
      const updated = new Map(prev);
      const block = updated.get(selectedBlockId);
      if (block) {
        const newWidth = calculateActualWidth(percent, CANVAS_WIDTH);
        updated.set(selectedBlockId, {
          ...block,
          widthPercent: percent,
          width: newWidth,
        });
        if (block.children.length > 0) {
          const adjusted = adjustChildrenPositions(selectedBlockId, updated);
          return adjusted;
        }
      }
      return updated;
    });
  }, [selectedBlockId]);

  const handleBackgroundColorChange = useCallback((color: string) => {
    if (!selectedBlockId) return;
    setBlocks((prev) => {
      const updated = new Map(prev);
      const block = updated.get(selectedBlockId);
      if (block) {
        updated.set(selectedBlockId, { ...block, backgroundColor: color });
      }
      return updated;
    });
  }, [selectedBlockId]);

  const handleBorderRadiusChange = useCallback((radius: number) => {
    if (!selectedBlockId) return;
    setBlocks((prev) => {
      const updated = new Map(prev);
      const block = updated.get(selectedBlockId);
      if (block) {
        updated.set(selectedBlockId, { ...block, borderRadius: radius });
      }
      return updated;
    });
  }, [selectedBlockId]);

  const handleConnectionCreate = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    setBlocks((prev) => {
      const updated = new Map(prev);
      const fromBlock = updated.get(fromId);
      const toBlock = updated.get(toId);
      if (!fromBlock || !toBlock) return prev;

      if (toBlock.parentId) return prev;

      let parent = fromBlock;
      while (parent.parentId) {
        if (parent.parentId === toId) return prev;
        const p = updated.get(parent.parentId);
        if (!p) break;
        parent = p;
      }

      updated.set(fromId, {
        ...fromBlock,
        children: [...fromBlock.children, toId],
      });
      updated.set(toId, {
        ...toBlock,
        parentId: fromId,
      });

      return adjustChildrenPositions(fromId, updated);
    });

    const existingConn = connections.find(
      (c) => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
    );
    if (!existingConn) {
      const newConnection: LayoutConnection = {
        id: uuidv4(),
        fromId,
        toId,
      };
      setConnections((prev) => [...prev, newConnection]);
    }
  }, [connections]);

  const deleteBlock = useCallback((blockId: string) => {
    setDeletingBlockIds((prev) => {
      const updated = new Set(prev);
      updated.add(blockId);
      return updated;
    });

    setTimeout(() => {
      setBlocks((prev) => {
        const updated = new Map(prev);
        const block = updated.get(blockId);
        if (!block) return prev;

        const deleteRecursive = (id: string) => {
          const b = updated.get(id);
          if (!b) return;
          for (const childId of b.children) {
            deleteRecursive(childId);
          }
          updated.delete(id);
          setDeletingBlockIds((prevSet) => {
            const newSet = new Set(prevSet);
            newSet.add(id);
            return newSet;
          });
        };

        if (block.parentId) {
          const parent = updated.get(block.parentId);
          if (parent) {
            updated.set(block.parentId, {
              ...parent,
              children: parent.children.filter((cid) => cid !== blockId),
            });
          }
        }

        deleteRecursive(blockId);

        return updated;
      });

      setConnections((prev) =>
        prev.filter((c) => c.fromId !== blockId && c.toId !== blockId)
      );

      setTimeout(() => {
        setDeletingBlockIds((prev) => {
          const updated = new Set(prev);
          updated.delete(blockId);
          return updated;
        });
      }, 200);
    }, 50);

    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);

  const deleteConnection = useCallback((connectionId: string) => {
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn) return;

    setDeletingConnectionIds((prev) => {
      const updated = new Set(prev);
      updated.add(connectionId);
      return updated;
    });

    setTimeout(() => {
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));

      setBlocks((prev) => {
        const updated = new Map(prev);
        const fromBlock = updated.get(conn.fromId);
        const toBlock = updated.get(conn.toId);
        if (fromBlock && toBlock) {
          updated.set(conn.fromId, {
            ...fromBlock,
            children: fromBlock.children.filter((cid) => cid !== conn.toId),
          });
          updated.set(conn.toId, {
            ...toBlock,
            parentId: null,
          });
        }
        return updated;
      });

      setDeletingConnectionIds((prev) => {
        const updated = new Set(prev);
        updated.delete(connectionId);
        return updated;
      });
    }, 200);

    if (selectedConnectionId === connectionId) {
      setSelectedConnectionId(null);
    }
  }, [connections, selectedConnectionId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        if (selectedBlockId) {
          deleteBlock(selectedBlockId);
        } else if (selectedConnectionId) {
          deleteConnection(selectedConnectionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, selectedConnectionId, deleteBlock, deleteConnection]);

  const handleExport = useCallback(() => {
    const data = serializeToJSON(blocks, connections);
    downloadJSON(data, 'layout.json');
    setShowExportDialog(false);
  }, [blocks, connections]);

  const selectedBlock = selectedBlockId ? blocks.get(selectedBlockId) || null : null;

  return (
    <div
      ref={appRef}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        padding: 16,
        gap: 16,
        backgroundColor: '#e5e7eb',
        position: 'relative',
      }}
    >
      <ComponentPanel onDragStart={handleDragStart} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <span style={{ fontSize: 12, color: '#6b7280' }}>缩放</span>
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151',
              }}
            >
              -
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151',
              }}
            >
              +
            </button>
          </div>

          <button
            onClick={() => setShowExportDialog(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            导出 JSON
          </button>
        </div>

        <Canvas
          blocks={blocks}
          connections={connections}
          selectedBlockId={selectedBlockId}
          selectedConnectionId={selectedConnectionId}
          onBlockSelect={handleBlockSelect}
          onConnectionSelect={handleConnectionSelect}
          onBlockMove={handleBlockMove}
          onBlockDrop={handleBlockDrop}
          onConnectionCreate={handleConnectionCreate}
          zoom={zoom}
          onZoomChange={setZoom}
          deletingBlockIds={deletingBlockIds}
          deletingConnectionIds={deletingConnectionIds}
        />
      </div>

      <PropertyPanel
        selectedBlock={selectedBlock}
        onWidthChange={handleWidthChange}
        onBackgroundColorChange={handleBackgroundColorChange}
        onBorderRadiusChange={handleBorderRadiusChange}
      />

      {showExportDialog && (
        <div className="modal-overlay" onClick={() => setShowExportDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">确认导出</div>
            <div className="modal-message">
              确定要将当前布局导出为 JSON 文件吗？文件将包含所有布局块的位置、尺寸和层级关系。
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowExportDialog(false)}
              >
                取消
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleExport}
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
