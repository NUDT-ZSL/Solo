import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Board from './Board';
import { Board as BoardType, StickyNoteData, WSMessage } from './types';

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  sidebar: {
    width: '240px',
    minWidth: '0',
    backgroundColor: '#2C3E50',
    color: '#ECF0F1',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    transition: 'transform 0.3s ease',
    flexShrink: 0,
  },
  sidebarPlaceholder: {
    width: '240px',
    minWidth: '0',
    flexShrink: 0,
    backgroundColor: '#2C3E50',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  userId: {
    fontSize: '12px',
    opacity: 0.7,
    wordBreak: 'break-all',
    marginBottom: '12px',
  },
  createBtn: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#3498DB',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  boardList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  boardItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    margin: '8px',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minWidth: 0,
  },
  hamburger: {
    position: 'fixed',
    top: '12px',
    left: '12px',
    zIndex: 101,
    background: '#2C3E50',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  hamburgerIcon: {
    fontSize: '24px',
    color: '#fff',
    lineHeight: 1,
    display: 'block',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    width: '400px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#333',
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelBtn: {
    padding: '8px 20px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  confirmBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3498DB',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  overlayMobile: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
};

function App() {
  const [userId] = useState<string>(() => {
    const stored = localStorage.getItem('whiteboard_user_id');
    return stored || uuidv4();
  });
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSidebarTooNarrow, setIsSidebarTooNarrow] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const sidebarWrapperRef = useRef<HTMLDivElement>(null);
  const lastAutoOpenRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('whiteboard_user_id', userId);
  }, [userId]);

  useEffect(() => {
    const container = sidebarWrapperRef.current;
    if (!container) return;

    const checkWidth = () => {
      const rect = container.getBoundingClientRect();
      const tooNarrow = rect.width < 240;
      setIsSidebarTooNarrow(tooNarrow);
      if (!tooNarrow && !lastAutoOpenRef.current) {
        setShowSidebar(true);
      }
      if (tooNarrow && !lastAutoOpenRef.current) {
        lastAutoOpenRef.current = true;
      }
    };

    checkWidth();

    const ro = new ResizeObserver(() => {
      checkWidth();
    });
    ro.observe(container);

    window.addEventListener('resize', checkWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', checkWidth);
    };
  }, []);

  useEffect(() => {
    fetch('/api/boards')
      .then((res) => res.json())
      .then((data: BoardType[]) => {
        setBoards(data);
        if (data.length > 0 && !currentBoardId) {
          setCurrentBoardId(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type === 'BOARD_STATE' && msg.payload.boardId === currentBoardId) {
          setNotes(msg.payload.notes);
        } else if (msg.type === 'createNote') {
          setNotes((prev) => [...prev, msg.payload.note]);
        } else if (msg.type === 'moveNote') {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === msg.payload.noteId
                ? { ...n, x: msg.payload.x, y: msg.payload.y }
                : n
            )
          );
        } else if (msg.type === 'updateNote') {
          setNotes((prev) =>
            prev.map((n) => {
              if (n.id === msg.payload.noteId) {
                const updated = { ...n };
                if (msg.payload.content !== undefined) updated.content = msg.payload.content;
                if (msg.payload.color !== undefined) updated.color = msg.payload.color;
                return updated;
              }
              return n;
            })
          );
        } else if (msg.type === 'deleteNote') {
          setNotes((prev) => prev.filter((n) => n.id !== msg.payload.noteId));
        } else if (msg.type === 'ONLINE_COUNT') {
          if (msg.payload.boardId === currentBoardId) {
            setOnlineCount(msg.payload.count);
          }
        }
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [currentBoardId]);

  useEffect(() => {
    if (wsRef.current && currentBoardId) {
      const ws = wsRef.current;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: 'JOIN_BOARD', payload: { boardId: currentBoardId } })
        );
      } else {
        ws.onopen = () => {
          ws.send(
            JSON.stringify({ type: 'JOIN_BOARD', payload: { boardId: currentBoardId } })
          );
        };
      }
    }
  }, [currentBoardId]);

  const sendWS = useCallback(
    (message: WSMessage) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    },
    []
  );

  const handleCreateBoard = () => {
    setShowModal(true);
    setTimeout(() => modalInputRef.current?.focus(), 100);
  };

  const handleConfirmCreateBoard = () => {
    if (!newBoardName.trim() || newBoardName.length > 20) return;
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBoardName.trim() }),
    })
      .then((res) => res.json())
      .then((board: BoardType) => {
        setBoards((prev) => [...prev, board]);
        setShowModal(false);
        setNewBoardName('');
      });
  };

  const currentBoard = boards.find((b) => b.id === currentBoardId);

  const sidebarStyle: React.CSSProperties = {
    ...styles.sidebar,
  };

  const showHamburger = isSidebarTooNarrow;

  if (isSidebarTooNarrow) {
    sidebarStyle.position = 'fixed';
    sidebarStyle.left = 0;
    sidebarStyle.top = 0;
    sidebarStyle.zIndex = 100;
    sidebarStyle.height = '100vh';
    sidebarStyle.width = '240px';
    sidebarStyle.transform = showSidebar ? 'translateX(0)' : 'translateX(-100%)';
    sidebarStyle.boxShadow = '2px 0 10px rgba(0,0,0,0.2)';
  }

  const hamburgerStyle: React.CSSProperties = {
    ...styles.hamburger,
    display: showHamburger ? 'block' : 'none',
  };

  return (
    <div style={styles.app} ref={appRef}>
      <button
        style={hamburgerStyle}
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <span style={styles.hamburgerIcon}>☰</span>
      </button>

      {!isSidebarTooNarrow && (
        <div ref={sidebarWrapperRef} style={styles.sidebarPlaceholder}>
          <div style={{ ...sidebarStyle, position: 'relative', zIndex: 0, width: '100%' }}>
            <div style={styles.header}>
              <div style={styles.userId}>用户ID: {userId.substring(0, 8)}...</div>
              <button style={styles.createBtn} onClick={handleCreateBoard}>
                + 创建白板
              </button>
            </div>
            <div style={styles.boardList}>
              {boards.map((board) => {
                const isActive = board.id === currentBoardId;
                return (
                  <div
                    key={board.id}
                    style={{
                      ...styles.boardItem,
                      backgroundColor: isActive
                        ? 'rgba(52, 152, 219, 0.5)'
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor =
                          'rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor =
                          'transparent';
                      }
                    }}
                    onClick={() => {
                      setCurrentBoardId(board.id);
                    }}
                  >
                    <span>{board.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isSidebarTooNarrow && (
        <div ref={sidebarWrapperRef} style={{ width: 0, height: '100%', flexShrink: 0, overflow: 'hidden' }}>
          <div style={sidebarStyle}>
            <div style={styles.header}>
              <div style={styles.userId}>用户ID: {userId.substring(0, 8)}...</div>
              <button style={styles.createBtn} onClick={handleCreateBoard}>
                + 创建白板
              </button>
            </div>
            <div style={styles.boardList}>
              {boards.map((board) => {
                const isActive = board.id === currentBoardId;
                return (
                  <div
                    key={board.id}
                    style={{
                      ...styles.boardItem,
                      backgroundColor: isActive
                        ? 'rgba(52, 152, 219, 0.5)'
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor =
                          'rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor =
                          'transparent';
                      }
                    }}
                    onClick={() => {
                      setCurrentBoardId(board.id);
                      setShowSidebar(false);
                    }}
                  >
                    <span>{board.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={styles.mainContent}>
        {currentBoard && (
          <Board
            boardId={currentBoard.id}
            boardName={currentBoard.name}
            notes={notes}
            sendWS={sendWS}
            onlineCount={onlineCount}
            userId={userId}
            setNotes={setNotes}
          />
        )}
      </div>

      {isSidebarTooNarrow && showSidebar && (
        <div
          style={styles.overlayMobile}
          onClick={() => setShowSidebar(false)}
        />
      )}

      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>创建新白板</h3>
            <input
              ref={modalInputRef}
              style={styles.modalInput}
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="请输入白板名称（最多20字）"
              maxLength={20}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreateBoard();
              }}
            />
            <div style={styles.modalButtons}>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setShowModal(false);
                  setNewBoardName('');
                }}
              >
                取消
              </button>
              <button style={styles.confirmBtn} onClick={handleConfirmCreateBoard}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
