import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Paragraph, LockState } from '../shared/types';
import DrawingCanvas from './Canvas';

interface EditorProps {
  paragraphs: Paragraph[];
  version: number;
  userId: string;
  isCreator: boolean;
  roomCode: string;
  locks: Record<string, LockState>;
  editingByOthers: Set<string>;
  readOnly?: boolean;
  onEditParagraph: (paragraphId: string, content: string, version: number) => string;
  onAddParagraph: (afterId: string | null, version: number) => string;
  onDeleteParagraph: (paragraphId: string, version: number) => string;
  onReorder: (paragraphId: string, newIndex: number, version: number) => string;
  onSetIllustration: (paragraphId: string, illustration: { data: string; type: 'upload' | 'canvas' } | null, version: number) => string;
  onLock: (paragraphId: string) => void;
  onUnlock: (paragraphId: string) => void;
}

type IllustrationModalState = {
  open: boolean;
  paragraphId: string | null;
  tab: 'upload' | 'canvas';
};

const MAX_CONTENT = 200;

const Editor: React.FC<EditorProps> = ({
  paragraphs,
  version,
  userId,
  roomCode,
  locks,
  editingByOthers,
  readOnly,
  onEditParagraph,
  onAddParagraph,
  onDeleteParagraph,
  onReorder,
  onSetIllustration,
  onLock,
  onUnlock,
}) => {
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<IllustrationModalState>({ open: false, paragraphId: null, tab: 'upload' });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [dragOverFile, setDragOverFile] = useState(false);
  const editDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [localContents, setLocalContents] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = () => {
      for (const pid of Object.keys(editDebounceTimers.current)) {
        const timer = editDebounceTimers.current[pid];
        clearTimeout(timer);
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const triggerHighlight = useCallback((id: string) => {
    setHighlightIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setHighlightIds(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }, 3000);
  }, []);

  useEffect(() => {
    for (const id of editingByOthers) {
      triggerHighlight(id);
    }
  }, [editingByOthers, triggerHighlight]);

  const effectiveContents = useMemo(() => {
    const result: Record<string, string> = {};
    for (const p of paragraphs) {
      result[p.id] = localContents[p.id] ?? p.content;
    }
    return result;
  }, [paragraphs, localContents]);

  const handleContentChange = useCallback((paragraphId: string, rawValue: string) => {
    const value = rawValue.slice(0, MAX_CONTENT + 20);
    setLocalContents(prev => ({ ...prev, [paragraphId]: value }));

    if (editDebounceTimers.current[paragraphId]) {
      clearTimeout(editDebounceTimers.current[paragraphId]);
    }
    editDebounceTimers.current[paragraphId] = setTimeout(() => {
      const truncated = value.slice(0, MAX_CONTENT);
      onEditParagraph(paragraphId, truncated, version);
      delete editDebounceTimers.current[paragraphId];
    }, 200);
  }, [onEditParagraph, version]);

  const handleFocus = useCallback((paragraphId: string) => {
    const lock = locks[paragraphId];
    if (lock && lock.userId !== userId) return;
    onLock(paragraphId);
  }, [locks, userId, onLock]);

  const handleBlur = useCallback((paragraphId: string, content: string) => {
    setLocalContents(prev => {
      const n = { ...prev };
      delete n[paragraphId];
      return n;
    });

    if (editDebounceTimers.current[paragraphId]) {
      clearTimeout(editDebounceTimers.current[paragraphId]);
      delete editDebounceTimers.current[paragraphId];
      const truncated = content.slice(0, MAX_CONTENT);
      onEditParagraph(paragraphId, truncated, version);
    }
    onUnlock(paragraphId);
  }, [onEditParagraph, version, onUnlock]);

  const handleAddAfter = useCallback((afterId: string) => {
    onAddParagraph(afterId, version);
  }, [onAddParagraph, version]);

  const handleDelete = useCallback((paragraphId: string) => {
    if (paragraphs.length <= 1) return;
    onDeleteParagraph(paragraphId, version);
  }, [onDeleteParagraph, version, paragraphs.length]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    onReorder(paragraphs[index].id, index - 1, version);
  }, [onReorder, paragraphs, version]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= paragraphs.length - 1) return;
    onReorder(paragraphs[index].id, index + 1, version);
  }, [onReorder, paragraphs, version]);

  const onDragStart = useCallback((e: React.DragEvent, paragraphId: string) => {
    setDraggingId(paragraphId);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', paragraphId); } catch {}
  }, []);

  const onDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, paragraphId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (paragraphId !== draggingId) {
      setDragOverId(paragraphId);
    }
  }, [draggingId]);

  const onDragLeavePara = useCallback(() => {
    setDragOverId(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = draggingId || e.dataTransfer.getData('text/plain');
    if (!fromId || fromId === targetId) {
      onDragEnd();
      return;
    }
    const fromIdx = paragraphs.findIndex(p => p.id === fromId);
    const toIdx = paragraphs.findIndex(p => p.id === targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      onReorder(fromId, toIdx, version);
    }
    onDragEnd();
  }, [draggingId, paragraphs, onReorder, version, onDragEnd]);

  const openIllustrationModal = useCallback((paragraphId: string, tab: 'upload' | 'canvas') => {
    setModal({ open: true, paragraphId, tab });
    setUploadPreview(null);
  }, []);

  const closeIllustrationModal = useCallback(() => {
    setModal({ open: false, paragraphId: null, tab: 'upload' });
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
      alert('仅支持 JPG/PNG 格式');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDropFile = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFile(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const confirmUpload = useCallback(() => {
    if (!uploadPreview || !modal.paragraphId) return;
    onSetIllustration(modal.paragraphId, { data: uploadPreview, type: 'upload' }, version);
    closeIllustrationModal();
  }, [uploadPreview, modal.paragraphId, onSetIllustration, version, closeIllustrationModal]);

  const onCanvasSave = useCallback((data: string) => {
    if (!modal.paragraphId) return;
    onSetIllustration(modal.paragraphId, { data, type: 'canvas' }, version);
    closeIllustrationModal();
  }, [modal.paragraphId, onSetIllustration, version, closeIllustrationModal]);

  const deleteIllustration = useCallback((paragraphId: string) => {
    if (confirm('确定删除该插画吗？')) {
      onSetIllustration(paragraphId, null, version);
    }
  }, [onSetIllustration, version]);

  return (
    <div className="editor-scroll-inner">
      {paragraphs.map((paragraph, index) => {
        const lock = locks[paragraph.id];
        const isLockedByOther = lock && lock.userId !== userId;
        const content = effectiveContents[paragraph.id] ?? paragraph.content;

        return (
          <div
            key={paragraph.id}
            className={`paragraph-card
              ${draggingId === paragraph.id ? 'dragging' : ''}
              ${dragOverId === paragraph.id ? 'drag-over' : ''}
              ${highlightIds.has(paragraph.id) ? 'editing-highlight' : ''}
            `}
            draggable={!readOnly && !isLockedByOther}
            onDragStart={(e) => !readOnly && onDragStart(e, paragraph.id)}
            onDragEnd={!readOnly ? onDragEnd : undefined}
            onDragOver={(e) => !readOnly && onDragOver(e, paragraph.id)}
            onDragLeave={!readOnly ? onDragLeavePara : undefined}
            onDrop={(e) => !readOnly && onDrop(e, paragraph.id)}
          >
            <div className="paragraph-inner">
              {!readOnly && (
                <div className="paragraph-gutter">
                  <div className="drag-handle" title="拖拽排序">⋮⋮</div>
                  <div className="paragraph-index">§{index + 1}</div>
                  <button className="icon-btn" onClick={() => handleMoveUp(index)} title="上移" disabled={index === 0}>↑</button>
                  <button className="icon-btn" onClick={() => handleMoveDown(index)} title="下移" disabled={index === paragraphs.length - 1}>↓</button>
                  <button className="icon-btn" onClick={() => handleDelete(paragraph.id)} title="删除段落" disabled={paragraphs.length <= 1}>✕</button>
                </div>
              )}
              <div className="paragraph-body" style={{ flex: readOnly ? 1 : undefined }}>
                {isLockedByOther && (
                  <div className="lock-hint">
                    <span>👤</span>
                    <span><b>{lock.nickname}</b> 正在编辑...</span>
                  </div>
                )}
                <textarea
                  className={`paragraph-textarea ${isLockedByOther ? 'locked-other' : ''}`}
                  value={content}
                  onChange={(e) => !readOnly && !isLockedByOther && handleContentChange(paragraph.id, e.target.value)}
                  onFocus={() => !readOnly && !isLockedByOther && handleFocus(paragraph.id)}
                  onBlur={() => !readOnly && handleBlur(paragraph.id, content)}
                  disabled={readOnly || isLockedByOther}
                  placeholder={`第 ${index + 1} 段：在此输入故事内容（最多${MAX_CONTENT}字）...`}
                  spellCheck={false}
                />
                <div className={`char-count ${content.length > MAX_CONTENT * 0.9 ? 'near-limit' : ''} ${content.length > MAX_CONTENT ? 'over-limit' : ''}`}>
                  {content.length}/{MAX_CONTENT}
                </div>
                {!readOnly && (
                  <div style={{ marginTop: 8, paddingLeft: 8 }}>
                    <button className="icon-btn" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => handleAddAfter(paragraph.id)}>
                      ➕ 在此后插入段落
                    </button>
                  </div>
                )}
              </div>

              {!readOnly ? (
                <div className="paragraph-illustration">
                  {paragraph.illustration ? (
                    <div className="illustration-box">
                      <img src={paragraph.illustration.data} alt="段落插画" />
                      <div className="illustration-actions">
                        <button className="icon-btn" onClick={() => openIllustrationModal(paragraph.id, 'upload')} title="更换图片">📤</button>
                        <button className="icon-btn" onClick={() => openIllustrationModal(paragraph.id, 'canvas')} title="画板重绘">🎨</button>
                        <button className="icon-btn" onClick={() => deleteIllustration(paragraph.id)} title="删除插画">🗑️</button>
                      </div>
                    </div>
                  ) : (
                    <button className="add-illustration-btn" onClick={() => openIllustrationModal(paragraph.id, 'upload')}>
                      <div style={{ fontSize: 32 }}>🖼️</div>
                      <div><b>添加插画</b></div>
                      <div style={{ opacity: 0.7 }}>上传图片 / 手绘</div>
                    </button>
                  )}
                </div>
              ) : paragraph.illustration ? (
                <div className="paragraph-illustration">
                  <div className="illustration-box">
                    <img src={paragraph.illustration.data} alt="段落插画" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <div className="editor-toolbar">
          <button className="btn btn-primary" onClick={() => onAddParagraph(null, version)}>
            ➕ 添加新段落
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            共 {paragraphs.length} 段 · 房间码 <code style={{ color: 'var(--color-accent)' }}>{roomCode}</code>
          </span>
        </div>
      )}

      {modal.open && modal.paragraphId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeIllustrationModal(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">🖼️ 添加段落插画</div>
              <button className="icon-btn" onClick={closeIllustrationModal}>✕</button>
            </div>
            <div className="modal-tabs">
              <button className={`modal-tab ${modal.tab === 'upload' ? 'active' : ''}`} onClick={() => setModal(m => ({ ...m, tab: 'upload' }))}>
                📤 上传图片
              </button>
              <button className={`modal-tab ${modal.tab === 'canvas' ? 'active' : ''}`} onClick={() => setModal(m => ({ ...m, tab: 'canvas' }))}>
                🎨 手绘插画
              </button>
            </div>

            {modal.tab === 'upload' ? (
              <div>
                <div
                  className={`upload-zone ${dragOverFile ? 'drag-over-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFile(true); }}
                  onDragLeave={() => setDragOverFile(false)}
                  onDrop={onDropFile}
                >
                  <div style={{ fontSize: 40 }}>📁</div>
                  <div style={{ marginTop: 12, fontWeight: 600 }}>点击选择或拖拽图片到此处</div>
                  <div className="upload-hint">支持 JPG / PNG 格式，最大 2MB</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {uploadPreview && (
                  <div className="upload-preview">
                    <img src={uploadPreview} alt="预览" />
                  </div>
                )}
                <div className="modal-footer">
                  <button className="btn" onClick={closeIllustrationModal}>取消</button>
                  <button className="btn btn-primary" onClick={confirmUpload} disabled={!uploadPreview}>
                    确认上传
                  </button>
                </div>
              </div>
            ) : (
              <DrawingCanvas onSave={onCanvasSave} onCancel={closeIllustrationModal} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
