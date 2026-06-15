import React, { useState, useEffect, useRef, useCallback } from 'react';
import StickyNote, { StickyNoteData } from './StickyNote';

const PRESET_COLORS = [
  { value: '#FFF9C4', name: '米黄' },
  { value: '#FFCDD2', name: '浅粉' },
  { value: '#C8E6C9', name: '淡绿' },
  { value: '#B3E5FC', name: '天蓝' },
  { value: '#E1BEE7', name: '薰衣草紫' },
  { value: '#B2DFDB', name: '薄荷绿' },
];

const MAX_NOTES = 200;

interface CreateDialogState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [draggingIds, setDraggingIds] = useState<Set<string>>(new Set());
  const [zIndexCounter, setZIndexCounter] = useState(1);
  const zIndexRef = useRef(1);
  const [noteZIndices, setNoteZIndices] = useState<Record<string, number>>({});
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    color: PRESET_COLORS[0].value,
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const createTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:2555`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'init':
            setNotes(message.notes);
            setOnlineCount(message.onlineCount);
            const initialZ: Record<string, number> = {};
            message.notes.forEach((n: StickyNoteData, i: number) => {
              initialZ[n.id] = i + 1;
            });
            setNoteZIndices(initialZ);
            setZIndexCounter(message.notes.length + 1);
            zIndexRef.current = message.notes.length + 1;
            break;
          case 'note-create':
            setNotes((prev) => [...prev, message.note]);
            zIndexRef.current += 1;
            setNoteZIndices((prev) => ({
              ...prev,
              [message.note.id]: zIndexRef.current,
            }));
            setZIndexCounter(zIndexRef.current);
            break;
          case 'note-move':
            setNotes((prev) =>
              prev.map((n) =>
                n.id === message.id ? { ...n, x: message.x, y: message.y } : n
              )
            );
            break;
          case 'note-update':
            setNotes((prev) =>
              prev.map((n) =>
                n.id === message.id ? { ...n, text: message.text } : n
              )
            );
            break;
          case 'note-delete':
            setNotes((prev) => prev.filter((n) => n.id !== message.id));
            setNoteZIndices((prev) => {
              const next = { ...prev };
              delete next[message.id];
              return next;
            });
            break;
          case 'notes-clear':
            setNotes([]);
            setNoteZIndices({});
            break;
          case 'online-count':
            setOnlineCount(message.count);
            break;
          case 'error':
            setErrorMessage(message.message);
            setTimeout(() => setErrorMessage(null), 3000);
            break;
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onerror = () => {
      setErrorMessage('WebSocket连接失败，请刷新页面重试');
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (createDialog.visible && createTextRef.current) {
      createTextRef.current.focus();
      createTextRef.current.select();
    }
  }, [createDialog.visible]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const handleWallDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-note]')) return;
    if (notes.length >= MAX_NOTES) {
      setErrorMessage(`便签数量已达上限（${MAX_NOTES}个）`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const rect = wallRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - 100;
    const y = e.clientY - rect.top - 100;
    setCreateDialog({
      visible: true,
      x: Math.max(0, x),
      y: Math.max(0, y),
      text: '',
      color: PRESET_COLORS[0].value,
    });
  };

  const handleCreateConfirm = () => {
    sendMessage({
      type: 'note-create',
      x: createDialog.x,
      y: createDialog.y,
      text: createDialog.text,
      color: createDialog.color,
    });
    setCreateDialog((prev) => ({ ...prev, visible: false }));
  };

  const handleCreateCancel = () => {
    setCreateDialog((prev) => ({ ...prev, visible: false }));
  };

  const handleNoteMove = useCallback(
    (id: string, x: number, y: number) => {
      sendMessage({ type: 'note-move', id, x, y });
    },
    [sendMessage]
  );

  const handleNoteUpdate = useCallback(
    (id: string, text: string) => {
      sendMessage({ type: 'note-update', id, text });
    },
    [sendMessage]
  );

  const handleNoteDelete = useCallback(
    (id: string) => {
      sendMessage({ type: 'note-delete', id });
    },
    [sendMessage]
  );

  const handleDragStart = useCallback((id: string) => {
    setDraggingIds((prev) => new Set(prev).add(id));
  }, []);

  const handleDragEnd = useCallback((id: string) => {
    setDraggingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleNoteFocus = useCallback(
    (id: string) => {
      zIndexRef.current += 1;
      const newZ = zIndexRef.current;
      setNoteZIndices((prev) => ({ ...prev, [id]: newZ }));
      setZIndexCounter(newZ);
    },
    []
  );

  const handleClearAll = () => {
    sendMessage({ type: 'notes-clear' });
    setShowClearConfirm(false);
  };

  const noteWidth = isMobile ? 160 : 200;
  const noteHeight = isMobile ? 160 : 200;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          height: '56px',
          backgroundColor: '#FAFAFA',
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          zIndex: 1000,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📝</span>
          <span
            style={{
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: 600,
              color: '#424242',
            }}
          >
            {isMobile ? '' : '便签墙'}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#E3F2FD',
            padding: '6px 14px',
            borderRadius: '20px',
          }}
        >
          <span style={{ fontSize: '16px' }}>👥</span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1976D2',
            }}
          >
            {onlineCount}
          </span>
        </div>
      </div>

      <div
        ref={wallRef}
        onDoubleClick={handleWallDoubleClick}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#ffffff',
          backgroundImage:
            'radial-gradient(circle, #EEEEEE 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {notes.map((note) => (
          <div key={note.id} data-note style={{ width: noteWidth, height: noteHeight }}>
            <StickyNote
              note={note}
              isDragging={draggingIds.has(note.id)}
              onMove={handleNoteMove}
              onUpdate={handleNoteUpdate}
              onDelete={handleNoteDelete}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              zIndex={noteZIndices[note.id] || 1}
              onFocus={handleNoteFocus}
            />
          </div>
        ))}

        {notes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#9E9E9E',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖊️</div>
            <div style={{ fontSize: '16px' }}>双击空白处创建便签</div>
          </div>
        )}
      </div>

      <div
        style={{
          height: '64px',
          backgroundColor: '#FAFAFA',
          borderTop: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '12px',
          flexShrink: 0,
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setShowClearConfirm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: '#FFEBEE',
            color: '#C62828',
            fontSize: isMobile ? '0px' : '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFCDD2';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFEBEE';
          }}
        >
          <span style={{ fontSize: '16px' }}>🗑️</span>
          {!isMobile && '清空墙面'}
        </button>

        <div
          style={{
            marginLeft: 'auto',
            fontSize: '12px',
            color: '#9E9E9E',
          }}
        >
          {notes.length} / {MAX_NOTES} 便签
        </div>
      </div>

      {createDialog.visible && (
        <>
          <div
            onClick={handleCreateCancel}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 2000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '90vw' : '400px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: '24px',
              zIndex: 2001,
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '20px',
                color: '#424242',
              }}
            >
              创建便签
            </h3>

            <textarea
              ref={createTextRef}
              value={createDialog.text}
              onChange={(e) =>
                setCreateDialog((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder="输入便签内容..."
              style={{
                width: '100%',
                height: '100px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  fontSize: '13px',
                  color: '#616161',
                  marginBottom: '8px',
                }}
              >
                选择颜色
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() =>
                      setCreateDialog((prev) => ({ ...prev, color: color.value }))
                    }
                    title={color.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border:
                        createDialog.color === color.value
                          ? '3px solid #424242'
                          : '2px solid transparent',
                      backgroundColor: color.value,
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      boxShadow:
                        createDialog.color === color.value
                          ? '0 2px 8px rgba(0,0,0,0.15)'
                          : 'none',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        'scale(1)';
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleCreateCancel}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #E0E0E0',
                  backgroundColor: '#ffffff',
                  color: '#616161',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#F5F5F5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#ffffff';
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateConfirm}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1976D2',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#1565C0';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#1976D2';
                }}
              >
                确定
              </button>
            </div>
          </div>
        </>
      )}

      {showClearConfirm && (
        <>
          <div
            onClick={() => setShowClearConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 2000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '90vw' : '360px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: '24px',
              zIndex: 2001,
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', textAlign: 'center' }}>
              ⚠️
            </div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#424242',
                textAlign: 'center',
              }}
            >
              确认清空墙面？
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#757575',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              此操作将删除所有便签，且无法恢复。
            </p>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #E0E0E0',
                  backgroundColor: '#ffffff',
                  color: '#616161',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#D32F2F',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                确认清空
              </button>
            </div>
          </div>
        </>
      )}

      {errorMessage && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFEBEE',
            color: '#C62828',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 3000,
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default App;
