import { useState, useEffect, useRef, useCallback } from 'react';
import { useReaderStore } from './store';
import { AnnotationService } from './AnnotationService';
import type { StickyNote, HighlightColor } from './types';
import {
  Clock,
  BookOpen,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  StickyNote as StickyNoteIcon,
  Trash2,
  Type,
  Play,
  Pause,
  Settings,
  X,
  Plus,
  Edit3,
  Check,
} from 'lucide-react';

interface ReaderPanelProps {
  annotationService: AnnotationService;
  onGoToFirst: () => void;
  onGoToLast: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onAddStickyNote: (pageId: number) => void;
}

export default function ReaderPanel({
  annotationService,
  onGoToFirst,
  onGoToLast,
  onNextPage,
  onPrevPage,
  onAddStickyNote,
}: ReaderPanelProps) {
  const {
    currentPage,
    totalPages,
    readingTime,
    fontSize,
    highlightColor,
    highlights,
    stickyNotes,
    autoFlip,
    autoFlipInterval,
    setFontSize,
    setHighlightColor,
    setAutoFlip,
    setAutoFlipInterval,
  } = useReaderStore();

  const [showControlPanel, setShowControlPanel] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const pageNotes = stickyNotes.filter((n) => n.pageId === currentPage + 1);
  const pageHighlights = highlights.filter((h) => h.pageId === currentPage + 1);
  const progressPercent = totalPages > 1 ? Math.round((currentPage / (totalPages - 1)) * 100) : 100;
  const formattedTime = annotationService.formatReadingTime(readingTime);

  useEffect(() => {
    if (editingNoteId && editRef.current) {
      editRef.current.focus();
    }
  }, [editingNoteId]);

  const handleEditNote = useCallback((note: StickyNote) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  }, []);

  const handleSaveNote = useCallback(
    (noteId: string) => {
      annotationService.updateStickyNote(noteId, { content: editNoteContent });
      useReaderStore.getState().updateStickyNote(noteId, { content: editNoteContent });
      setEditingNoteId(null);
    },
    [editNoteContent, annotationService]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      annotationService.removeStickyNote(noteId);
      useReaderStore.getState().removeStickyNote(noteId);
    },
    [annotationService]
  );

  const highlightColorOptions: { color: HighlightColor; label: string; className: string }[] = [
    { color: 'gold', label: '金黄', className: 'bg-amber-400' },
    { color: 'blue', label: '淡蓝', className: 'bg-sky-300' },
    { color: 'green', label: '浅绿', className: 'bg-emerald-300' },
  ];

  return (
    <>
      <div className="reader-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-icon-label">
            <Clock size={16} />
            <span>阅读时长</span>
          </div>
          <div className="reading-time">{formattedTime}</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-icon-label">
            <BookOpen size={16} />
            <span>阅读进度</span>
          </div>
          <div className="page-info">
            {currentPage + 1} / {totalPages}
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            <span className="progress-text">{progressPercent}%</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-icon-label">
            <StickyNoteIcon size={16} />
            <span>本页标注</span>
          </div>
          <div className="annotation-count">
            <span className="highlight-count">高亮 {pageHighlights.length}</span>
            <span className="note-count">便签 {pageNotes.length}</span>
          </div>
          <button className="sidebar-btn add-note-btn" onClick={() => onAddStickyNote(currentPage + 1)}>
            <Plus size={14} />
            添加便签
          </button>
        </div>

        <div className="sidebar-nav-buttons">
          <button className="nav-btn" onClick={onGoToFirst} title="首页">
            <ChevronFirst size={20} />
          </button>
          <button className="nav-btn" onClick={onPrevPage} title="上一页" disabled={currentPage <= 0}>
            <ChevronLeft size={20} />
          </button>
          <button className="nav-btn" onClick={onNextPage} title="下一页" disabled={currentPage >= totalPages - 1}>
            <ChevronRight size={20} />
          </button>
          <button className="nav-btn" onClick={onGoToLast} title="末页">
            <ChevronLast size={20} />
          </button>
        </div>
      </div>

      <button className="control-panel-toggle" onClick={() => setShowControlPanel(!showControlPanel)}>
        <Settings size={18} />
      </button>

      {showControlPanel && (
        <div className="control-panel">
          <div className="control-panel-header">
            <span>阅读设置</span>
            <button className="control-close-btn" onClick={() => setShowControlPanel(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="control-section">
            <label className="control-label">
              <Type size={14} />
              字体大小: {fontSize}px
            </label>
            <input
              type="range"
              min={12}
              max={28}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="font-slider"
            />
          </div>

          <div className="control-section">
            <label className="control-label">
              <BookOpen size={14} />
              高亮颜色
            </label>
            <div className="color-dots">
              {highlightColorOptions.map((opt) => (
                <button
                  key={opt.color}
                  className={`color-dot ${opt.className} ${highlightColor === opt.color ? 'active' : ''}`}
                  onClick={() => setHighlightColor(opt.color)}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="control-section">
            <label className="control-label">
              {autoFlip ? <Pause size={14} /> : <Play size={14} />}
              自动翻页
            </label>
            <div className="auto-flip-controls">
              <button className={`auto-flip-toggle ${autoFlip ? 'active' : ''}`} onClick={() => setAutoFlip(!autoFlip)}>
                {autoFlip ? '已开启' : '已关闭'}
              </button>
              {autoFlip && (
                <div className="interval-control">
                  <span>{autoFlipInterval}秒</span>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    value={autoFlipInterval}
                    onChange={(e) => setAutoFlipInterval(Number(e.target.value))}
                    className="interval-slider"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNotesPanel && (
        <div className="notes-panel">
          <div className="notes-panel-header">
            <span>便签列表</span>
            <button onClick={() => setShowNotesPanel(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="notes-list">
            {stickyNotes.length === 0 ? (
              <div className="empty-notes">暂无便签</div>
            ) : (
              stickyNotes.map((note) => (
                <div key={note.id} className="note-list-item">
                  {editingNoteId === note.id ? (
                    <div className="note-edit-area">
                      <textarea
                        ref={editRef}
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        className="note-edit-input"
                      />
                      <button className="note-save-btn" onClick={() => handleSaveNote(note.id)}>
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="note-list-content">{note.content || '空便签'}</div>
                      <div className="note-list-meta">
                        第{note.pageId}页
                        <button className="note-edit-btn" onClick={() => handleEditNote(note)}>
                          <Edit3 size={12} />
                        </button>
                        <button className="note-delete-btn" onClick={() => handleDeleteNote(note.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <button className="notes-panel-toggle" onClick={() => setShowNotesPanel(!showNotesPanel)}>
        <StickyNoteIcon size={18} />
        {stickyNotes.length > 0 && <span className="notes-badge">{stickyNotes.length}</span>}
      </button>
    </>
  );
}
