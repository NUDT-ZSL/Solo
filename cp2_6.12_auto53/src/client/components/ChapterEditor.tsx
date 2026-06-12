import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chapter } from '../types';

interface ChapterEditorProps {
  chapters: Chapter[];
  onChange: (chapters: Chapter[]) => void;
  onAutoSave: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
}

const ChapterEditor: React.FC<ChapterEditorProps> = ({
  chapters,
  onChange,
  onAutoSave,
  autoSaveStatus,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const [ghostOffset, setGhostOffset] = useState({ x: 0, y: 0 });
  const editorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const autoSaveTimer = useRef<number | null>(null);
  const lastContentRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = window.setTimeout(() => {
      const startTime = performance.now();
      onAutoSave();
      const duration = performance.now() - startTime;
      if (duration > 50) {
        console.warn(`Auto-save blocked main thread for ${duration.toFixed(0)}ms`);
      }
    }, 30000);
  }, [onAutoSave]);

  const addChapter = () => {
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `章节 ${chapters.length + 1}`,
      content: '<p>在这里编写章节内容...</p>',
      order: chapters.length,
      collapsed: false,
      characterIds: [],
    };
    onChange([...chapters, newChapter]);
    scheduleAutoSave();
  };

  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    onChange(
      chapters.map((ch) => (ch.id === id ? { ...ch, ...updates } : ch))
    );
    scheduleAutoSave();
  };

  const updateContent = (id: string, content: string) => {
    const contentStr = JSON.stringify(chapters.map(c => c.id === id ? content : c.content));
    if (contentStr !== lastContentRef.current) {
      lastContentRef.current = contentStr;
      onChange(
        chapters.map((ch) => (ch.id === id ? { ...ch, content } : ch))
      );
      scheduleAutoSave();
    }
  };

  const deleteChapter = (id: string) => {
    const filtered = chapters.filter((ch) => ch.id !== id);
    onChange(filtered.map((ch, i) => ({ ...ch, order: i })));
    scheduleAutoSave();
  };

  const toggleCollapse = (id: string) => {
    onChange(
      chapters.map((ch) =>
        ch.id === id ? { ...ch, collapsed: !ch.collapsed } : ch
      )
    );
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    const chapter = chapters.find(c => c.id === id);
    if (chapter) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setGhostOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setGhostPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;
    setDragOverId(id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragPosition(e.clientY < midY ? 'top' : 'bottom');
  };

  const handleDragLeave = () => {
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX && e.clientY) {
      setGhostPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      resetDragState();
      return;
    }

    const draggedIndex = chapters.findIndex((c) => c.id === draggedId);
    const targetIndex = chapters.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      resetDragState();
      return;
    }

    const newChapters = [...chapters];
    const [dragged] = newChapters.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (dragPosition === 'bottom') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    newChapters.splice(insertIndex, 0, dragged);
    const reordered = newChapters.map((ch, i) => ({ ...ch, order: i }));
    onChange(reordered);
    scheduleAutoSave();
    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
    setGhostPosition(null);
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const draggedChapter = chapters.find((c) => c.id === draggedId);

  return (
    <div className="editor-container">
      <AnimatePresence>
        {autoSaveStatus !== 'idle' && (
          <motion.div
            className="save-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {autoSaveStatus === 'saving' ? (
              <svg className="save-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                className="save-icon fade-out"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>{autoSaveStatus === 'saving' ? '保存中...' : '已保存'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chapter-list">
        {chapters.map((chapter) => (
          <motion.div
            key={chapter.id}
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            className={`chapter-item ${
              draggedId === chapter.id ? 'dragging' : ''
            } ${dragOverId === chapter.id && dragPosition === 'top' ? 'drag-over-top' : ''} ${
              dragOverId === chapter.id && dragPosition === 'bottom' ? 'drag-over-bottom' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, chapter.id)}
            onDragOver={(e) => handleDragOver(e, chapter.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, chapter.id)}
            onDragEnd={handleDragEnd}
            onDrag={handleDrag}
          >
            <div className="chapter-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4, marginRight: 8 }}>
                <circle cx="9" cy="6" r="1" />
                <circle cx="15" cy="6" r="1" />
                <circle cx="9" cy="12" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="9" cy="18" r="1" />
                <circle cx="15" cy="18" r="1" />
              </svg>
              <input
                className="chapter-title-input"
                value={chapter.title}
                onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                placeholder="章节标题"
              />
              <div className="chapter-actions">
                <button
                  className="icon-btn"
                  onClick={() => toggleCollapse(chapter.id)}
                  title={chapter.collapsed ? '展开' : '折叠'}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      transform: chapter.collapsed ? 'rotate(-90deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className="icon-btn"
                  onClick={() => deleteChapter(chapter.id)}
                  title="删除章节"
                  style={{ color: 'var(--danger)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {!chapter.collapsed && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="chapter-content">
                    <div className="toolbar">
                      <button
                        className="toolbar-btn"
                        onClick={() => applyFormat('bold')}
                        title="粗体"
                        style={{ fontWeight: 700 }}
                      >
                        B
                      </button>
                      <button
                        className="toolbar-btn"
                        onClick={() => applyFormat('italic')}
                        title="斜体"
                        style={{ fontStyle: 'italic' }}
                      >
                        I
                      </button>
                      <button
                        className="toolbar-btn"
                        onClick={() => applyFormat('formatBlock', 'H1')}
                        title="标题1"
                      >
                        H1
                      </button>
                      <button
                        className="toolbar-btn"
                        onClick={() => applyFormat('formatBlock', 'H2')}
                        title="标题2"
                      >
                        H2
                      </button>
                      <button
                        className="toolbar-btn"
                        onClick={() => applyFormat('formatBlock', 'H3')}
                        title="标题3"
                      >
                        H3
                      </button>
                      <button
                        className="toolbar-btn"
                        onClick={() => applyFormat('insertUnorderedList')}
                        title="无序列表"
                      >
                        •
                      </button>
                      <button
                        className="toolbar-btn"
                        onClick={() => applyFormat('insertOrderedList')}
                        title="有序列表"
                      >
                        1.
                      </button>
                    </div>
                    <div
                      className="rich-editor"
                      ref={(el) => {
                        if (el) editorRefs.current.set(chapter.id, el);
                      }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) =>
                        updateContent(chapter.id, (e.target as HTMLDivElement).innerHTML)
                      }
                      dangerouslySetInnerHTML={{ __html: chapter.content }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        <button className="add-chapter-btn" onClick={addChapter}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          添加新章节
        </button>
      </div>

      {ghostPosition && draggedChapter && (
        <motion.div
          className="drag-ghost"
          style={{
            left: ghostPosition.x - ghostOffset.x,
            top: ghostPosition.y - ghostOffset.y,
            width: Math.min(500, window.innerWidth * 0.6),
          }}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0.7 }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {draggedChapter.title}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ChapterEditor;
