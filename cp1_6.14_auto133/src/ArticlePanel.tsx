import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { highlightEngine, TagType, TAGS, Highlight, HIGHLIGHT_UPDATED_EVENT, HIGHLIGHT_ADDED_EVENT, HIGHLIGHT_REMOVED_EVENT } from './highlight-engine';
import { noteEngine, Note, NOTE_ADDED_EVENT, NOTE_REMOVED_EVENT } from './note-engine';

interface ArticlePanelProps {
  articleText: string;
  onArticleChange: (text: string) => void;
  activeFilter: TagType | null;
  onHighlightClick: (id: string) => void;
  selectedHighlightIds: Set<string>;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

const ArticlePanel: React.FC<ArticlePanelProps> = ({
  articleText,
  onArticleChange,
  activeFilter,
  onHighlightClick,
  selectedHighlightIds,
}) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [notePanelVisible, setNotePanelVisible] = useState(false);
  const [notePanelPos, setNotePanelPos] = useState({ x: 0, y: 0 });
  const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagType>('none');
  const [selectionText, setSelectionText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [selectionBg, setSelectionBg] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = () => setHighlights(highlightEngine.getHighlights());
    document.addEventListener(HIGHLIGHT_UPDATED_EVENT, handler);
    document.addEventListener(HIGHLIGHT_ADDED_EVENT, handler);
    document.addEventListener(HIGHLIGHT_REMOVED_EVENT, handler);
    document.addEventListener(NOTE_ADDED_EVENT, handler);
    document.addEventListener(NOTE_REMOVED_EVENT, handler);
    return () => {
      document.removeEventListener(HIGHLIGHT_UPDATED_EVENT, handler);
      document.removeEventListener(HIGHLIGHT_ADDED_EVENT, handler);
      document.removeEventListener(HIGHLIGHT_REMOVED_EVENT, handler);
      document.removeEventListener(NOTE_ADDED_EVENT, handler);
      document.removeEventListener(NOTE_REMOVED_EVENT, handler);
    };
  }, []);

  const debouncedHideToolbar = useMemo(
    () => debounce(() => setToolbarVisible(false), 150),
    []
  );

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      debouncedHideToolbar();
      return;
    }

    const text = sel.toString().trim();
    if (!text || !articleRef.current) return;

    setSelectionText(text);
    setSelectionBg(true);
    setTimeout(() => setSelectionBg(false), 200);

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const articleEl = articleRef.current;
    let startOffset = 0;
    let endOffset = 0;
    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(articleEl);
      preRange.setEnd(range.startContainer, range.startOffset);
      startOffset = preRange.toString().length;
      endOffset = startOffset + range.toString().length;
    } catch {
      return;
    }

    setSelectionRange({ start: startOffset, end: endOffset });
    setToolbarPos({
      x: rect.left + rect.width / 2 - 100,
      y: rect.top - 52,
    });
    setToolbarVisible(true);
  }, [debouncedHideToolbar]);

  const handleHighlight = useCallback(() => {
    if (!selectionRange) return;
    const paragraphIndex = highlightEngine.getParagraphIndexFromOffset(selectionRange.start);
    const h = highlightEngine.addHighlight(selectionRange.start, selectionRange.end, selectedTag, paragraphIndex);
    if (h) {
      setHighlights(highlightEngine.getHighlights());
    }
    setToolbarVisible(false);
    window.getSelection()?.removeAllRanges();
  }, [selectionRange, selectedTag]);

  const handleNote = useCallback(() => {
    if (!selectionRange) return;
    const paragraphIndex = highlightEngine.getParagraphIndexFromOffset(selectionRange.start);
    const h = highlightEngine.addHighlight(selectionRange.start, selectionRange.end, selectedTag, paragraphIndex);
    if (h) {
      setPendingHighlightId(h.id);
      setHighlights(highlightEngine.getHighlights());
      setToolbarPos(prev => ({
        ...prev,
        y: prev.y,
      }));
      setNotePanelPos({
        x: toolbarPos.x + 220,
        y: toolbarPos.y - 20,
      });
      setNotePanelVisible(true);
      setNoteContent('');
      setTimeout(() => noteTextareaRef.current?.focus(), 50);
    }
    setToolbarVisible(false);
    window.getSelection()?.removeAllRanges();
  }, [selectionRange, selectedTag, toolbarPos]);

  const handleSaveNote = useCallback(() => {
    if (pendingHighlightId && noteContent.trim()) {
      noteEngine.addNote(pendingHighlightId, noteContent.trim());
    }
    setNotePanelVisible(false);
    setPendingHighlightId(null);
    setNoteContent('');
  }, [pendingHighlightId, noteContent]);

  const handleCancelNote = useCallback(() => {
    setNotePanelVisible(false);
    setPendingHighlightId(null);
    setNoteContent('');
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      onArticleChange(text);
      highlightEngine.setArticle(text);
    };
    reader.readAsText(file);
  }, [onArticleChange]);

  const handleTextPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      onArticleChange(text);
      highlightEngine.setArticle(text);
    }
  }, [onArticleChange]);

  const handleTextInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onArticleChange(e.target.value);
  }, [onArticleChange]);

  const handleTextSubmit = useCallback(() => {
    if (articleText.trim()) {
      highlightEngine.setArticle(articleText);
    }
  }, [articleText]);

  const renderHighlightedText = useMemo(() => {
    if (!articleText) return null;

    const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    for (let i = 0; i < sorted.length; i++) {
      const h = sorted[i];
      if (h.startOffset > lastEnd) {
        parts.push(
          <span key={`text-${lastEnd}`}>{articleText.slice(lastEnd, h.startOffset)}</span>
        );
      }

      const isDimmed = activeFilter !== null && h.tag !== activeFilter;
      const isSelected = selectedHighlightIds.has(h.id);

      parts.push(
        <span
          key={h.id}
          className={`highlight ${isDimmed ? 'dimmed' : ''} ${isSelected ? 'selected' : ''} selection-animation`}
          style={{
            backgroundColor: h.tag !== 'none' ? undefined : '#fef08a',
            borderLeft: h.tag !== 'none' ? `3px solid ${h.color}` : undefined,
            transition: 'opacity 0.3s ease, box-shadow 0.2s ease',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onHighlightClick(h.id);
          }}
          title={TAGS.find(t => t.type === h.tag)?.label || ''}
        >
          {articleText.slice(h.startOffset, h.endOffset)}
        </span>
      );

      lastEnd = h.endOffset;
    }

    if (lastEnd < articleText.length) {
      parts.push(
        <span key={`text-${lastEnd}`}>{articleText.slice(lastEnd)}</span>
      );
    }

    return parts;
  }, [articleText, highlights, activeFilter, selectedHighlightIds, onHighlightClick]);

  const paragraphs = highlightEngine.getParagraphs();
  const hasArticle = paragraphs.length > 0;

  return (
    <div
      style={{
        width: '70%',
        background: '#fafafa',
        borderRadius: '16px',
        padding: '32px',
        lineHeight: '1.8',
        fontSize: '16px',
        fontFamily: 'serif',
        position: 'relative',
        overflowY: 'auto',
        minHeight: '100vh',
      }}
    >
      {!hasArticle ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', paddingTop: '60px' }}>
          <h3 style={{ color: '#475569', fontWeight: 500, marginBottom: '8px' }}>粘贴或上传文章内容</h3>
          <textarea
            className="text-input-area"
            placeholder="在此粘贴文章内容，或点击下方按钮上传文本文件..."
            value={articleText}
            onChange={handleTextInput}
            onPaste={handleTextPaste}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="upload-btn" onClick={handleTextSubmit}>
              加载文章
            </button>
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              上传文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.text"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        </div>
      ) : (
        <div
          ref={articleRef}
          onMouseUp={handleMouseUp}
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            cursor: 'text',
            userSelect: 'text',
            background: selectionBg ? 'rgba(254, 240, 138, 0.1)' : 'transparent',
            transition: 'background-color 0.2s ease',
          }}
        >
          {renderHighlightedText}
        </div>
      )}

      {toolbarVisible && (
        <div
          className="floating-toolbar"
          style={{
            left: toolbarPos.x,
            top: toolbarPos.y,
          }}
        >
          <button className="toolbar-btn highlight-btn" onClick={handleHighlight}>
            ✦ 高亮
          </button>
          <button className="toolbar-btn note-btn" onClick={handleNote}>
            ✎ 笔记
          </button>
          <div style={{ width: '1px', height: '20px', background: '#4a5568', margin: '0 4px' }} />
          {TAGS.filter(t => t.type !== 'none').map(tag => (
            <button
              key={tag.type}
              className="toolbar-btn"
              style={{
                background: selectedTag === tag.type ? tag.color : 'transparent',
                border: `1.5px solid ${tag.color}`,
                color: selectedTag === tag.type ? '#fff' : tag.color,
                fontSize: '11px',
                padding: '0 8px',
                minWidth: '36px',
              }}
              onClick={() => setSelectedTag(selectedTag === tag.type ? 'none' : tag.type)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {notePanelVisible && (
        <div
          className="note-input-panel"
          style={{
            left: notePanelPos.x,
            top: notePanelPos.y,
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontStyle: 'italic' }}>
            为选中文字添加笔记：
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', maxHeight: '40px', overflow: 'hidden' }}>
            "{selectionText.slice(0, 60)}{selectionText.length > 60 ? '...' : ''}"
          </div>
          <textarea
            ref={noteTextareaRef}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="输入笔记内容..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) handleSaveNote();
              if (e.key === 'Escape') handleCancelNote();
            }}
          />
          <div className="tag-selector">
            {TAGS.filter(t => t.type !== 'none').map(tag => (
              <span
                key={tag.type}
                className={`tag-option ${selectedTag === tag.type ? 'selected' : ''}`}
                style={{
                  background: `${tag.color}22`,
                  color: tag.color,
                }}
                onClick={() => setSelectedTag(selectedTag === tag.type ? 'none' : tag.type)}
              >
                {tag.label}
              </span>
            ))}
          </div>
          <div className="actions">
            <button className="cancel-btn" onClick={handleCancelNote}>取消</button>
            <button className="save-btn" onClick={handleSaveNote}>保存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticlePanel;
