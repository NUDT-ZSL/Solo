import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chapter } from '../types';

interface ChapterEditorProps {
  chapters: Chapter[];
  onChange: (chapters: Chapter[]) => void;
  onAutoSave: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
}

interface DragState {
  draggedId: string;
  overId: string | null;
  position: 'top' | 'bottom' | null;
  ghostX: number;
  ghostY: number;
  offsetX: number;
  offsetY: number;
  ghostWidth: number;
}

const ChapterEditor: React.FC<ChapterEditorProps> = ({
  chapters,
  onChange,
  onAutoSave,
  autoSaveStatus,
}) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);
  const editorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [insertLine, setInsertLine] = useState<{ y: number; x: number; width: number } | null>(null);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (autoSaveStatus === 'saved') {
      setSavedVisible(true);
      const t = setTimeout(() => setSavedVisible(false), 500);
      return () => clearTimeout(t);
    }
  }, [autoSaveStatus]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const t0 = performance.now();
      onAutoSave();
      const dur = performance.now() - t0;
      if (dur > 50) console.warn(`[perf] auto-save blocked main thread for ${dur.toFixed(0)}ms`);
    }, 30000);
  }, [onAutoSave]);

  const addChapter = () => {
    const ch: Chapter = {
      id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `章节 ${chapters.length + 1}`,
      content: '<p>在这里编写章节内容...</p>',
      order: chapters.length,
      collapsed: false,
      characterIds: [],
    };
    onChange([...chapters, ch]);
    scheduleAutoSave();
  };

  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    onChange(chapters.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    scheduleAutoSave();
  };

  const updateContent = (id: string, content: string) => {
    onChange(chapters.map((c) => (c.id === id ? { ...c, content } : c)));
    scheduleAutoSave();
  };

  const deleteChapter = (id: string) => {
    onChange(chapters.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })));
    scheduleAutoSave();
  };

  const toggleCollapse = (id: string) => {
    onChange(chapters.map((c) => (c.id === id ? { ...c, collapsed: !c.collapsed } : c)));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;

    const ghostEl = e.currentTarget.cloneNode(true) as HTMLElement;
    ghostEl.style.position = 'fixed';
    ghostEl.style.left = '-9999px';
    ghostEl.style.top = '-9999px';
    ghostEl.style.width = rect.width + 'px';
    ghostEl.style.opacity = '0';
    document.body.appendChild(ghostEl);
    e.dataTransfer.setDragImage(ghostEl, offX, offY);
    requestAnimationFrame(() => document.body.removeChild(ghostEl));

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);

    setDrag({
      draggedId: id,
      overId: null,
      position: null,
      ghostX: e.clientX - offX,
      ghostY: e.clientY - offY,
      offsetX: offX,
      offsetY: offY,
      ghostWidth: rect.width,
    });
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!drag || drag.draggedId === id) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos: 'top' | 'bottom' = e.clientY < midY ? 'top' : 'bottom';

    const lineY = pos === 'top' ? rect.top - 1 : rect.bottom + 1;
    setInsertLine({ y: lineY, x: rect.left + 16, width: rect.width - 32 });

    setDrag((prev) => (prev ? { ...prev, overId: id, position: pos } : null));
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!drag) return;
    if (e.clientX === 0 && e.clientY === 0) return;
    setDrag((prev) =>
      prev ? { ...prev, ghostX: e.clientX - prev.offsetX, ghostY: e.clientY - prev.offsetY } : null
    );
  };

  const handleDragLeave = (id: string) => {
    if (drag?.overId === id) {
      setDrag((prev) => (prev ? { ...prev, overId: null, position: null } : null));
      setInsertLine(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!drag || drag.draggedId === targetId) {
      resetDrag();
      return;
    }

    const srcIdx = chapters.findIndex((c) => c.id === drag.draggedId);
    const tgtIdx = chapters.findIndex((c) => c.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) {
      resetDrag();
      return;
    }

    const arr = [...chapters];
    const [moved] = arr.splice(srcIdx, 1);
    let insertAt = tgtIdx;
    if (drag.position === 'bottom') {
      insertAt = srcIdx < tgtIdx ? tgtIdx : tgtIdx + 1;
    } else {
      insertAt = srcIdx < tgtIdx ? tgtIdx - 1 : tgtIdx;
    }
    arr.splice(insertAt < 0 ? 0 : insertAt, 0, moved);
    onChange(arr.map((c, i) => ({ ...c, order: i })));
    scheduleAutoSave();
    resetDrag();
  };

  const handleDragEnd = () => {
    resetDrag();
  };

  const resetDrag = () => {
    setDrag(null);
    setInsertLine(null);
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const draggedChapter = chapters.find((c) => c.id === drag?.draggedId);

  return (
    <div className="editor-container">
      <AnimatePresence>
        {autoSaveStatus === 'saving' && (
          <motion.div
            className="save-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="save-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <span>保存中...</span>
          </motion.div>
        )}
        {savedVisible && autoSaveStatus === 'saved' && (
          <motion.div
            className="save-indicator"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <svg className="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span style={{ animation: 'fadeOut 0.5s cubic-bezier(0.4,0,0.2,1) forwards' }}>已保存</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chapter-list" style={{ position: 'relative' }}>
        {chapters.map((chapter) => (
          <motion.div
            key={chapter.id}
            layout
            transition={{
              layout: { type: 'spring', stiffness: 300, damping: 30, duration: 0.3 },
            }}
            ref={(el) => {
              if (el) itemRefs.current.set(chapter.id, el);
            }}
            className="chapter-item"
            style={{
              opacity: drag?.draggedId === chapter.id ? 0.4 : 1,
              transition: 'opacity 0.2s, transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, chapter.id)}
            onDragOver={(e) => handleDragOver(e, chapter.id)}
            onDragLeave={() => handleDragLeave(chapter.id)}
            onDrop={(e) => handleDrop(e, chapter.id)}
            onDragEnd={handleDragEnd}
            onDrag={handleDrag}
          >
            <div className="chapter-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4, marginRight: 8, flexShrink: 0 }}>
                <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
                <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
                <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
              </svg>
              <input
                className="chapter-title-input"
                value={chapter.title}
                onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                placeholder="章节标题"
              />
              <div className="chapter-actions">
                <button className="icon-btn" onClick={() => toggleCollapse(chapter.id)} title={chapter.collapsed ? '展开' : '折叠'}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: chapter.collapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="icon-btn" onClick={() => deleteChapter(chapter.id)} title="删除章节" style={{ color: 'var(--danger)' }}>
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
                      <button className="toolbar-btn" onClick={() => applyFormat('bold')} title="粗体" style={{ fontWeight: 700 }}>B</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('italic')} title="斜体" style={{ fontStyle: 'italic' }}>I</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('formatBlock', 'H1')} title="标题1">H1</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('formatBlock', 'H2')} title="标题2">H2</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('formatBlock', 'H3')} title="标题3">H3</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('insertUnorderedList')} title="无序列表">•</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('insertOrderedList')} title="有序列表">1.</button>
                    </div>
                    <div
                      className="rich-editor"
                      ref={(el) => { if (el) editorRefs.current.set(chapter.id, el); }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => updateContent(chapter.id, (e.target as HTMLDivElement).innerHTML)}
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

        {insertLine && drag && (
          <div
            style={{
              position: 'fixed',
              top: insertLine.y,
              left: insertLine.x,
              width: insertLine.width,
              height: 3,
              background: 'var(--accent)',
              borderRadius: 2,
              zIndex: 900,
              pointerEvents: 'none',
              boxShadow: '0 0 8px rgba(245,166,35,0.5)',
              transition: 'top 0.15s ease-out',
            }}
          />
        )}
      </div>

      {drag && draggedChapter && (
        <div
          className="drag-ghost"
          style={{
            left: drag.ghostX,
            top: drag.ghostY,
            width: Math.min(drag.ghostWidth, 500),
            opacity: 0.7,
            transform: 'rotate(2deg)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {draggedChapter.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            拖拽中...
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterEditor;
