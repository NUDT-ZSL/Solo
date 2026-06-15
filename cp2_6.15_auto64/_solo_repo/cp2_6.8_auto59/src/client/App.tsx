import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import TreeView from './TreeView';

interface EditHistory {
  authorId: string;
  authorName: string;
  timestamp: number;
  content: string;
}

interface Paragraph {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  parentId: string | null;
  children: string[];
  history: EditHistory[];
}

interface Member {
  id: string;
  name: string;
  avatarColor: string;
  online: boolean;
}

interface RoomState {
  roomName: string;
  paragraphs: Record<string, Paragraph>;
  rootParagraphId: string | null;
  members: Record<string, Member>;
}

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#22C55E', '#FF8BAC'];

const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const truncate = (text: string, max: number) => text.length > max ? text.slice(0, max) + '...' : text;

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [currentUserId] = useState(uuidv4());
  const [currentUserColor, setCurrentUserColor] = useState(getAvatarColor(0));
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newReplyContent, setNewReplyContent] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const joinRoom = useCallback(() => {
    if (!roomNameInput.trim() || !nicknameInput.trim()) return;
    const s = io('/', { transports: ['websocket', 'polling'] });
    s.on('connect', () => {
      s.emit('joinRoom', {
        roomName: roomNameInput.trim(),
        user: {
          id: currentUserId,
          name: nicknameInput.trim(),
          avatarColor: currentUserColor,
        },
      });
    });
    s.on('roomState', (state: RoomState) => {
      setRoomState(state);
      if (state.rootParagraphId) {
        setSelectedParagraphId(state.rootParagraphId);
        setExpandedNodes(prev => new Set(prev).add(state.rootParagraphId!));
      }
      setJoined(true);
    });
    s.on('paragraphAdded', ({ paragraph, parentId }: { paragraph: Paragraph; parentId: string | null }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        const newParagraphs = { ...prev.paragraphs, [paragraph.id]: paragraph };
        let newRootId = prev.rootParagraphId;
        if (parentId) {
          const parent = { ...newParagraphs[parentId] };
          parent.children = [...parent.children, paragraph.id];
          newParagraphs[parentId] = parent;
        } else {
          newRootId = paragraph.id;
        }
        setExpandedNodes(prev2 => {
          const next = new Set(prev2);
          if (parentId) next.add(parentId);
          return next;
        });
        return { ...prev, paragraphs: newParagraphs, rootParagraphId: newRootId };
      });
    });
    s.on('paragraphUpdated', (paragraph: Paragraph) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          paragraphs: { ...prev.paragraphs, [paragraph.id]: paragraph },
        };
      });
    });
    s.on('paragraphDeleted', ({ paragraphId, parentId }: { paragraphId: string; parentId: string | null }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        const newParagraphs = { ...prev.paragraphs };
        const deleteRecursive = (id: string) => {
          const p = newParagraphs[id];
          if (!p) return;
          p.children.forEach(c => deleteRecursive(c));
          delete newParagraphs[id];
        };
        deleteRecursive(paragraphId);
        if (parentId && newParagraphs[parentId]) {
          const parent = { ...newParagraphs[parentId] };
          parent.children = parent.children.filter(c => c !== paragraphId);
          newParagraphs[parentId] = parent;
        }
        let newRootId = prev.rootParagraphId;
        if (prev.rootParagraphId === paragraphId) {
          newRootId = null;
        }
        return { ...prev, paragraphs: newParagraphs, rootParagraphId: newRootId };
      });
      if (selectedParagraphId === paragraphId) {
        setSelectedParagraphId(roomState?.rootParagraphId || null);
      }
    });
    s.on('membersUpdated', (members: Record<string, Member>) => {
      setRoomState(prev => prev ? { ...prev, members } : prev);
    });
    s.on('userColorAssigned', (color: string) => {
      setCurrentUserColor(color);
    });
    setSocket(s);
  }, [roomNameInput, nicknameInput, currentUserId, currentUserColor, roomState?.rootParagraphId, selectedParagraphId]);

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  const addParagraph = (parentId: string | null, content: string) => {
    if (!content.trim() || content.length > 1000 || !socket || !roomState) return;
    const paragraph: Paragraph = {
      id: uuidv4(),
      content: content.trim(),
      authorId: currentUserId,
      authorName: nicknameInput,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parentId,
      children: [],
      history: [{
        authorId: currentUserId,
        authorName: nicknameInput,
        timestamp: Date.now(),
        content: content.trim(),
      }],
    };
    socket.emit('addParagraph', { roomName: roomState.roomName, paragraph, parentId });
    setNewReplyContent('');
  };

  const updateParagraph = (paragraphId: string, content: string) => {
    if (!content.trim() || content.length > 1000 || !socket || !roomState) return;
    socket.emit('updateParagraph', {
      roomName: roomState.roomName,
      paragraphId,
      content: content.trim(),
      editor: { id: currentUserId, name: nicknameInput },
    });
    setIsEditing(false);
  };

  const deleteParagraph = (paragraphId: string) => {
    if (!socket || !roomState) return;
    const p = roomState.paragraphs[paragraphId];
    if (!p) return;
    if (!confirm('确定要删除这段及其所有子段落吗？')) return;
    socket.emit('deleteParagraph', { roomName: roomState.roomName, paragraphId, parentId: p.parentId });
  };

  const exportMarkdown = () => {
    if (!roomState) return;
    const lines: string[] = [];
    lines.push(`# ${roomState.roomName}`);
    lines.push('');
    const walk = (nodeId: string, depth: number) => {
      const p = roomState.paragraphs[nodeId];
      if (!p) return;
      const level = Math.min(depth + 1, 6);
      lines.push(`${'#'.repeat(level)} ${p.authorName} (${formatTime(p.createdAt)})`);
      lines.push('');
      lines.push(p.content);
      lines.push('');
      p.children.forEach(cid => walk(cid, depth + 1));
    };
    if (roomState.rootParagraphId) {
      walk(roomState.rootParagraphId, 0);
    }
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roomState.roomName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!joined) {
    return (
      <div style={styles.joinPage}>
        <div style={styles.joinCard}>
          <div style={styles.logo}>🐌</div>
          <h1 style={styles.joinTitle}>故事蜗牛</h1>
          <p style={styles.joinSubtitle}>团队故事接龙编辑器</p>
          <input
            style={styles.input}
            placeholder="房间名"
            value={roomNameInput}
            onChange={e => setRoomNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
          />
          <input
            style={styles.input}
            placeholder="你的昵称"
            value={nicknameInput}
            onChange={e => setNicknameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>头像颜色：</span>
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={c}
                onClick={() => setCurrentUserColor(c)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: c,
                  border: currentUserColor === c ? '3px solid #2D3748' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
          <button style={styles.joinButton} onClick={joinRoom}>
            加入房间
          </button>
        </div>
      </div>
    );
  }

  const selectedParagraph = selectedParagraphId ? roomState?.paragraphs[selectedParagraphId] : null;
  const onlineMembers = Object.values(roomState?.members || {}).filter(m => m.online);

  return (
    <div style={styles.app}>
      <div style={styles.navbar}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ ...styles.hamburger, display: isMobile ? 'block' : 'none' }}
        >
          ☰
        </button>
        <div style={styles.navbarLeft}>
          <div style={styles.snailIcon}>🐌</div>
          <span style={styles.roomName}>{roomState?.roomName}</span>
        </div>
        <div style={styles.navbarRight}>
          <button style={styles.exportButton} onClick={exportMarkdown}>
            导出 MD
          </button>
          <div style={styles.avatarGroup}>
            {onlineMembers.slice(0, 6).map(m => (
              <div
                key={m.id}
                title={`${m.name} (在线)`}
                style={{
                  ...styles.avatar,
                  background: m.avatarColor,
                  boxShadow: '0 0 0 2px #22C55E, 0 0 8px #22C55E',
                  marginLeft: '-8px',
                }}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {onlineMembers.length > 6 && (
              <div style={{ ...styles.avatar, background: '#718096', marginLeft: '-8px' }}>
                +{onlineMembers.length - 6}
              </div>
            )}
          </div>
        </div>
      </div>

      {sidebarOpen && isMobile && (
        <div style={{ ...styles.overlay, display: isMobile ? 'block' : 'none' }} onClick={() => setSidebarOpen(false)} />
      )}

      <div style={styles.body}>
        <div style={{
          ...styles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : (isMobile ? 'translateX(-100%)' : 'translateX(0)'),
          position: isMobile ? 'absolute' : 'relative',
        }}>
          {roomState?.rootParagraphId && (
            <TreeView
              paragraphs={roomState.paragraphs}
              nodeId={roomState.rootParagraphId}
              depth={0}
              selectedId={selectedParagraphId}
              expandedNodes={expandedNodes}
              onSelect={id => {
                setSelectedParagraphId(id);
                if (isMobile) setSidebarOpen(false);
              }}
              onToggle={toggleNode}
              members={roomState.members}
            />
          )}
        </div>

        <div style={{
          ...styles.content,
          padding: isMobile ? '16px' : '32px 48px',
        }}>
          {selectedParagraph ? (
            <div>
              <div style={styles.paragraphHeader}>
                <div
                  style={{
                    ...styles.avatar,
                    background: roomState?.members[selectedParagraph.authorId]?.avatarColor || '#888',
                    width: '36px',
                    height: '36px',
                    fontSize: '16px',
                  }}
                  title={selectedParagraph.authorName}
                >
                  {selectedParagraph.authorName.charAt(0).toUpperCase()}
                </div>
                <div style={{ marginLeft: '12px', flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#2D3748' }}>
                    {selectedParagraph.authorName}
                  </div>
                  <div
                    style={{ fontSize: '13px', color: '#718096', cursor: 'pointer' }}
                    onMouseEnter={() => setShowHistory(selectedParagraph.id)}
                    onMouseLeave={() => setShowHistory(null)}
                  >
                    {formatTime(selectedParagraph.createdAt)} · 悬停查看历史
                    {showHistory === selectedParagraph.id && selectedParagraph.history.length > 1 && (
                      <div style={styles.historyPopup}>
                        {selectedParagraph.history.map((h, i) => (
                          <div key={i} style={styles.historyItem}>
                            <span style={{ fontWeight: 600 }}>{h.authorName}</span>
                            <span style={{ color: '#718096', marginLeft: '8px' }}>{formatTime(h.timestamp)}</span>
                            <div style={{ fontSize: '12px', color: '#4A5568', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                              {truncate(h.content, 80)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {selectedParagraph.authorId === currentUserId && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!isEditing ? (
                      <>
                        <button style={styles.iconButton} onClick={() => {
                          setEditingContent(selectedParagraph.content);
                          setIsEditing(true);
                        }}>编辑</button>
                        {selectedParagraph.parentId && (
                          <button style={{ ...styles.iconButton, color: '#FF6B6B' }} onClick={() => deleteParagraph(selectedParagraph.id)}>
                            删除
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button style={styles.iconButton} onClick={() => updateParagraph(selectedParagraph.id, editingContent)}>
                          保存
                        </button>
                        <button style={styles.iconButton} onClick={() => { setIsEditing(false); setEditingContent(''); }}>
                          取消
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.paragraphContent}>
                {isEditing ? (
                  <textarea
                    style={styles.textareaEdit}
                    value={editingContent}
                    onChange={e => setEditingContent(e.target.value.slice(0, 1000))}
                    autoFocus
                  />
                ) : (
                  <p style={styles.paragraphText}>{selectedParagraph.content}</p>
                )}
              </div>

              <div style={styles.replySection}>
                <textarea
                  style={styles.replyInput}
                  placeholder="在这段下方续写故事...（最多1000字）"
                  value={newReplyContent}
                  onChange={e => setNewReplyContent(e.target.value.slice(0, 1000))}
                  rows={3}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#A0AEC0' }}>{newReplyContent.length}/1000</span>
                  <button
                    style={styles.replyButton}
                    onClick={() => addParagraph(selectedParagraph.id, newReplyContent)}
                    disabled={!newReplyContent.trim()}
                  >
                    添加续写
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <p style={{ color: '#718096', fontSize: '16px' }}>故事还没有开始，写下第一段吧！</p>
              <div style={{ marginTop: '24px', width: '100%', maxWidth: '600px' }}>
                <textarea
                  style={styles.replyInput}
                  placeholder="写下故事的开头..."
                  value={newReplyContent}
                  onChange={e => setNewReplyContent(e.target.value.slice(0, 1000))}
                  rows={4}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    style={styles.replyButton}
                    onClick={() => addParagraph(null, newReplyContent)}
                    disabled={!newReplyContent.trim()}
                  >
                    开始故事
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { max-height: 0; opacity: 0; }
          to { max-height: 500px; opacity: 1; }
        }
        textarea:focus {
          outline: none !important;
          border-color: #4ECDC4 !important;
          animation: fadeIn 0.3s ease-out;
        }
        body { margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  joinPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  joinCard: {
    background: '#fff',
    padding: '40px 48px',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    textAlign: 'center',
    width: '360px',
  },
  logo: {
    fontSize: '64px',
    marginBottom: '8px',
  },
  joinTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2D3748',
    margin: 0,
  },
  joinSubtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: '4px 0 28px 0',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '15px',
    marginBottom: '12px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  joinButton: {
    width: '100%',
    padding: '12px',
    background: '#4ECDC4',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  navbar: {
    height: '40px',
    background: '#2D3748',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    color: '#fff',
    flexShrink: 0,
  },
  hamburger: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    marginRight: '8px',
    padding: '4px 8px',
  },
  navbarLeft: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  snailIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    marginRight: '10px',
  },
  roomName: {
    fontSize: '18px',
    fontWeight: 700,
  },
  navbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  exportButton: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  avatarGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    position: 'fixed',
    top: '40px',
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  sidebar: {
    width: '280px',
    background: '#F8FAFC',
    borderRight: '1px solid #E2E8F0',
    overflowY: 'auto',
    flexShrink: 0,
    transition: 'transform 0.25s ease-in-out',
    height: '100%',
    zIndex: 20,
  },
  content: {
    flex: 1,
    background: '#FFFFFF',
    overflowY: 'auto',
    fontFamily: 'Georgia, serif',
  },
  paragraphHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #EDF2F7',
    position: 'relative',
  },
  historyPopup: {
    position: 'absolute',
    top: '100%',
    left: '48px',
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    padding: '12px',
    zIndex: 100,
    maxWidth: '360px',
    marginTop: '4px',
  },
  historyItem: {
    padding: '8px',
    borderBottom: '1px solid #EDF2F7',
  },
  paragraphContent: {
    marginBottom: '16px',
  },
  paragraphText: {
    fontFamily: 'Georgia, serif',
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#2D3748',
    margin: 0,
  },
  textareaEdit: {
    width: '100%',
    fontFamily: 'Georgia, serif',
    fontSize: '16px',
    lineHeight: 1.8,
    padding: '16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    resize: 'vertical',
    minHeight: '120px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  replySection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #EDF2F7',
  },
  replyInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #CBD5E0',
    borderRadius: '8px',
    fontFamily: 'Georgia, serif',
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  replyButton: {
    padding: '8px 20px',
    background: '#4ECDC4',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  iconButton: {
    padding: '6px 12px',
    background: 'none',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#4A5568',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    textAlign: 'center',
  },
};

export default App;
