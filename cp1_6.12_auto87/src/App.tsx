import React, { useState, useCallback, useRef } from 'react';
import type { DropResult } from 'react-beautiful-dnd';
import CanvasArea from './components/CanvasArea';
import {
  parseChromeBookmarks,
  parseBookmarkFile,
  extractUniqueTags,
  getRandomColorScheme,
  MAX_FILE_SIZE,
} from './utils/bookmarkParser';
import type { Bookmark, Tag, DeleteHistoryItem } from './types';

const App: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [gap, setGap] = useState<number>(24);
  const [deleteHistory, setDeleteHistory] = useState<DeleteHistoryItem[]>([]);
  const [importText, setImportText] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [undoAnimating, setUndoAnimating] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    setImportError(null);
    try {
      const parsedBookmarks = parseChromeBookmarks(importText);
      if (parsedBookmarks.length === 0) {
        setImportError('未能解析到书签，请检查JSON格式是否正确');
        return;
      }
      setBookmarks((prev) => [...prev, ...parsedBookmarks]);
      const newTags = extractUniqueTags(parsedBookmarks);
      setTags((prev) => {
        const existingNames = new Set(prev.map((t) => t.name));
        const uniqueNewTags = newTags.filter((t) => !existingNames.has(t.name));
        return [...prev, ...uniqueNewTags];
      });
      setImportText('');
    } catch (err) {
      setImportError('解析失败：JSON格式错误');
    }
  }, [importText]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setImportError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        setImportError('文件大小超过1MB限制');
        return;
      }

      try {
        const parsedBookmarks = await parseBookmarkFile(file);
        if (parsedBookmarks.length === 0) {
          setImportError('未能解析到书签，请检查文件内容');
          return;
        }
        setBookmarks((prev) => [...prev, ...parsedBookmarks]);
        const newTags = extractUniqueTags(parsedBookmarks);
        setTags((prev) => {
          const existingNames = new Set(prev.map((t) => t.name));
          const uniqueNewTags = newTags.filter((t) => !existingNames.has(t.name));
          return [...prev, ...uniqueNewTags];
        });
      } catch (err) {
        setImportError(err instanceof Error ? err.message : '文件解析失败');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  const handleCreateTag = useCallback(() => {
    const name = newTagName.trim();
    if (!name) return;

    const exists = tags.some((t) => t.name === name);
    if (exists) {
      setNewTagName('');
      setShowNewTagInput(false);
      return;
    }

    const colorScheme = getRandomColorScheme();
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name,
      color: colorScheme.color,
      gradient: colorScheme.gradient,
    };

    setTags((prev) => [...prev, newTag]);
    setNewTagName('');
    setShowNewTagInput(false);
  }, [newTagName, tags]);

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      setBookmarks((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index === -1) return prev;

        const bookmark = prev[index];
        setDeleteHistory((history) => {
          const newHistory = [{ bookmark, index }, ...history];
          return newHistory.slice(0, 5);
        });

        return prev.filter((b) => b.id !== id);
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (deleteHistory.length === 0) return;

    setUndoAnimating(true);
    setTimeout(() => setUndoAnimating(false), 300);

    const [lastDeleted, ...rest] = deleteHistory;
    setDeleteHistory(rest);

    setBookmarks((prev) => {
      const newBookmarks = [...prev];
      newBookmarks.splice(lastDeleted.index, 0, lastDeleted.bookmark);
      return newBookmarks;
    });
  }, [deleteHistory]);

  const handleTagToggle = useCallback(
    (bookmarkId: string, tagId: string) => {
      const tag = tags.find((t) => t.id === tagId);
      if (!tag) return;

      setBookmarks((prev) =>
        prev.map((b) => {
          if (b.id !== bookmarkId) return b;
          const hasTag = b.tags.includes(tag.name);
          const newTags = hasTag
            ? b.tags.filter((t) => t !== tag.name)
            : [...b.tags, tag.name];
          return {
            ...b,
            tags: newTags,
            group: newTags[0] || b.group,
          };
        })
      );
    },
    [tags]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;

      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      const sourceTag = tags.find((t) => t.id === source.droppableId);
      const destTag = tags.find((t) => t.id === destination.droppableId);

      if (!sourceTag || !destTag) return;

      setBookmarks((prev) => {
        const sourceBookmarks = prev.filter((b) => b.tags.includes(sourceTag.name));
        const draggedBookmark = sourceBookmarks[source.index];

        if (!draggedBookmark) return prev;

        if (sourceTag.id === destTag.id) {
          return prev;
        }

        return prev.map((b) => {
          if (b.id !== draggedBookmark.id) return b;

          const hasDestTag = b.tags.includes(destTag.name);

          if (hasDestTag) {
            return b;
          }

          const newTags = [...b.tags, destTag.name];
          return {
            ...b,
            tags: newTags,
            group: newTags[0],
          };
        });
      });
    },
    [tags]
  );

  const handleTagClick = useCallback((tagId: string) => {
    setActiveTag((prev) => (prev === tagId ? null : tagId));
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1e1e2e',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(30, 30, 46, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #3a3a4e',
            backgroundColor: '#2a2a3e',
            color: '#d0d0e0',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {showSidebar ? '≡' : '≡'}
        </button>

        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#d0d0e0',
            margin: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          BookmarkCanvas
        </h1>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
          className="tag-bar"
        >
          <button
            onClick={() => setActiveTag(null)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeTag === null ? '#3a3a5e' : '#2a2a3e',
              color: activeTag === null ? '#ffffff' : '#7a7a9e',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              flexShrink: 0,
              transition: 'background-color 200ms ease, color 200ms ease',
              position: 'relative',
            }}
          >
            全部
            {activeTag === null && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '3px',
                  borderRadius: '2px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  animation: 'slideIn 200ms ease-out',
                }}
              />
            )}
          </button>

          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: activeTag === tag.id ? tag.gradient : '#2a2a3e',
                color: activeTag === tag.id ? '#ffffff' : '#d0d0e0',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                flexShrink: 0,
                transition: 'all 200ms ease',
                position: 'relative',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: tag.gradient,
                  marginRight: '8px',
                }}
              />
              {tag.name}
              {activeTag === tag.id && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '24px',
                    height: '3px',
                    borderRadius: '2px',
                    background: '#ffffff',
                    animation: 'slideIn 200ms ease-out',
                  }}
                />
              )}
            </button>
          ))}

          {showNewTagInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') {
                    setShowNewTagInput(false);
                    setNewTagName('');
                  }
                }}
                placeholder="标签名"
                autoFocus
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1px solid #4a4a6e',
                  backgroundColor: '#2a2a3e',
                  color: '#d0d0e0',
                  fontSize: '13px',
                  width: '100px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCreateTag}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                确认
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTagInput(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px dashed #4a4a6e',
                backgroundColor: 'transparent',
                color: '#7a7a9e',
                cursor: 'pointer',
                fontSize: '13px',
                flexShrink: 0,
                transition: 'all 200ms ease',
              }}
            >
              + 新建标签
            </button>
          )}
        </div>

        <button
          onClick={handleUndo}
          disabled={deleteHistory.length === 0}
          title={`撤销删除 (${deleteHistory.length}/5)`}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #3a3a4e',
            backgroundColor: deleteHistory.length > 0 ? '#2a2a3e' : '#252535',
            color: deleteHistory.length > 0 ? '#d0d0e0' : '#5a5a7e',
            cursor: deleteHistory.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            transition: 'transform 300ms ease',
            transform: undoAnimating ? 'scale(0.9) translateY(-2px)' : 'scale(1)',
          }}
        >
          ↶ 撤销
          {deleteHistory.length > 0 && (
            <span
              style={{
                marginLeft: '6px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: '#4ecdc4',
                color: '#1e1e2e',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {deleteHistory.length}
            </span>
          )}
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {showSidebar && (
          <aside
            style={{
              width: '320px',
              borderRight: '1px solid #2a2a3e',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: '#1a1a28',
              flexShrink: 0,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#d0d0e0',
                  margin: '0 0 12px 0',
                }}
              >
                导入书签
              </h2>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="粘贴 Chrome 书签 JSON 数据..."
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #3a3a4e',
                  backgroundColor: '#2a2a3e',
                  color: '#d0d0e0',
                  fontSize: '12px',
                  resize: 'vertical',
                  fontFamily: 'monospace',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />

              {importError && (
                <p
                  style={{
                    color: '#ff6b6b',
                    fontSize: '12px',
                    margin: '8px 0 0 0',
                  }}
                >
                  {importError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: importText.trim()
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#3a3a4e',
                    color: '#ffffff',
                    cursor: importText.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 200ms ease',
                  }}
                >
                  解析导入
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #3a3a4e',
                    backgroundColor: '#2a2a3e',
                    color: '#d0d0e0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 200ms ease',
                  }}
                >
                  上传文件
                </button>
              </div>

              <p
                style={{
                  fontSize: '11px',
                  color: '#5a5a7e',
                  margin: '8px 0 0 0',
                  lineHeight: 1.5,
                }}
              >
                支持 Chrome 书签导出的 JSON 格式，文件大小限制 1MB
              </p>
            </div>

            <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: '20px' }}>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#d0d0e0',
                  margin: '0 0 12px 0',
                }}
              >
                布局设置
              </h2>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label style={{ fontSize: '13px', color: '#7a7a9e' }}>
                    组间距
                  </label>
                  <span style={{ fontSize: '13px', color: '#d0d0e0' }}>
                    {gap}px
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundColor: '#3a3a4e',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#5a5a7e',
                    marginTop: '4px',
                  }}
                >
                  <span>10px</span>
                  <span>50px</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: '20px' }}>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#d0d0e0',
                  margin: '0 0 12px 0',
                }}
              >
                统计
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: '#7a7a9e' }}>书签总数</span>
                  <span style={{ color: '#d0d0e0', fontWeight: 500 }}>
                    {bookmarks.length}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: '#7a7a9e' }}>标签数量</span>
                  <span style={{ color: '#d0d0e0', fontWeight: 500 }}>
                    {tags.length}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: '20px', marginTop: 'auto' }}>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#d0d0e0',
                  margin: '0 0 12px 0',
                }}
              >
                使用提示
              </h2>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '16px',
                  fontSize: '12px',
                  color: '#6a6a8e',
                  lineHeight: 1.8,
                }}
              >
                <li>点击卡片打开链接</li>
                <li>右键点击删除书签</li>
                <li>拖拽卡片到其他标签组</li>
                <li>点击 +标签 添加多标签</li>
              </ul>
            </div>
          </aside>
        )}

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          <CanvasArea
            bookmarks={bookmarks}
            tags={tags}
            activeTag={activeTag}
            gap={gap}
            onDelete={handleDeleteBookmark}
            onTagToggle={handleTagToggle}
            onDragEnd={handleDragEnd}
          />
        </main>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-50%) scaleX(0);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) scaleX(1);
          }
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          border: 2px solid #1e1e2e;
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          border: 2px solid #1e1e2e;
        }

        .tag-bar::-webkit-scrollbar {
          height: 4px;
        }

        .tag-bar::-webkit-scrollbar-track {
          background: transparent;
        }

        .tag-bar::-webkit-scrollbar-thumb {
          background: #3a3a4e;
          border-radius: 2px;
        }

        @media (max-width: 768px) {
          aside {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
