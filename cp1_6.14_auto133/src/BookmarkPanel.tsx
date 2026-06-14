import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { highlightEngine, TagType, TAGS, Highlight, HIGHLIGHT_UPDATED_EVENT, HIGHLIGHT_ADDED_EVENT, HIGHLIGHT_REMOVED_EVENT } from './highlight-engine';
import { noteEngine, Note, NOTE_ADDED_EVENT, NOTE_REMOVED_EVENT } from './note-engine';
import { generateSummary, copyToClipboard } from './summary-generator';

interface BookmarkPanelProps {
  articleTitle: string;
  activeFilter: TagType | null;
  onFilterChange: (tag: TagType | null) => void;
  onHighlightClick: (id: string) => void;
  selectedHighlightIds: Set<string>;
}

const BookmarkPanel: React.FC<BookmarkPanelProps> = ({
  articleTitle,
  activeFilter,
  onFilterChange,
  onHighlightClick,
  selectedHighlightIds,
}) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{ html: string; text: string; cardHtml: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showScrollShadow, setShowScrollShadow] = useState(false);
  const [sortBy, setSortBy] = useState<'position' | 'time'>('position');
  const panelRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateData = () => {
      setHighlights(highlightEngine.getHighlights());
      setNotes(noteEngine.getNotes());
    };
    document.addEventListener(HIGHLIGHT_UPDATED_EVENT, updateData);
    document.addEventListener(HIGHLIGHT_ADDED_EVENT, updateData);
    document.addEventListener(HIGHLIGHT_REMOVED_EVENT, updateData);
    document.addEventListener(NOTE_ADDED_EVENT, updateData);
    document.addEventListener(NOTE_REMOVED_EVENT, updateData);
    updateData();
    return () => {
      document.removeEventListener(HIGHLIGHT_UPDATED_EVENT, updateData);
      document.removeEventListener(HIGHLIGHT_ADDED_EVENT, updateData);
      document.removeEventListener(HIGHLIGHT_REMOVED_EVENT, updateData);
      document.removeEventListener(NOTE_ADDED_EVENT, updateData);
      document.removeEventListener(NOTE_REMOVED_EVENT, updateData);
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (panelRef.current) {
      setShowScrollShadow(panelRef.current.scrollTop > 8);
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCheck = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleGenerateSummary = useCallback(() => {
    const selectedHighlights = highlights.filter(h => checkedIds.has(h.id));
    const notesWithHighlights = noteEngine.getNotesWithHighlights().filter(
      ({ highlight }) => checkedIds.has(highlight.id)
    );
    if (selectedHighlights.length === 0 && notesWithHighlights.length === 0) return;
    const result = generateSummary(selectedHighlights, notesWithHighlights, articleTitle);
    setSummaryResult(result);
    setSummaryModalVisible(true);
  }, [highlights, checkedIds, articleTitle]);

  const handleCopy = useCallback(async () => {
    if (!summaryResult) return;
    const success = await copyToClipboard(summaryResult.text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [summaryResult]);

  const handleRemoveHighlight = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    highlightEngine.removeHighlight(id);
  }, []);

  const filteredItems = useMemo(() => {
    const noteMap = new Map<string, Note[]>();
    for (const n of notes) {
      const arr = noteMap.get(n.highlightId) || [];
      arr.push(n);
      noteMap.set(n.highlightId, arr);
    }

    let filtered = highlights;
    if (activeFilter !== null) {
      filtered = highlights.filter(h => h.tag === activeFilter);
    }

    if (sortBy === 'position') {
      filtered = [...filtered].sort((a, b) => a.startOffset - b.startOffset);
    } else {
      filtered = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    }

    return filtered.map(h => ({
      highlight: h,
      notes: noteMap.get(h.id) || [],
    }));
  }, [highlights, notes, activeFilter, sortBy]);

  const totalCount = highlights.length;
  const noteCount = notes.length;

  return (
    <div
      style={{
        width: '30%',
        background: '#f1f5f9',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {showScrollShadow && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}

      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>书签摘要</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {totalCount} 条高亮 · {noteCount} 条笔记
          </span>
        </div>

        <div className="filter-bar" style={{ padding: '8px 0', marginBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <button
            className={`filter-tag ${activeFilter === null ? 'active' : ''}`}
            style={activeFilter === null ? { background: '#475569', color: 'white', borderColor: 'transparent' } : {}}
            onClick={() => onFilterChange(null)}
          >
            全部
          </button>
          {TAGS.filter(t => t.type !== 'none').map(tag => (
            <button
              key={tag.type}
              className={`filter-tag ${activeFilter === tag.type ? 'active' : ''}`}
              style={activeFilter === tag.type ? { background: tag.color, color: 'white', borderColor: 'transparent' } : {}}
              onClick={() => onFilterChange(activeFilter === tag.type ? null : tag.type)}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: sortBy === 'position' ? '#60a5fa' : '#e2e8f0',
              background: sortBy === 'position' ? '#eff6ff' : 'white',
              color: sortBy === 'position' ? '#2563eb' : '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setSortBy('position')}
          >
            按位置排序
          </button>
          <button
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: sortBy === 'time' ? '#60a5fa' : '#e2e8f0',
              background: sortBy === 'time' ? '#eff6ff' : 'white',
              color: sortBy === 'time' ? '#2563eb' : '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setSortBy('time')}
          >
            按时间排序
          </button>
        </div>

        <button
          className="generate-summary-btn"
          disabled={checkedIds.size === 0}
          onClick={handleGenerateSummary}
        >
          生成摘要卡片 ({checkedIds.size})
        </button>
      </div>

      <div
        ref={panelRef}
        className="bookmark-panel"
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px 20px',
          willChange: 'transform',
        }}
      >
        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }}>
            {highlights.length === 0 ? '选中文章文字即可添加高亮' : '当前筛选条件下没有匹配项'}
          </div>
        )}

        {filteredItems.map(({ highlight, notes: itemNotes }) => {
          const isExpanded = expandedIds.has(highlight.id);
          const isChecked = checkedIds.has(highlight.id);
          const tagConfig = TAGS.find(t => t.type === highlight.tag);

          return (
            <React.Fragment key={highlight.id}>
              <div
                className={`highlight-card ${isExpanded ? 'expanded' : ''}`}
                style={{
                  position: 'relative',
                  background: highlight.tag !== 'none' ? `${highlight.color}18` : '#fef08a',
                  borderLeft: `4px solid ${tagConfig?.color || '#fef08a'}`,
                }}
                onClick={() => toggleExpand(highlight.id)}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    borderRadius: '8px 0 0 8px',
                    background: tagConfig?.color || '#fef08a',
                  }}
                />
                <div className="text-preview" style={{ paddingLeft: '8px' }}>
                  {highlight.text}
                </div>
                <div className="checkbox-wrapper" onClick={(e) => toggleCheck(highlight.id, e)}>
                  <input type="checkbox" checked={isChecked} readOnly />
                </div>
                {tagConfig && tagConfig.type !== 'none' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '32px',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: tagConfig.color,
                      color: 'white',
                    }}
                  >
                    {tagConfig.label}
                  </span>
                )}
                <button
                  onClick={(e) => handleRemoveHighlight(highlight.id, e)}
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  ✕
                </button>
              </div>

              {itemNotes.map(note => (
                <div
                  key={note.id}
                  className="note-card"
                  style={{ position: 'relative' }}
                  onClick={() => onHighlightClick(highlight.id)}
                >
                  <div className="highlight-excerpt">
                    "{highlight.text.slice(0, 80)}{highlight.text.length > 80 ? '...' : ''}"
                  </div>
                  <div className="note-content">{note.content}</div>
                  <div className="checkbox-wrapper" onClick={(e) => toggleCheck(highlight.id, e)}>
                    <input type="checkbox" checked={isChecked} readOnly />
                  </div>
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>

      {summaryModalVisible && summaryResult && (
        <div className="summary-modal-overlay" onClick={() => setSummaryModalVisible(false)}>
          <div
            className="summary-modal"
            style={{ position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-modal" onClick={() => setSummaryModalVisible(false)}>✕</button>
            <h3>书签摘要卡片</h3>
            <div
              ref={summaryRef}
              style={{
                width: '360px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                padding: '24px',
                margin: '0 auto',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {highlights
                .filter(h => checkedIds.has(h.id))
                .sort((a, b) => a.startOffset - b.startOffset)
                .map(h => (
                  <div
                    key={h.id}
                    style={{
                      fontStyle: 'italic',
                      fontSize: '15px',
                      lineHeight: '1.8',
                      color: '#713f12',
                      padding: '0 0 12px 16px',
                      borderLeft: '3px solid #fbbf24',
                      marginBottom: '12px',
                    }}
                  >
                    "{h.text}"
                  </div>
                ))}
              {noteEngine.getNotesWithHighlights()
                .filter(({ highlight }) => checkedIds.has(highlight.id))
                .map(({ note, highlight }) => (
                  <div key={note.id} style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        fontStyle: 'italic',
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: '#713f12',
                        padding: '0 0 8px 16px',
                        borderLeft: '3px solid #fbbf24',
                      }}
                    >
                      "{highlight.text}"
                    </div>
                    <div style={{ fontSize: '13px', color: '#713f12', padding: '4px 0 4px 16px' }}>
                      📝 {note.content}
                    </div>
                  </div>
                ))}
              <div
                style={{
                  fontSize: '12px',
                  color: '#a16207',
                  marginTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>📖 {articleTitle}</span>
                <span>{new Date().toLocaleString('zh-CN')}</span>
              </div>
            </div>
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              style={{
                width: '120px',
                height: '40px',
                borderRadius: '20px',
                background: copied ? '#22c55e' : '#1e293b',
                color: 'white',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'block',
                margin: '16px auto 0',
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? '已复制 ✓' : '复制摘要'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarkPanel;
