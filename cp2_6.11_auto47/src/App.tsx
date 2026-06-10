import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

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
          if (remaining.length > 0) {
            loadNote(remaining[0].id);
          } else {
            setCurrentNote(null);
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

  const showToastMessage = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    setShowToast(true);
    setToastVisible(true);

    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => {
        setShowToast(false);
      }, 500);
    }, 3000);
  }, []);

  const handleShare = useCallback(() => {
    if (!currentNote) return;
    const shareUrl = `${window.location.origin}/share/${currentNote.id}`;
    fetch(`/api/notes/${currentNote.id}/share`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        const finalUrl = data.shareUrl || shareUrl;
        navigator.clipboard.writeText(finalUrl).then(() => {
          showToastMessage('✅ 分享链接已复制到剪贴板!');
        }).catch(() => {
          showToastMessage('⚠️ 请手动复制: ' + finalUrl);
        });
      })
      .catch(() => {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToastMessage('✅ 分享链接已复制到剪贴板!');
        }).catch(() => {
          showToastMessage('⚠️ 请手动复制: ' + shareUrl);
        });
      });
  }, [currentNote, showToastMessage]);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="app-search-highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const handleEditorDragStart = useCallback((_text: string) => {
  }, []);

  return (
    <div className="app-container">
      <style>{`
        * {
          box-sizing: border-box;
        }
        .app-container {
          display: flex;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }

        /* Toast 提示条 */
        .app-toast {
          position: fixed;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #2ECC71 0%, #27AE60 100%);
          color: #FFFFFF;
          padding: 12px 28px;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(46, 204, 113, 0.4);
          z-index: 9999;
          font-weight: 500;
          font-size: 14px;
          opacity: 0;
          transition: top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out;
          pointer-events: none;
          white-space: nowrap;
        }
        .app-toast.visible {
          opacity: 1;
          top: 20px;
        }
        .app-toast.fading {
          opacity: 0;
          top: 10px;
        }

        /* 侧栏 */
        .app-sidebar {
          width: 280px;
          min-width: 280px;
          background: rgba(44, 62, 80, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-right: 1px solid #BDC3C7;
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
          gap: 16px;
          overflow: hidden;
        }
        .app-sidebar-header {
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
        }
        .app-title {
          font-size: 20px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        /* 搜索框 */
        .app-search-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .app-search-icon {
          position: absolute;
          left: 14px;
          pointer-events: none;
          color: #7F8C8D;
        }
        .app-search-input {
          width: 260px;
          padding: 10px 14px 10px 38px;
          border-radius: 20px;
          border: none;
          background: #FFFFFF;
          font-size: 13px;
          color: #2C3E50;
          outline: none;
          transition: all 0.3s ease-out;
        }
        .app-search-input:focus {
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
        }
        .app-search-highlight {
          background-color: #F1C40F;
          color: #2C3E50;
          border-radius: 2px;
          padding: 1px 4px;
          font-weight: 600;
          display: inline;
        }

        /* 新建笔记按钮 */
        .app-new-note-btn {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #3498DB 0%, #2980B9 100%);
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }
        .app-new-note-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
        }
        .app-new-note-btn:active {
          transform: translateY(0);
        }

        /* 笔记列表 */
        .app-note-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-right: 4px;
        }
        .app-note-list::-webkit-scrollbar {
          width: 6px;
        }
        .app-note-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .app-note-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        .app-empty-list {
          text-align: center;
          color: #95A5A6;
          padding: 30px 20px;
          font-size: 13px;
        }

        .app-note-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease-out;
          color: #ECF0F1;
        }
        .app-note-item:hover {
          background: linear-gradient(135deg, #34495E 0%, #2C3E50 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .app-note-item.active {
          background: linear-gradient(135deg, #34495E 0%, #2C3E50 100%);
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .app-note-item-content {
          flex: 1;
          min-width: 0;
        }
        .app-note-item-title {
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .app-note-item-date {
          font-size: 11px;
          opacity: 0.6;
          margin-top: 3px;
        }
        .app-delete-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: inherit;
          opacity: 0;
          cursor: pointer;
          font-size: 18px;
          line-height: 26px;
          text-align: center;
          padding: 0;
          transition: all 0.3s ease-out;
          flex-shrink: 0;
          margin-left: 8px;
        }
        .app-note-item:hover .app-delete-btn {
          opacity: 0.7;
        }
        .app-delete-btn:hover {
          opacity: 1 !important;
          background: rgba(231, 76, 60, 0.3) !important;
          color: #E74C3C;
        }

        /* 主区域 */
        .app-main-area {
          flex: 1;
          display: flex;
          overflow: hidden;
          min-width: 0;
        }
        .app-editor-panel {
          flex: 2;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #BDC3C7;
          overflow: hidden;
          min-width: 0;
          background: rgba(255,255,255,0.3);
          order: 1;
        }
        .app-graph-panel {
          flex: 1.5;
          min-width: 0;
          overflow: hidden;
          order: 2;
        }

        /* 笔记头部 */
        .app-note-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #BDC3C7;
          background: rgba(255,255,255,0.8);
          gap: 12px;
          flex-shrink: 0;
        }
        .app-note-title-input {
          font-size: 20px;
          font-weight: 600;
          color: #2C3E50;
          border: 1px solid transparent;
          background: transparent;
          outline: none;
          flex: 1;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.3s ease-out;
          min-width: 0;
        }
        .app-note-title-input:hover,
        .app-note-title-input:focus {
          border-color: #BDC3C7;
          background: #FFFFFF;
        }

        /* 分享按钮 */
        .app-share-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #2ECC71 0%, #27AE60 100%);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3);
          transition: all 0.3s ease-out;
          flex-shrink: 0;
        }
        .app-share-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 16px rgba(46, 204, 113, 0.5);
        }
        .app-share-btn:active {
          transform: scale(0.95);
        }

        /* 空状态 */
        .app-no-note {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .app-no-note-content {
          text-align: center;
        }

        /* 响应式布局 */
        @media (max-width: 768px) {
          .app-container {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }
          .app-sidebar {
            width: 100% !important;
            min-width: 100% !important;
            height: auto;
            max-height: 250px;
            border-right: none;
            border-bottom: 1px solid #BDC3C7;
            position: sticky;
            top: 0;
            z-index: 100;
            order: 1;
          }
          .app-search-input {
            width: 100% !important;
          }
          .app-main-area {
            flex-direction: column;
            flex: 1;
            height: auto;
            min-height: 0;
            overflow: visible;
            order: 2;
          }
          .app-editor-panel {
            border-right: none;
            border-bottom: 1px solid #BDC3C7;
            min-height: 500px;
            height: auto;
            overflow: visible;
            order: 1;
          }
          .app-graph-panel {
            min-height: 500px;
            height: 500px;
            order: 2;
            overflow: hidden;
          }
        }
      `}</style>

      {showToast && (
        <div className={`app-toast ${toastVisible ? 'visible' : 'fading'}`}>
          {toastMessage}
        </div>
      )}

      <aside className="app-sidebar">
        <div className="app-sidebar-header">
          <h1 className="app-title">📝 织梦笔记</h1>
        </div>

        <div className="app-search-container">
          <svg className="app-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="app-search-input"
          />
        </div>

        <button className="app-new-note-btn" onClick={createNote}>
          + 新建笔记
        </button>

        <div className="app-note-list">
          {filteredNotes.length === 0 ? (
            <div className="app-empty-list">
              {searchQuery ? '没有找到匹配的笔记' : '暂无笔记'}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                className={`app-note-item ${currentNote?.id === note.id ? 'active' : ''}`}
                onClick={() => loadNote(note.id)}
              >
                <div className="app-note-item-content">
                  <div className="app-note-item-title">
                    {highlightText(note.title, searchQuery)}
                  </div>
                  <div className="app-note-item-date">
                    {new Date(note.updatedAt).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <button
                  className="app-delete-btn"
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

      <main className="app-main-area">
        {currentNote ? (
          <>
            <div className="app-editor-panel">
              <div className="app-note-header">
                <input
                  type="text"
                  value={currentNote.title}
                  onChange={e => updateNote({ title: e.target.value })}
                  className="app-note-title-input"
                />
                <button className="app-share-btn" onClick={handleShare} title="分享笔记">
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

            <div className="app-graph-panel">
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
          <div className="app-no-note">
            <div className="app-no-note-content">
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
              <div style={{ fontSize: '18px', color: '#7F8C8D' }}>请选择或创建一篇笔记</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
