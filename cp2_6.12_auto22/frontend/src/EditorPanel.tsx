import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MessageSquare, Highlighter, UserPlus } from 'lucide-react';
import { useStore } from './store';
import type { Annotation, Character, RemoteCursor } from './types';
import { v4 as uuidv4 } from 'uuid';
import { getUserColorById } from './utils/colorUtils';

interface SelectionInfo {
  text: string;
  start: number;
  end: number;
  x: number;
  y: number;
}

const EditorPanel: React.FC<{ socket: any }> = ({ socket }) => {
  const project = useStore((s) => s.project);
  const currentChapterId = useStore((s) => s.currentChapterId);
  const updateChapterContent = useStore((s) => s.updateChapterContent);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const addCharacter = useStore((s) => s.addCharacter);
  const conflicts = useStore((s) => s.conflicts);
  const userColor = useStore((s) => s.userColor);
  const userName = useStore((s) => s.userName);
  const userId = useStore((s) => s.userId);
  const remoteCursors = useStore((s) => s.remoteCursors);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [characterBio, setCharacterBio] = useState('');
  const [characterTags, setCharacterTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [pendingSelection, setPendingSelection] = useState<SelectionInfo | null>(null);

  const currentChapter = project?.chapters.find((c) => c.id === currentChapterId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selection) {
        const target = e.target as HTMLElement;
        if (!target.closest('.selection-toolbar')) {
          setSelection(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selection]);

  const currentUserColor = useMemo(() => getUserColorById(userId), [userId]);

  const sendCursorPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea || !socket || !currentChapterId) return;
    socket.emit('cursor-move', {
      projectId: project?.id,
      chapterId: currentChapterId,
      cursor: {
        line: 0,
        column: textarea.selectionStart,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
      },
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    if (currentChapterId) {
      updateChapterContent(currentChapterId, content);
      if (socket) {
        socket.emit('edit', {
          projectId: project?.id,
          chapterId: currentChapterId,
          content,
          cursor: {
            line: 0,
            column: e.target.selectionStart,
            selectionStart: e.target.selectionStart,
            selectionEnd: e.target.selectionEnd,
          },
        });
        sendCursorPosition();
      }
    }
  };

  const handleSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    sendCursorPosition();
    if (start === end) {
      setSelection(null);
      return;
    }
    const text = textarea.value.slice(start, end);
    const rect = textarea.getBoundingClientRect();
    const avgPos = (start + end) / 2;
    const charsBefore = textarea.value.slice(0, avgPos);
    const lines = charsBefore.split('\n');
    const lineHeight = 32;
    const charWidth = 9;
    const y = rect.top + lines.length * lineHeight - textarea.scrollTop;
    const x = rect.left + (lines[lines.length - 1].length * charWidth) % rect.width;
    setSelection({ text, start, end, x, y: y - 48 });
  };

  const getRemoteCursorPosition = (cursor: RemoteCursor) => {
    const textarea = textareaRef.current;
    if (!textarea || !currentChapter) return { x: 0, y: 0 };
    const content = currentChapter.content;
    const position = cursor.cursor.selectionStart || cursor.cursor.column || 0;
    const charsBefore = content.slice(0, position);
    const lines = charsBefore.split('\n');
    const lineHeight = 32;
    const charWidth = 9;
    const y = lines.length * lineHeight - textarea.scrollTop;
    const x = lines[lines.length - 1].length * charWidth;
    return { x, y };
  };

  const currentChapterRemoteCursors = remoteCursors.filter(
    (c) => c.chapterId === currentChapterId
  );

  const handleHighlight = () => {
    if (!selection || !currentChapterId) return;
    const annotation: Annotation = {
      id: uuidv4(),
      chapterId: currentChapterId,
      start: selection.start,
      end: selection.end,
      text: selection.text,
      author: userName,
      color: userColor,
      type: 'highlight',
    };
    addAnnotation(annotation);
    setSelection(null);
  };

  const openCommentModal = () => {
    setPendingSelection(selection);
    setShowCommentModal(true);
    setSelection(null);
    setCommentText('');
  };

  const submitComment = () => {
    if (!pendingSelection || !currentChapterId || !commentText.trim()) return;
    const annotation: Annotation = {
      id: uuidv4(),
      chapterId: currentChapterId,
      start: pendingSelection.start,
      end: pendingSelection.end,
      text: pendingSelection.text,
      author: userName,
      color: userColor,
      type: 'comment',
      commentText,
    };
    addAnnotation(annotation);
    setShowCommentModal(false);
    setPendingSelection(null);
    setCommentText('');
  };

  const openCharacterModal = () => {
    setPendingSelection(selection);
    setShowCharacterModal(true);
    setSelection(null);
    setCharacterBio('');
    setCharacterTags([]);
    setTagInput('');
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim();
      if (tag && characterTags.length < 5 && !characterTags.includes(tag)) {
        setCharacterTags([...characterTags, tag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setCharacterTags(characterTags.filter((t) => t !== tag));
  };

  const submitCharacter = () => {
    if (!pendingSelection) return;
    const character: Character = {
      id: uuidv4(),
      name: pendingSelection.text.trim(),
      bio: characterBio,
      tags: characterTags,
    };
    addCharacter(character);
    setShowCharacterModal(false);
    setPendingSelection(null);
    setCharacterBio('');
    setCharacterTags([]);
  };

  const getHighlightedContent = () => {
    if (!currentChapter) return null;
    const content = currentChapter.content;
    const annotations = project?.annotations.filter(
      (a) => a.chapterId === currentChapterId && a.type === 'highlight'
    ) || [];

    if (annotations.length === 0 && conflicts.length === 0) return null;

    const parts: Array<{ text: string; className?: string }> = [];
    const markers: Array<{ pos: number; type: 'start' | 'end'; className: string }> = [];

    annotations.forEach((a) => {
      markers.push({ pos: a.start, type: 'start', className: 'highlight-range' });
      markers.push({ pos: a.end, type: 'end', className: 'highlight-range' });
    });

    conflicts.forEach((c) => {
      markers.push({ pos: c.start, type: 'start', className: 'conflict-range' });
      markers.push({ pos: c.end, type: 'end', className: 'conflict-range' });
    });

    markers.sort((a, b) => a.pos - b.pos);

    let cursor = 0;
    markers.forEach((m) => {
      if (m.pos > cursor) {
        parts.push({ text: content.slice(cursor, m.pos) });
      }
      if (m.type === 'start') {
        parts.push({ text: content.slice(m.pos, m.pos), className: m.className });
      }
      cursor = m.pos;
    });
    if (cursor < content.length) {
      parts.push({ text: content.slice(cursor) });
    }
    return parts;
  };

  return (
    <div className="editor-wrapper" style={{ borderTop: `2px solid ${currentUserColor}` }}>
      <div className="editor-toolbar">
        <span className="editor-chapter-title">{currentChapter?.title || '未选择章节'}</span>
      </div>
      <div className="editor-container">
        <div className="editor-paper" style={{ borderTop: `2px solid ${currentUserColor}` }}>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            style={{ caretColor: currentUserColor }}
            value={currentChapter?.content || ''}
            onChange={handleTextChange}
            onSelect={handleSelect}
            onMouseUp={handleSelect}
            onKeyUp={handleSelect}
            onClick={sendCursorPosition}
            onKeyDown={sendCursorPosition}
            placeholder="在这里开始你的创作..."
            spellCheck={false}
          />
          {currentChapterRemoteCursors.map((rc) => {
            const pos = getRemoteCursorPosition(rc);
            return (
              <div
                key={rc.userId}
                className="remote-cursor"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  backgroundColor: rc.color,
                }}
              >
                <div className="remote-cursor-label" style={{ backgroundColor: rc.color }}>
                  {rc.userName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selection && (
        <div
          className="selection-toolbar"
          style={{
            left: Math.max(10, Math.min(selection.x - 80, window.innerWidth - 280)),
            top: Math.max(60, selection.y - 50),
          }}
        >
          <button onClick={openCommentModal} className="ripple">
            <MessageSquare size={14} />
            批注
          </button>
          <button onClick={handleHighlight} className="ripple">
            <Highlighter size={14} />
            高亮
          </button>
          <button onClick={openCharacterModal} className="ripple">
            <UserPlus size={14} />
            定义角色
          </button>
        </div>
      )}

      {showCommentModal && (
        <div className="modal-overlay" onClick={() => setShowCommentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">添加批注</h3>
            <div className="modal-form">
              <div className="form-field">
                <label>选中文本</label>
                <div
                  style={{
                    padding: 10,
                    background: 'var(--bg-input)',
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--divider)',
                  }}
                >
                  "{pendingSelection?.text}"
                </div>
              </div>
              <div className="form-field">
                <label>批注内容</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="写下你的想法..."
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary ripple" onClick={() => setShowCommentModal(false)}>
                  取消
                </button>
                <button
                  className="btn btn-primary ripple"
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCharacterModal && (
        <div className="modal-overlay" onClick={() => setShowCharacterModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">定义角色</h3>
            <div className="modal-form">
              <div className="form-field">
                <label>角色名</label>
                <input value={pendingSelection?.text || ''} disabled />
              </div>
              <div className="form-field">
                <label>角色简介</label>
                <textarea
                  value={characterBio}
                  onChange={(e) => setCharacterBio(e.target.value)}
                  placeholder="描述这个角色的背景..."
                />
              </div>
              <div className="form-field">
                <label>性格标签（最多5个，回车添加）</label>
                <div className="tag-input-wrapper">
                  {characterTags.map((tag) => (
                    <span key={tag} className="tag-chip-selected">
                      {tag}
                      <button onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                  {characterTags.length < 5 && (
                    <input
                      className="tag-input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="输入标签..."
                    />
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary ripple" onClick={() => setShowCharacterModal(false)}>
                  取消
                </button>
                <button className="btn btn-primary ripple" onClick={submitCharacter}>
                  保存角色
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
