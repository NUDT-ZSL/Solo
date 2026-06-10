import React, { useState, useEffect, useCallback } from 'react';
import NoteCanvas from './NoteCanvas';
import GraphView from './GraphView';
import type { Note, MindMapNode, MindMapConnection } from './types';
import { v4 as uuidv4 } from 'uuid';

interface NoteListItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetch('/api/notes')
      .then(res => res.json())
      .then((data: NoteListItem[]) => {
        setNotes(data);
        if (data.length > 0) {
          loadNote(data[0].id);
        }
      })
      .catch(err => console.error('加载笔记列表失败:', err));
  }, []);

  const loadNote = useCallback((noteId: string) => {
    fetch(`/api/notes/${noteId}`)
      .then(res => res.json())
      .then((data: Note) => {
        setCurrentNote(data);
      })
      .catch(err => console.error('加载笔记失败:', err));
  }, []);

  const createNote = useCallback(() => {
    const title = prompt('请输入笔记标题:', '新建笔记');
    if (title === null) return;
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || '新建笔记' }),
    })
      .then(res => res.json())
      .then((newNote: Note) => {
        setNotes(prev => [
          {
            id: newNote.id,
            title: newNote.title,
            createdAt: newNote.createdAt,
            updatedAt: newNote.updatedAt,
          },
          ...prev,
        ]);
        setCurrentNote(newNote);
      })
      .catch(err => console.error('创建笔记失败:', err));
  }, []);

  const deleteNote = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这篇笔记吗？')) return;
    fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        if (currentNote?.id === noteId) {
          const remaining = notes.filter(n => n.id !== noteId);
          setCurrentNote(remaining.length > 0 ? null : null);
          if (remaining.length > 0) {
            loadNote(remaining[0].id);
          }
        }
      })
      .catch(err => console.error('删除笔记失败:', err));
  }, [currentNote, notes, loadNote]);

  const updateNote = useCallback((updates: Partial<Note>) => {
    if (!currentNote) return;
    const updated: Note = { ...currentNote, ...updates };
    setCurrentNote(updated);

    fetch(`/api/notes/${currentNote.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(err => console.error('更新笔记失败:', err));

    setNotes(prev =>
      prev.map(n =>
        n.id === currentNote.id ? { ...n, title: updated.title, updatedAt: Date.now() } : n
      )
    );
  }, [currentNote]);

  const handleContentChange = useCallback((content: string) => {
    updateNote({ content });
  }, [updateNote]);

  const handleSketchChange = useCallback((sketchData: string) => {
    updateNote({ sketchData });
  }, [updateNote]);

  const handleNodesChange = useCallback((mindMapNodes: MindMapNode[]) => {
    updateNote({ mindMapNodes });
  }, [updateNote]);

  const handleConnectionsChange = useCallback((mindMapConnections: MindMapConnection[]) => {
    updateNote({ mindMapConnections });
  }, [updateNote]);

  const handleAddNode = useCallback((title: string, x: number, y: number) => {
    if (!currentNote) return;
    const newNode: MindMapNode = { id: uuidv4(), title, x, y };
    updateNote({ mindMapNodes: [...currentNote.mindMapNodes, newNode] });
  }, [currentNote, updateNote]);

  const handleShare = useCallback(() => {
    if (!currentNote) return;
    fetch(`/api/notes/${currentNote.id}/share`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        navigator.clipboard.writeText(data.shareUrl).then(() => {
          setToastMessage('✅ 分享链接已复制到剪贴板!');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        });
      })
      .catch(err => console.error('生成分享链接失败:', err));
  }, [currentNote]);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ background: '#F1C40F', color: '#2C3E50', borderRadius: '2px', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleEditorDragStart = useCallback((_text: string) => {
  }, []);

  return (
    <div style={styles.app}>
      {showToast && <div style={styles.toast}>{toastMessage}</div>}

      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h1 style={styles.appTitle}>📝 织梦笔记</h1>
        </div>

        <div style={styles.searchContainer}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F8C8D" strokeWidth="2" style={styles.searchIcon}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <button style={styles.newNoteBtn} onClick={createNote}>
          + 新建笔记
        </button>

        <div style={styles.noteList}>
          {filteredNotes.length === 0 ? (
            <div style={styles.emptyList}>暂无笔记</div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                style={{
                  ...styles.noteItem,
                  background: currentNote?.id === note.id
                    ? 'linear-gradient(135deg, #34495E 0%, #2C3E50 100%)'
                    : 'transparent',
                  color: currentNote?.id === note.id ? '#FFFFFF' : '#ECF0F1',
                }}
                onClick={() => loadNote(note.id)}
              >
                <div style={styles.noteItemContent}>
                  <div style={styles.noteTitle}>{highlightText(note.title, searchQuery)}</div>
                  <div style={styles.noteDate}>
                    {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => deleteNote(note.id, e)}
                  title="删除笔记"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main style={styles.mainArea}>
        {currentNote ? (
          <>
            <div style={styles.editorPanel}>
              <div style={styles.noteHeader}>
                <input
                  type="text"
                  value={currentNote.title}
                  onChange={e => updateNote({ title: e.target.value })}
                  style={styles.noteTitleInput}
                />
                <button style={styles.shareBtn} onClick={handleShare} title="分享笔记">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>
              <NoteCanvas
                note={currentNote}
                onContentChange={handleContentChange}
                onSketchChange={handleSketchChange}
                onDragStart={handleEditorDragStart}
              />
            </div>

            <div style={styles.graphPanel}>
              <GraphView
                nodes={currentNote.mindMapNodes}
                connections={currentNote.mindMapConnections}
                onNodesChange={handleNodesChange}
                onConnectionsChange={handleConnectionsChange}
                onAddNode={handleAddNode}
              />
            </div>
          </>
        ) : (
          <div style={styles.noNote}>
            <div style={styles.noNoteContent}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
              <div style={{ fontSize: '18px', color: '#7F8C8D' }}>请选择或创建一篇笔记</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(46, 204, 113, 0.4)',
    zIndex: 9999,
    animation: 'slideDown 0.3s ease-out',
    fontWeight: 500,
  },
  sidebar: {
    width: '280px',
    minWidth: '280px',
    background: 'rgba(44, 62, 80, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRight: '1px solid #BDC3C7',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px',
    gap: '16px',
    overflow: 'hidden',
  },
  sidebarHeader: {
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  appTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#FFFFFF',
    margin: 0,
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '260px',
    padding: '10px 14px 10px 38px',
    borderRadius: '20px',
    border: 'none',
    background: '#FFFFFF',
    fontSize: '13px',
    color: '#2C3E50',
    outline: 'none',
    transition: 'all 0.3s ease-out',
  },
  newNoteBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  noteList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  emptyList: {
    textAlign: 'center',
    color: '#95A5A6',
    padding: '20px',
    fontSize: '13px',
  },
  noteItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  noteItemContent: {
    flex: 1,
    minWidth: 0,
  },
  noteTitle: {
    fontSize: '14px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  noteDate: {
    fontSize: '11px',
    opacity: 0.7,
    marginTop: '2px',
  },
  deleteBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    opacity: 0.5,
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '24px',
    transition: 'all 0.3s ease-out',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  editorPanel: {
    flex: 2,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #BDC3C7',
    overflow: 'hidden',
    minWidth: 0,
  },
  graphPanel: {
    flex: 1.5,
    minWidth: 0,
    overflow: 'hidden',
  },
  noteHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #BDC3C7',
    background: 'rgba(255,255,255,0.7)',
  },
  noteTitleInput: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#2C3E50',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    flex: 1,
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.3s ease-out',
  },
  shareBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(46, 204, 113, 0.3)',
    transition: 'all 0.3s ease-out',
  },
  noNote: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noNoteContent: {
    textAlign: 'center',
  },
};

export default App;
