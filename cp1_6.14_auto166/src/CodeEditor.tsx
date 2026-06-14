import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import {
  User,
  CursorState,
  CursorPosition,
  SelectionRange,
} from './cursor-sync';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onCursorChange: (position: CursorPosition, selection: SelectionRange | null) => void;
  onSelectionChange: (selection: SelectionRange | null, position: CursorPosition) => void;
  remoteCursors: Map<string, CursorState>;
  users: User[];
  onAutoSave?: () => void;
  lineHeightPx?: number;
  charWidthPx?: number;
  paddingTopPx?: number;
  paddingLeftPx?: number;
  gutterPaddingPx?: number;
}

interface RemoteCursorRender {
  userId: string;
  user: User;
  top: number;
  left: number;
  height: number;
  labelTop: number;
}

interface RemoteSelectionRender {
  userId: string;
  user: User;
  rects: Array<{ top: number; left: number; width: number; height: number }>;
}

interface LineInfo {
  lineNumber: number;
  dots: Array<{ userId: string; color: string; offset: number }>;
}

const DEFAULT_LINE_HEIGHT = 22.4;
const DEFAULT_CHAR_WIDTH = 8.4;
const DEFAULT_PADDING_TOP = 24;
const DEFAULT_PADDING_LEFT = 24;
const GUTTER_WIDTH = 50;
const GUTTER_PADDING_RIGHT = 12;
const CURSOR_WIDTH = 2;
const LABEL_HEIGHT = 16;
const DOT_SIZE = 6;
const DOT_SPACING = 10;

const getCharWidthFromCanvas = (font: string): number => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = font;
      const metrics = ctx.measureText('A'.repeat(100));
      return metrics.width / 100;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CHAR_WIDTH;
};

