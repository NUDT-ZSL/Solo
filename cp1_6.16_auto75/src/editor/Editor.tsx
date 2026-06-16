import React, { useState, useRef, useEffect, useCallback } from 'react';
import { resolveConflict, chooseVersion, type ParagraphVersion, type ConflictResult } from './ConflictResolver';
import { acquireLock, releaseLock, submitChange } from '../api/LockService';

interface ParagraphBlock {
  id: string;
  content: string;
  lockedBy: string | null;
  lockedByName: string | null;
  conflict: ConflictResult | null;
}

interface CursorInfo {
  userId: string;
  userName: string;
  paragraphIndex: number;
  color: string;
}

interface EditorProps {
  chapterId: string;
  paragraphs: ParagraphBlock[];
  userId: string;
  userName: string;
  onParagraphsChange: (paragraphs: ParagraphBlock[]) => void;
  socket: any;
  cursors: CursorInfo[];
  onJumpToChapter: (chapterId: string) => void;
}

const CURSOR_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];

const Editor: React.FC<EditorProps> = ({
  chapterId,
  paragraphs,
  userId,
  userName,
  onParagraphsChange,
  socket,
  cursors,
  onJumpToChapter,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const lockTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const startLockTimer = useCallback(
    (index: number) => {
      const existing = lockTimers.current.get(index);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        releaseLock(chapterId, index, userId);
        if (socket) {
          socket.emit('lock-released', { chapterId, paragraphIndex: index, userId });
        }
        setEditingIndex(null);
        lockTimers.current.delete(index);
      }, 60000);

      lockTimers.current.set(index, timer);
    },
    [chapterId, userId, socket]
  );

  const handleParagraphFocus = useCallback(
    async (index: number) => {
      if (editingIndex !== null && editingIndex !== index) {
        releaseLock(chapterId, editingIndex, userId);
        if (socket) {
          socket.emit('lock-released', { chapterId, paragraphIndex: editingIndex, userId });
        }
        const timer = lockTimers.current.get(editingIndex);
        if (timer) {
          clearTimeout(timer);
          lockTimers.current.delete(editingIndex);
        }
      }

      const result = await acquireLock(chapterId, index, userId, userName);
      if (result.success) {
        setEditingIndex(index);
        startLockTimer(index);
        if (socket) {
          socket.emit('lock-acquired', {
            chapterId,
            paragraphIndex: index,
            userId,
            userName,
          });
        }
      }
    },
    [chapterId, userId, userName, editingIndex, socket, startLockTimer]
  );

  const handleParagraphChange = useCallback(
    (index: number, content: string) => {
      const updated = paragraphs.map((p, i) => (i === index ? { ...p, content } : p));
      onParagraphsChange(updated);

      if (socket) {
        socket.emit('paragraph-updating', {
          chapterId,
          paragraphIndex: index,
          content,
          userId,
          userName,
        });
      }
    },
    [paragraphs, chapterId, userId, userName, socket, onParagraphsChange]
  );

  const handleParagraphBlur = useCallback(
    async (index: number) => {
      const content = paragraphs[index]?.content || '';
      const result = await submitChange(chapterId, index, content, userId, userName);

      if (result.success && socket) {
        socket.emit('paragraph-updated', {
          chapterId,
          paragraphIndex: index,
          content,
          userId,
          userName,
          version: result.version,
        });
      } else if (result.conflict && socket) {
        socket.emit('conflict-detected', {
          chapterId,
          paragraphIndex: index,
          conflict: result.conflict,
        });
      }
    },
    [chapterId, paragraphs, userId, userName, socket]
  );

  const handleConflictResolve = useCallback(
    (index: number, chosenVersion: ParagraphVersion, discardedVersion: ParagraphVersion) => {
      const result = chooseVersion(chosenVersion, discardedVersion);
      if (result.mergedContent !== null) {
        const updated = paragraphs.map((p, i) =>
          i === index ? { ...p, content: result.mergedContent!, conflict: null } : p
        );
        onParagraphsChange(updated);

        if (socket) {
          socket.emit('conflict-resolved', {
            chapterId,
            paragraphIndex: index,
            content: result.mergedContent,
            userId,
          });
        }
      }
    },
    [paragraphs, chapterId, userId, socket, onParagraphsChange]
  );

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...paragraphs];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    onParagraphsChange(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    if (!socket) return;

    const onLockAcquired = (data: any) => {
      if (data.chapterId !== chapterId) return;
      const updated = paragraphs.map((p, i) =>
        i === data.paragraphIndex && data.userId !== userId
          ? { ...p, lockedBy: data.userId, lockedByName: data.userName }
          : p
      );
      onParagraphsChange(updated);
    };

    const onLockReleased = (data: any) => {
      if (data.chapterId !== chapterId) return;
      const updated = paragraphs.map((p, i) =>
        i === data.paragraphIndex && data.userId !== userId
          ? { ...p, lockedBy: null, lockedByName: null }
          : p
      );
      onParagraphsChange(updated);
    };

    const onParagraphUpdated = (data: any) => {
      if (data.chapterId !== chapterId || data.userId === userId) return;
      const updated = paragraphs.map((p, i) =>
        i === data.paragraphIndex ? { ...p, content: data.content } : p
      );
      onParagraphsChange(updated);
    };

    const onConflictDetected = (data: any) => {
      if (data.chapterId !== chapterId) return;
      const updated = paragraphs.map((p, i) =>
        i === data.paragraphIndex ? { ...p, conflict: data.conflict } : p
      );
      onParagraphsChange(updated);
    };

    socket.on('lock-acquired', onLockAcquired);
    socket.on('lock-released', onLockReleased);
    socket.on('paragraph-updated', onParagraphUpdated);
    socket.on('conflict-detected', onConflictDetected);

    return () => {
      socket.off('lock-acquired', onLockAcquired);
      socket.off('lock-released', onLockReleased);
      socket.off('paragraph-updated', onParagraphUpdated);
      socket.off('conflict-detected', onConflictDetected);
    };
  }, [socket, chapterId, paragraphs, userId, onParagraphsChange]);

  const getUserColor = (uid: string) => {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
  };

  const cursorsInParagraph = (index: number) =>
    cursors.filter(
      (c) => c.paragraphIndex === index && c.userId !== userId
    );

  return (
    <div style={{ padding: '16px', background: '#FAFAFA', minHeight: '100%' }}>
      {paragraphs.map((para, index) => {
        const isEditing = editingIndex === index;
        const isLockedByOther = para.lockedBy !== null && para.lockedBy !== userId;
        const hasConflict = para.conflict !== null && !para.conflict.resolved;
        const otherCursors = cursorsInParagraph(index);

        return (
          <div
            key={para.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            style={{
              position: 'relative',
              marginBottom: '12px',
              borderRadius: '8px',
              background: '#FFFFFF',
              boxShadow: '2px 2px 2px #E0E0E0',
              border: hasConflict
                ? '2px solid #E74C3C'
                : isEditing
                ? '1.5px solid #3498DB'
                : '1px solid transparent',
              padding: '12px 16px 12px 40px',
              opacity: dragOverIndex === index ? 0.7 : 1,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'grab',
                color: '#BDC3C7',
                fontSize: '18px',
                userSelect: 'none',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              ⠿
            </div>

            <textarea
              ref={(el) => {
                if (el) textareaRefs.current.set(index, el);
              }}
              value={para.content}
              onChange={(e) => handleParagraphChange(index, e.target.value)}
              onFocus={() => handleParagraphFocus(index)}
              onBlur={() => handleParagraphBlur(index)}
              disabled={isLockedByOther}
              placeholder="输入段落内容..."
              style={{
                width: '100%',
                minHeight: '60px',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                fontSize: '15px',
                lineHeight: '1.7',
                color: '#333',
                background: 'transparent',
                fontFamily: 'inherit',
              }}
            />

            {otherCursors.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  right: '-8px',
                  top: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {otherCursors.map((c) => (
                  <div
                    key={c.userId}
                    style={{
                      background: c.color,
                      color: '#fff',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      animation: 'pulse 2s infinite',
                    }}
                  >
                    {c.userName}
                  </div>
                ))}
              </div>
            )}

            {isLockedByOther && para.lockedByName && (
              <div
                style={{
                  position: 'absolute',
                  right: '-8px',
                  top: '4px',
                  background: '#F39C12',
                  color: '#fff',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                }}
              >
                {para.lockedByName} 编辑中
              </div>
            )}

            {hasConflict && para.conflict?.conflict && (
              <div style={{ marginTop: '8px', borderTop: '1px solid #E0E0E0', paddingTop: '8px' }}>
                <div style={{ fontSize: '13px', color: '#E74C3C', fontWeight: 600, marginBottom: '6px' }}>
                  ⚠ 冲突检测 - 请选择保留版本
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div
                    onClick={() =>
                      handleConflictResolve(
                        index,
                        para.conflict!.conflict!.versionA,
                        para.conflict!.conflict!.versionB
                      )
                    }
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '8px',
                      border: '1px solid #3498DB',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      background: '#EBF5FB',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#3498DB' }}>
                      版本A - {para.conflict.conflict.versionA.authorName}
                    </div>
                    <div style={{ color: '#555', whiteSpace: 'pre-wrap' }}>
                      {para.conflict.conflict.versionA.content.substring(0, 200)}
                      {para.conflict.conflict.versionA.content.length > 200 ? '...' : ''}
                    </div>
                  </div>
                  <div
                    onClick={() =>
                      handleConflictResolve(
                        index,
                        para.conflict!.conflict!.versionB,
                        para.conflict!.conflict!.versionA
                      )
                    }
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '8px',
                      border: '1px solid #E67E22',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      background: '#FEF5E7',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#E67E22' }}>
                      版本B - {para.conflict.conflict.versionB.authorName}
                    </div>
                    <div style={{ color: '#555', whiteSpace: 'pre-wrap' }}>
                      {para.conflict.conflict.versionB.content.substring(0, 200)}
                      {para.conflict.conflict.versionB.content.length > 200 ? '...' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Editor;
