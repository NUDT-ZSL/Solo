import { useState, useEffect, useRef, useCallback } from 'react';
import CanvasRenderer from '../components/CanvasRenderer';
import DialogBubble from '../components/DialogBubble';
import CharacterToolbar from '../components/CharacterToolbar';
import HistoryPanel from '../components/HistoryPanel';
import { useStore, CHARACTERS } from '../store/useStore';
import type { User } from '../types';

interface PanelEditorProps {
  user: User;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 800;
const GRID_COLS = 6;
const GRID_ROWS = 4;
const SAVE_THROTTLE_MS = 300;

export default function PanelEditor({ user }: PanelEditorProps) {
  const {
    dialogs,
    historyRecords,
    currentPanelId,
    loadDialogs,
    loadHistory,
    addDialog,
    moveDialog,
    saveDialogPosition,
    updateDialogText,
    updateDialogCharacter
  } = useStore();

  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [editingDialogId, setEditingDialogId] = useState<string | null>(null);
  const [draggingDialogId, setDraggingDialogId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const cellWidth = CANVAS_WIDTH / GRID_COLS;
  const cellHeight = CANVAS_HEIGHT / GRID_ROWS;

  const getPanelId = (row: number, col: number) => `panel_${row}_${col}`;

  const handlePanelClick = (row: number, col: number) => {
    const panelId = getPanelId(row, col);
    setSelectedPanel(panelId);
    loadDialogs(panelId);
    loadHistory(panelId);
    setEditingDialogId(null);
  };

  const handleCanvasDoubleClick = useCallback(
    (x: number, y: number) => {
      if (!selectedPanel) return;

      const panelIndex = selectedPanel.split('_');
      const row = parseInt(panelIndex[1]);
      const col = parseInt(panelIndex[2]);

      const panelX = col * cellWidth;
      const panelY = row * cellHeight;

      const relativeX = x - panelX;
      const relativeY = y - panelY;

      if (
        relativeX < 10 ||
        relativeX > cellWidth - 10 ||
        relativeY < 10 ||
        relativeY > cellHeight - 10
      ) {
        return;
      }

      const bubbleWidth = 150;
      const bubbleHeight = 60;
      let bubbleX = x - bubbleWidth / 2;
      let bubbleY = y - bubbleHeight / 2;

      bubbleX = Math.max(panelX + 5, Math.min(panelX + cellWidth - bubbleWidth - 5, bubbleX));
      bubbleY = Math.max(panelY + 5, Math.min(panelY + cellHeight - bubbleHeight - 5, bubbleY));

      addDialog({
        panelId: selectedPanel,
        text: '',
        character: '未分配',
        characterColor: '#999999',
        x: bubbleX,
        y: bubbleY,
        width: bubbleWidth,
        height: bubbleHeight
      });
    },
    [selectedPanel, addDialog, cellWidth, cellHeight]
  );

  const debouncedSavePosition = useCallback(
    (id: string) => {
      if (saveTimerRef.current[id]) {
        clearTimeout(saveTimerRef.current[id]);
      }
      saveTimerRef.current[id] = setTimeout(() => {
        saveDialogPosition(id, user.name);
      }, SAVE_THROTTLE_MS);
    },
    [saveDialogPosition, user.name]
  );

  const handleDragStart = (dialogId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingDialogId(dialogId);
    setEditingDialogId(null);
  };

  const handleDrag = (dialogId: string, x: number, y: number) => {
    if (!selectedPanel) return;

    const panelIndex = selectedPanel.split('_');
    const row = parseInt(panelIndex[1]);
    const col = parseInt(panelIndex[2]);

    const panelX = col * cellWidth;
    const panelY = row * cellHeight;
    const dialog = dialogs.find((d) => d._id === dialogId);

    if (!dialog) return;

    const minX = panelX + 5;
    const maxX = panelX + cellWidth - dialog.width - 5;
    const minY = panelY + 5;
    const maxY = panelY + cellHeight - dialog.height - 5;

    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));

    moveDialog(dialogId, clampedX, clampedY, user.name);
    debouncedSavePosition(dialogId);
  };

  const handleDragEnd = (dialogId: string) => {
    setDraggingDialogId(null);
    saveDialogPosition(dialogId, user.name);
    if (saveTimerRef.current[dialogId]) {
      clearTimeout(saveTimerRef.current[dialogId]);
      delete saveTimerRef.current[dialogId];
    }
  };