const getLineHeightFromFont = (fontSize: string, fontFamily: string): number => {
  try {
    const probe = document.createElement('div');
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    probe.style.fontSize = fontSize;
    probe.style.fontFamily = fontFamily;
    probe.style.lineHeight = '1.6';
    probe.innerHTML = 'Ag';
    document.body.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);
    return height;
  } catch {
    return DEFAULT_LINE_HEIGHT;
  }
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onCursorChange,
  onSelectionChange,
  remoteCursors,
  users,
  onAutoSave,
  lineHeightPx,
  charWidthPx,
  paddingTopPx,
  paddingLeftPx,
  gutterPaddingPx,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureLayerRef = useRef<HTMLDivElement>(null);
  const scrollLayerRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [measuredCharWidth, setMeasuredCharWidth] = useState(charWidthPx ?? DEFAULT_CHAR_WIDTH);
  const [measuredLineHeight, setMeasuredLineHeight] = useState(lineHeightPx ?? DEFAULT_LINE_HEIGHT);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [editorReady, setEditorReady] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastThrottleRef = useRef<number>(0);

  const LINE_HEIGHT = lineHeightPx ?? measuredLineHeight;
  const CHAR_WIDTH = charWidthPx ?? measuredCharWidth;
  const PADDING_TOP = paddingTopPx ?? DEFAULT_PADDING_TOP;
  const PADDING_LEFT = paddingLeftPx ?? DEFAULT_PADDING_LEFT;
  const GUTTER_PADDING = gutterPaddingPx ?? GUTTER_PADDING_RIGHT;
  const CONTENT_OFFSET_LEFT = GUTTER_WIDTH + PADDING_LEFT;

  useLayoutEffect(() => {
    const font = "14px 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace";
    const fontFamily = "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace";
    const cw = charWidthPx ?? getCharWidthFromCanvas(font);
    const lh = lineHeightPx ?? getLineHeightFromFont('14px', fontFamily);
    setMeasuredCharWidth(cw);
    setMeasuredLineHeight(lh);

    const timeoutId = setTimeout(() => setEditorReady(true), 30);
    return () => clearTimeout(timeoutId);
  }, [charWidthPx, lineHeightPx]);

  const lines = useMemo(() => {
    const split = code.split('\n');
    return split.length === 0 ? [''] : split;
  }, [code]);

  const lineCount = lines.length;
  const maxLineDigits = Math.max(2, String(lineCount).length);

  const indexToPosition = useCallback(
    (index: number): CursorPosition => {
      if (index <= 0) return { line: 1, column: 1 };
      const textBefore = code.slice(0, index);
      const lfCount = (textBefore.match(/\n/g) || []).length;
      const line = lfCount + 1;
      const lastNl = textBefore.lastIndexOf('\n');
      const column = lastNl === -1 ? index + 1 : index - lastNl;
      return { line, column };
    },
    [code]
  );

  const _positionToIndex = useCallback(
    (pos: CursorPosition): number => {
      if (pos.line <= 1) {
        return Math.max(0, pos.column - 1);
      }
      let lineStart = 0;
      let linesFound = 1;
      for (let i = 0; i < code.length && linesFound < pos.line; i++) {
        if (code[i] === '\n') {
          linesFound++;
          lineStart = i + 1;
        }
      }
      return lineStart + Math.max(0, pos.column - 1);
    },
    [code]
  );

  const getSelectionRange = useCallback(
    (textarea: HTMLTextAreaElement): SelectionRange | null => {
      const { selectionStart, selectionEnd, selectionDirection } = textarea;
      if (selectionStart === selectionEnd) return null;
      const direction: SelectionRange['direction'] =
        selectionDirection === 'forward'
          ? 'forward'
          : selectionDirection === 'backward'
            ? 'backward'
            : 'none';
      return {
        start: indexToPosition(selectionStart),
        end: indexToPosition(selectionEnd),
        direction,
      };
    },
    [indexToPosition]
  );

  const broadcastState = useCallback(
    (textarea: HTMLTextAreaElement, force = false) => {
      const now = performance.now();
      if (!force && now - broadcastThrottleRef.current < 15) return;
      broadcastThrottleRef.current = now;

      const position = indexToPosition(textarea.selectionEnd);
      const selection = getSelectionRange(textarea);

      if (selection) {
        onSelectionChange(selection, position);
      } else {
        onCursorChange(position, null);
      }
    },
    [indexToPosition, getSelectionRange, onCursorChange, onSelectionChange]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      broadcastState(ta, false);
    },
    [broadcastState]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      setTimeout(() => broadcastState(ta, true), 0);
    },
    [broadcastState]
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      broadcastState(ta, true);
    },
    [broadcastState]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newCode = e.target.value;
      onChange(newCode);
      broadcastState(e.currentTarget, true);

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
    },
    [onChange, onAutoSave, broadcastState]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      setScrollTop(ta.scrollTop);
      setScrollLeft(ta.scrollLeft);
    },
    []
  );

  useEffect(() => {
    if (textareaRef.current && scrollLayerRef.current && editorContainerRef.current) {
      const editor = editorContainerRef.current;
      const resizeObserver = new ResizeObserver(() => {
        if (textareaRef.current && scrollLayerRef.current) {
          scrollLayerRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      });
      resizeObserver.observe(editor);
      return () => resizeObserver.disconnect();
    }
  }, [editorReady]);

  const columnToPixelX = useCallback(
    (lineIndex: number, columnZeroBased: number): number => {
      const line = lines[lineIndex] || '';
      const actualCol = Math.min(Math.max(0, columnZeroBased), line.length);
      const preText = line.slice(0, actualCol);
      let tabAdjusted = 0;
      for (const ch of preText) {
        if (ch === '\t') {
          tabAdjusted += (8 - (tabAdjusted % 8)) || 8;
        } else {
          tabAdjusted++;
        }
      }
      return CONTENT_OFFSET_LEFT + tabAdjusted * CHAR_WIDTH - scrollLeft;
    },
    [lines, CHAR_WIDTH, scrollLeft, CONTENT_OFFSET_LEFT]
  );

  const lineToPixelY = useCallback(
    (lineOneBased: number): number => {
      return PADDING_TOP + (lineOneBased - 1) * LINE_HEIGHT - scrollTop;
    },
    [LINE_HEIGHT, PADDING_TOP, scrollTop]
  );

  const remoteCursorRenders = useMemo((): RemoteCursorRender[] => {
    const result: RemoteCursorRender[] = [];
    if (!editorReady) return result;

    remoteCursors.forEach((state, userId) => {
      if (!state.position) return;
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const lineIdx = Math.min(Math.max(0, state.position.line - 1), lines.length - 1);
      const col = state.position.column - 1;
      const top = lineToPixelY(state.position.line);
      const left = columnToPixelX(lineIdx, col);
      const height = LINE_HEIGHT;
      const labelTop = top - LABEL_HEIGHT;

      result.push({ userId, user, top, left, height, labelTop });
    });

    return result;
  }, [remoteCursors, users, lines, lineToPixelY, columnToPixelX, LINE_HEIGHT, editorReady]);

  const remoteSelectionRenders = useMemo((): RemoteSelectionRender[] => {
    const result: RemoteSelectionRender[] = [];
    if (!editorReady) return result;

    remoteCursors.forEach((state, userId) => {
      if (!state.selection) return;
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const { start, end } = state.selection;
      const startLine = Math.min(Math.max(1, start.line), lines.length);
      const endLine = Math.min(Math.max(1, end.line), lines.length);
      const minLine = Math.min(startLine, endLine);
      const maxLine = Math.max(startLine, endLine);

      const rects: RemoteSelectionRender['rects'] = [];

      for (let ln = minLine; ln <= maxLine; ln++) {
        const line = lines[ln - 1] || '';
        const isStartLine = ln === startLine;
        const isEndLine = ln === endLine;
        const isSingleLine = minLine === maxLine;

        let startCol: number;
        let endCol: number;

        if (isSingleLine) {
          startCol = Math.min(start.column, end.column) - 1;
          endCol = Math.max(start.column, end.column) - 1;
        } else if (isStartLine) {
          const otherIsBefore = endLine < startLine;
          startCol = otherIsBefore ? 0 : start.column - 1;
          endCol = otherIsBefore ? end.column - 1 : line.length;
        } else if (isEndLine) {
          const otherIsBefore = startLine < endLine;
          startCol = otherIsBefore ? 0 : end.column - 1;
          endCol = otherIsBefore ? end.column - 1 : line.length;
        } else {
          startCol = 0;
          endCol = line.length;
        }

        startCol = Math.max(0, startCol);
        endCol = Math.min(line.length, Math.max(startCol, endCol));

        const top = lineToPixelY(ln);
        const left = columnToPixelX(ln - 1, startCol);
        const width = Math.max(
          2,
          columnToPixelX(ln - 1, endCol) - columnToPixelX(ln - 1, startCol)
        );

        rects.push({ top, left, width, height: LINE_HEIGHT });
      }

      result.push({ userId, user, rects });
    });

    return result;
  }, [
    remoteCursors,
    users,
    lines,
    lineToPixelY,
    columnToPixelX,
    LINE_HEIGHT,
    editorReady,
  ]);

  const lineInfos = useMemo((): LineInfo[] => {
    const byLine: Map<number, Array<{ userId: string; color: string }>> = new Map();
    remoteCursors.forEach((state, userId) => {
      const user = users.find((u) => u.id === userId);
      if (!user || !state.position) return;
      const ln = state.position.line;
      if (!byLine.has(ln)) byLine.set(ln, []);
      byLine.get(ln)!.push({ userId, color: user.color });
    });

    const infos: LineInfo[] = [];
    for (let i = 1; i <= lineCount; i++) {
      const dots = byLine.get(i) || [];
      const withOffset = dots.map((d, idx) => ({ ...d, offset: idx }));
      infos.push({ lineNumber: i, dots: withOffset });
    }
    return infos;
  }, [remoteCursors, users, lineCount]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const preFontStyle: React.CSSProperties = {
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    whiteSpace: 'pre',
    wordBreak: 'normal',
    overflowWrap: 'normal',
  };

  return (
    <div
      className="code-editor-container"
      ref={editorContainerRef}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div
        className="code-editor-wrapper"
        style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}
      >
        <div
          className="line-numbers"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: GUTTER_WIDTH,
            padding: `${PADDING_TOP}px ${GUTTER_PADDING}px`,
            background: '#1e293b',
            borderRight: '1px solid #334155',
            zIndex: 5,
            overflow: 'hidden',
            pointerEvents: 'none',
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
          }}
        >
          {lineInfos.map((info) => (
            <div
              key={info.lineNumber}
              className="line-number"
              style={{
                position: 'relative',
                height: LINE_HEIGHT,
                lineHeight: `${LINE_HEIGHT}px`,
                fontSize: '14px',
                color: '#64748b',
                textAlign: 'right',
                paddingRight: `${maxLineDigits * 2}px`,
                whiteSpace: 'nowrap',
              }}
            >
              {String(info.lineNumber).padStart(maxLineDigits, '\u00a0')}
              {info.dots.map((dot) => (
                <span
                  key={`dot-${info.lineNumber}-${dot.userId}`}
                  className="line-number-dot"
                  style={{
                    position: 'absolute',
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: '50%',
                    backgroundColor: dot.color,
                    top: '50%',
                    marginTop: -(DOT_SIZE / 2),
                    right: `${GUTTER_PADDING - DOT_SIZE - 2 - dot.offset * DOT_SPACING}px`,
                    boxShadow: `0 0 4px ${dot.color}`,
                    transition: 'all 0.15s ease',
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div
          ref={scrollLayerRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {remoteSelectionRenders.map((render) =>
            render.rects.map((rect, idx) => (
              <div
                key={`sel-${render.userId}-${idx}`}
                className="remote-selection"
                style={{
                  position: 'absolute',
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                  backgroundColor: render.user.color,
                  opacity: 0.25,
                  borderRadius: 2,
                  transition: 'all 0.15s ease',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
            ))
          )}

          <div
            ref={measureLayerRef}
            style={{
              position: 'absolute',
              visibility: 'hidden',
              left: CONTENT_OFFSET_LEFT,
              top: PADDING_TOP,
              right: PADDING_LEFT,
              zIndex: 0,
              ...preFontStyle,
            }}
            aria-hidden
          >
            {lines.map((ln, i) => (
              <div key={i} style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}>
                {ln || '\u200b'}
              </div>
            ))}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onSelect={handleSelect}
          onClick={handleMouseUp}
          onScroll={handleScroll}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          wrap="off"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            padding: `${PADDING_TOP}px ${PADDING_LEFT}px ${PADDING_TOP}px ${CONTENT_OFFSET_LEFT}px`,
            background: 'transparent',
            color: '#e2e8f0',
            border: 'none',
            outline: 'none',
            resize: 'none',
            zIndex: 3,
            overflow: 'auto',
            scrollbarWidth: 'thin',
            ...preFontStyle,
          }}
        />

        <div
          className="other-cursors-layer"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          {remoteCursorRenders.map((cursor) => (
            <div
              key={`cursor-line-${cursor.userId}`}
              style={{
                position: 'absolute',
                top: cursor.top,
                left: cursor.left,
                width: CURSOR_WIDTH,
                height: cursor.height,
                backgroundColor: cursor.user.color,
                boxShadow: `0 0 6px ${cursor.user.color}`,
                transition: 'all 0.15s ease',
                zIndex: 10,
              }}
            >
              <div
                className="remote-cursor-label"
                style={{
                  position: 'absolute',
                  top: -LABEL_HEIGHT,
                  left: 0,
                  height: LABEL_HEIGHT,
                  lineHeight: `${LABEL_HEIGHT}px`,
                  padding: '0 6px',
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: cursor.user.color,
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  transform: 'translateX(-50%)',
                  transformOrigin: 'left bottom',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  letterSpacing: 0.3,
                }}
              >
                {cursor.user.nickname}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 20,
        }}
      >
        <span className={`save-status ${saveStatus}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            className={`status-dot ${saveStatus}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: saveStatus === 'saved' ? '#10b981' : '#64748b',
              transition: 'background-color 0.3s',
            }}
          />
          <span style={{ fontSize: 12, color: saveStatus === 'saved' ? '#10b981' : '#64748b' }}>
            {saveStatus === 'saved' ? '已自动保存' : '保存中...'}
          </span>
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#475569',
            paddingLeft: 8,
            borderLeft: '1px solid #334155',
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          }}
        >
          行 {lineCount} · 字符 {code.length}
        </span>
      </div>
    </div>
  );
};

export default CodeEditor;
