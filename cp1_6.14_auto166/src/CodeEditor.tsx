import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  CursorState,
  CursorPosition,
  Selection,
} from './cursor-sync';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onCursorChange: (position: CursorPosition, selection: Selection | null) => void;
  remoteCursors: Map<string, CursorState>;
  users: User[];
  onAutoSave?: () => void;
}

interface RemoteCursorDisplay {
  userId: string;
  user: User | undefined;
  top: number;
  left: number;
  height: number;
}

interface RemoteSelectionDisplay {
  userId: string;
  user: User | undefined;
  top: number;
  left: number;
  width: number;
  height: number;
}

const LINE_HEIGHT = 22.4;
const CHAR_WIDTH = 8.4;
const PADDING_TOP = 24;
const PADDING_LEFT = 74;

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onCursorChange,
  remoteCursors,
  users,
  onAutoSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = useMemo(() => code.split('\n'), [code]);
  const lineCount = lines.length;

  const getCaretPosition = useCallback((textarea: HTMLTextAreaElement): CursorPosition => {
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { line, column };
  }, []);

  const getSelection = useCallback((textarea: HTMLTextAreaElement): Selection | null => {
    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart === selectionEnd) return null;

    const getPos = (index: number): CursorPosition => {
      const textBefore = value.substring(0, index);
      const lines = textBefore.split('\n');
      return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
      };
    };

    return {
      start: getPos(selectionStart),
      end: getPos(selectionEnd),
    };
  }, []);

  const handleKeyUp = useCallback(() => {
    if (!textareaRef.current) return;
    const position = getCaretPosition(textareaRef.current);
    const selection = getSelection(textareaRef.current);
    onCursorChange(position, selection);
  }, [getCaretPosition, getSelection, onCursorChange]);

  const handleClick = useCallback(() => {
    if (!textareaRef.current) return;
    const position = getCaretPosition(textareaRef.current);
    const selection = getSelection(textareaRef.current);
    onCursorChange(position, selection);
  }, [getCaretPosition, getSelection, onCursorChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    onChange(newCode);

    setSaveStatus('saving');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('codecanvas-code', newCode);
        setSaveStatus('saved');
        onAutoSave?.();
      } catch {
        setSaveStatus('saved');
      }
    }, 3000);
  }, [onChange, onAutoSave]);

  const calculateCursorPosition = useCallback((cursorState: CursorState): RemoteCursorDisplay | null => {
    const { position, userId } = cursorState;
    const user = users.find(u => u.id === userId);

    if (position.line < 1 || position.line > lineCount) return null;

    const lineText = lines[position.line - 1] || '';
    const column = Math.min(position.column - 1, lineText.length);

    const top = PADDING_TOP + (position.line - 1) * LINE_HEIGHT;
    const left = PADDING_LEFT + column * CHAR_WIDTH;
    const height = LINE_HEIGHT;

    return { userId, user, top, left, height };
  }, [lines, lineCount, users]);

  const calculateSelectionPosition = useCallback((cursorState: CursorState): RemoteSelectionDisplay | null => {
    const { selection, userId } = cursorState;
    if (!selection) return null;

    const user = users.find(u => u.id === userId);
    const { start, end } = selection;

    if (start.line === end.line) {
      if (start.line < 1 || start.line > lineCount) return null;
      const lineText = lines[start.line - 1] || '';
      const startCol = Math.min(start.column - 1, lineText.length);
      const endCol = Math.min(end.column - 1, lineText.length);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      return {
        userId,
        user,
        top: PADDING_TOP + (start.line - 1) * LINE_HEIGHT,
        left: PADDING_LEFT + minCol * CHAR_WIDTH,
        width: (maxCol - minCol) * CHAR_WIDTH,
        height: LINE_HEIGHT,
      };
    } else {
      const minLine = Math.min(start.line, end.line);
      const maxLine = Math.max(start.line, end.line);
      if (minLine < 1 || maxLine > lineCount) return null;

      return {
        userId,
        user,
        top: PADDING_TOP + (minLine - 1) * LINE_HEIGHT,
        left: PADDING_LEFT,
        width: 500,
        height: (maxLine - minLine + 1) * LINE_HEIGHT,
      };
    }
  }, [lines, lineCount, users]);

  const remoteCursorDisplays = useMemo(() => {
    const displays: RemoteCursorDisplay[] = [];
    remoteCursors.forEach((cursorState) => {
      const display = calculateCursorPosition(cursorState);
      if (display) {
        displays.push(display);
      }
    });
    return displays;
  }, [remoteCursors, calculateCursorPosition]);

  const remoteSelectionDisplays = useMemo(() => {
    const displays: RemoteSelectionDisplay[] = [];
    remoteCursors.forEach((cursorState) => {
      const display = calculateSelectionPosition(cursorState);
      if (display) {
        displays.push(display);
      }
    });
    return displays;
  }, [remoteCursors, calculateSelectionPosition]);

  const lineNumberDots = useMemo(() => {
    const dots: Map<number, string[]> = new Map();
    remoteCursors.forEach((cursorState, userId) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        const line = cursorState.position.line;
        if (!dots.has(line)) {
          dots.set(line, []);
        }
        dots.get(line)!.push(user.color);
      }
    });
    return dots;
  }, [remoteCursors, users]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="code-editor-container" ref={containerRef}>
      <div className="code-editor-wrapper">
        <div className="line-numbers">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="line-number">
              {i + 1}
              {lineNumberDots.get(i + 1)?.map((color, idx) => (
                <span
                  key={idx}
                  className="line-number-dot"
                  style={{
                    backgroundColor: color,
                    left: `${-14 - idx * 10}px`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onSelect={handleClick}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        <div className="code-highlight-layer">
          {remoteSelectionDisplays.map((sel, idx) => (
            <div
              key={`selection-${sel.userId}-${idx}`}
              className="remote-selection"
              style={{
                top: sel.top,
                left: sel.left,
                width: sel.width,
                height: sel.height,
                backgroundColor: sel.user?.color || '#3b82f6',
              }}
            />
          ))}
        </div>

        <div className="other-cursors-layer">
          {remoteCursorDisplays.map((cursor, idx) => (
            <div
              key={`cursor-${cursor.userId}-${idx}`}
              className="remote-cursor"
              style={{
                top: cursor.top,
                left: cursor.left,
                height: cursor.height,
                backgroundColor: cursor.user?.color || '#3b82f6',
              }}
            >
              <div
                className="remote-cursor-label"
                style={{
                  backgroundColor: cursor.user?.color || '#3b82f6',
                }}
              >
                {cursor.user?.nickname || '匿名用户'}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span className={`save-status ${saveStatus}`}>
          <span className={`status-dot ${saveStatus}`} />
          {saveStatus === 'saved' ? '已自动保存' : '保存中...'}
        </span>
      </div>
    </div>
  );
};