  const handleEditStart = (dialogId: string) => {
    setEditingDialogId(dialogId);
  };

  const handleEditEnd = (dialogId: string, text: string) => {
    if (editingDialogId === dialogId) {
      const dialog = dialogs.find((d) => d._id === dialogId);
      if (dialog && dialog.text !== text) {
        updateDialogText(dialogId, text, user.name);
      }
      setEditingDialogId(null);
    }
  };

  const handleCharacterDrop = (dialogId: string, character: string, color: string) => {
    setDropTargetId(dialogId);
    setTimeout(() => setDropTargetId(null), 300);
    updateDialogCharacter(dialogId, character, color, user.name);
  };

  const handleHistoryClick = () => {
    if (selectedPanel) {
      loadHistory(selectedPanel);
    }
    setHistoryOpen(!historyOpen);
  };

  const handleContainerClick = () => {
    if (editingDialogId) {
      const dialog = dialogs.find((d) => d._id === editingDialogId);
      if (dialog) {
        updateDialogText(editingDialogId, dialog.text, user.name);
      }
      setEditingDialogId(null);
    }
  };

  const panelDialogs = dialogs.filter((d) => d.panelId === selectedPanel);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: 'var(--bg-color)',
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: 16 }}>
        <CharacterToolbar
          characters={CHARACTERS}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '16px 0'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '12px 24px',
            marginBottom: 16,
            gap: 16
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--primary-color)'
            }}
          >
            PanelCanvas
          </h1>
          <span style={{ color: '#888', fontSize: 14 }}>
            漫画分镜与对白协同管理
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#666' }}>
            当前用户：{user.name}
          </span>
          <button
            onClick={handleHistoryClick}
            disabled={!selectedPanel}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              backgroundColor: selectedPanel ? 'var(--secondary-color)' : '#ccc',
              color: 'white',
              fontSize: 14,
              cursor: selectedPanel ? 'pointer' : 'not-allowed'
            }}
          >
            🕐 历史记录
          </button>
        </div>

        {selectedPanel && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: 12,
              fontSize: 14,
              color: '#666'
            }}
          >
            当前编辑：{selectedPanel.replace('panel_', '第 ').replace('_', ' 行，第 ')} 列
          </div>
        )}

        <div
          ref={containerRef}
          onClick={handleContainerClick}
          style={{
            position: 'relative',
            margin: '0 auto',
            userSelect: 'none'
          }}
        >
          <CanvasRenderer
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            gridCols={GRID_COLS}
            gridRows={GRID_ROWS}
            dialogs={panelDialogs}
            onDoubleClick={handleCanvasDoubleClick}
          />

          {Array.from({ length: GRID_ROWS }).map((_, row) =>
            Array.from({ length: GRID_COLS }).map((_, col) => {
              const panelId = getPanelId(row, col);
              const isSelected = selectedPanel === panelId;
              return (
                <div
                  key={panelId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePanelClick(row, col);
                  }}
                  style={{
                    position: 'absolute',
                    left: col * cellWidth,
                    top: row * cellHeight,
                    width: cellWidth,
                    height: cellHeight,
                    border: isSelected ? '2px solid #3498DB' : '2px solid transparent',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    pointerEvents: 'none'
                  }}
                />
              );
            })
          )}

          {panelDialogs.map((dialog) => (
            <DialogBubble
              key={dialog._id}
              dialog={dialog}
              isEditing={editingDialogId === dialog._id}
              isDragging={draggingDialogId === dialog._id}
              isDropTarget={dropTargetId === dialog._id}
              onEditStart={() => handleEditStart(dialog._id)}
              onEditEnd={(text) => handleEditEnd(dialog._id, text)}
              onDragStart={(e) => handleDragStart(dialog._id, e)}
              onDrag={(x, y) => handleDrag(dialog._id, x, y)}
              onDragEnd={() => handleDragEnd(dialog._id)}
              onCharacterDrop={(character, color) =>
                handleCharacterDrop(dialog._id, character, color)
              }
            />
          ))}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 13,
            color: '#888'
          }}
        >
          点击格子进入编辑模式 · 双击格子空白处添加对白气泡 · 拖拽角色色块分配角色
        </div>
      </div>

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        historyRecords={historyRecords}
      />

      <style>{`
        @media (max-width: 768px) {
          .character-toolbar {
            position: fixed !important;
          }
        }
      `}</style>
    </div>
  );
}
