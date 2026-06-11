import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { socketService } from '../services/socket';

interface CursorPosition {
  line: number;
  column: number;
}

interface RemoteCursor {
  username: string;
  position: number;
  cursorPosition: CursorPosition;
  color: string;
}

interface ProposalEditorProps {
  proposalId: string;
  userId: string;
  username: string;
  userColor: string;
  content: string;
  onContentChange: (content: string) => void;
}

const CURSOR_COLORS = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C', '#3498DB',
  '#9B59B6', '#E91E63', '#00BCD4', '#8BC34A', '#FF9800', '#795548'
];

const ProposalEditor: React.FC<ProposalEditorProps> = ({
  proposalId,
  userId,
  username,
  userColor,
  content,
  onContentChange,
}) => {
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [isDividerHovered, setIsDividerHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const cursorOverlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>(content);
  const isLocalChangeRef = useRef<boolean>(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    lastContentRef.current = content;
  }, [content]);

  const applyRemoteContent = useCallback((newContent: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onContentChange(newContent);
      return;
    }

    const oldContent = lastContentRef.current;
    if (oldContent === newContent) return;

    const savedStart = textarea.selectionStart;
    const savedEnd = textarea.selectionEnd;

    let commonPrefix = 0;
    const minLen = Math.min(oldContent.length, newContent.length);
    while (commonPrefix < minLen && oldContent[commonPrefix] === newContent[commonPrefix]) {
      commonPrefix++;
    }

    let commonSuffix = 0;
    while (commonSuffix < minLen - commonPrefix &&
      oldContent[oldContent.length - 1 - commonSuffix] === newContent[newContent.length - 1 - commonSuffix]) {
      commonSuffix++;
    }

    const removeStart = commonPrefix;
    const removeEnd = oldContent.length - commonSuffix;
    const insertText = newContent.substring(commonPrefix, newContent.length - commonSuffix);

    textarea.focus();
    textarea.setSelectionRange(removeStart, removeEnd);

    if (insertText.length > 0) {
      document.execCommand('insertText', false, insertText);
    } else if (removeStart !== removeEnd) {
      document.execCommand('delete', false);
    }

    const finalContent = textarea.value;
    const lenDiff = newContent.length - oldContent.length;

    let newStart = savedStart;
    let newEnd = savedEnd;

    if (savedStart >= removeEnd) {
      newStart = savedStart + lenDiff;
      newEnd = savedEnd + lenDiff;
    } else if (savedStart > removeStart) {
      const removedBeforeCursor = savedStart - removeStart;
      const insertedBeforeCursor = Math.min(insertText.length, removedBeforeCursor);
      newStart = removeStart + insertedBeforeCursor;
      if (savedEnd >= removeEnd) {
        newEnd = savedEnd + lenDiff;
      } else if (savedEnd > removeStart) {
        newEnd = removeStart + Math.min(insertText.length, savedEnd - removeStart);
      }
    } else {
      if (savedEnd >= removeEnd) {
        newEnd = savedEnd + lenDiff;
      } else if (savedEnd > removeStart) {
        newEnd = removeStart + Math.min(insertText.length, savedEnd - removeStart);
      }
    }

    newStart = Math.max(0, Math.min(newStart, finalContent.length));
    newEnd = Math.max(0, Math.min(newEnd, finalContent.length));

    textarea.setSelectionRange(newStart, newEnd);

    lastContentRef.current = finalContent;
    isLocalChangeRef.current = true;
    onContentChange(finalContent);
    setTimeout(() => { isLocalChangeRef.current = false; }, 0);
  }, [onContentChange]);

  useEffect(() => {
    const handleRemoteContentChange = (data: { content: string; userId?: string }) => {
      if (data.userId !== userId) {
        applyRemoteContent(data.content);
      }
    };
    const handleRemoteCursorMove = (data: { userId: string; username: string; position: number; cursorPosition: CursorPosition; color: string }) => {
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, { username: data.username, position: data.position, cursorPosition: data.cursorPosition, color: data.color });
        return next;
      });
    };

    socketService.on('remote-content-change', handleRemoteContentChange);
    socketService.on('remote-cursor-move', handleRemoteCursorMove);

    return () => {
      socketService.off('remote-content-change', handleRemoteContentChange);
      socketService.off('remote-cursor-move', handleRemoteCursorMove);
    };
  }, [userId, applyRemoteContent]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.min(0.8, Math.max(0.2, newRatio)));
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    lastContentRef.current = value;
    isLocalChangeRef.current = true;
    socketService.sendContentChange(proposalId, value, userId);
    onContentChange(value);
    setTimeout(() => { isLocalChangeRef.current = false; }, 0);
  }, [proposalId, userId, onContentChange]);

  const getLineColumn = (position: number): CursorPosition => {
    const textBeforeCursor = content.substring(0, position);
    const lineIndex = textBeforeCursor.split('\n').length - 1;
    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const colIndex = position - lastNewline - 1;
    return { line: lineIndex + 1, column: colIndex + 1 };
  };

  const handleCursorChange = useCallback(() => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionStart;
      const cursorPosition = getLineColumn(position);
      socketService.sendCursorMove(proposalId, userId, position, cursorPosition);
    }
  }, [proposalId, userId, content]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      setScrollTop(textareaRef.current.scrollTop);
      setScrollLeft(textareaRef.current.scrollLeft);
    }
  }, []);

  const lines = content.split('\n');
  const lineCount = lines.length;
  const lineNumberWidth = String(lineCount).length * 10 + 16;

  const getCursorStyle = (position: number): { top: number; left: number } => {
    const textBeforeCursor = content.substring(0, position);
    const lineIndex = textBeforeCursor.split('\n').length - 1;
    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const colIndex = position - lastNewline - 1;
    const lineHeight = 21;
    const charWidth = 8.4;
    return {
      top: lineIndex * lineHeight,
      left: colIndex * charWidth + 12,
    };
  };

  const isMobile = windowWidth < 768;
  const showDividerIndicator = isDragging || isDividerHovered;

  const renderEditor = () => (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          ref={lineNumbersRef}
          style={{
            width: lineNumberWidth,
            background: '#ECF0F1',
            color: '#7F8C8D',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 13,
            lineHeight: '21px',
            padding: '8px 4px',
            textAlign: 'right',
            userSelect: 'none',
            overflowY: 'hidden',
            overflowX: 'hidden',
            flexShrink: 0,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyUp={handleCursorChange}
            onClick={handleCursorChange}
            onSelect={handleCursorChange}
            onScroll={handleScroll}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 13,
              lineHeight: '21px',
              padding: '8px 12px',
              background: '#fff',
              color: '#2C3E50',
              overflowY: 'auto',
              overflowX: 'auto',
              tabSize: 2,
              whiteSpace: 'pre',
            }}
          />
          <div
            ref={cursorOverlayRef}
            style={{
              position: 'absolute',
              top: 8,
              left: 12,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
                pointerEvents: 'none',
              }}
            >
              {Array.from(remoteCursors.entries()).map(([uid, cursor]) => {
                const pos = getCursorStyle(cursor.position);
                return (
                  <div
                    key={uid}
                    style={{
                      position: 'absolute',
                      top: pos.top,
                      left: pos.left,
                      pointerEvents: 'none',
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 2,
                        height: 21,
                        background: cursor.color,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: -18,
                        left: 0,
                        background: cursor.color,
                        color: '#fff',
                        fontSize: 10,
                        padding: '1px 4px',
                        borderRadius: 2,
                        whiteSpace: 'nowrap',
                        lineHeight: '14px',
                        fontWeight: 500,
                      }}
                    >
                      {cursor.username}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          height: 24,
          background: '#ECF0F1',
          borderTop: '1px solid #BDC3C7',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          fontSize: 12,
          color: '#7F8C8D',
          flexShrink: 0,
        }}
      >
        {textareaRef.current
          ? `Ln ${content.substring(0, textareaRef.current.selectionStart).split('\n').length}, Col ${textareaRef.current.selectionStart - content.substring(0, textareaRef.current.selectionStart).lastIndexOf('\n') - 1}`
          : 'Ln 1, Col 1'}
      </div>
    </div>
  );

  const renderPreview = () => (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px 32px',
        background: '#fff',
      }}
    >
      <div
        className="prose"
        style={{
          color: '#2C3E50',
          lineHeight: 1.7,
          fontSize: 15,
        }}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ECF0F1',
          color: '#2C3E50',
        }}
      >
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #BDC3C7',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setActiveTab('editor')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              background: activeTab === 'editor' ? '#fff' : '#ECF0F1',
              color: activeTab === 'editor' ? '#3498DB' : '#7F8C8D',
              fontWeight: activeTab === 'editor' ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
              borderBottom: activeTab === 'editor' ? '2px solid #3498DB' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            编辑
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              background: activeTab === 'preview' ? '#fff' : '#ECF0F1',
              color: activeTab === 'preview' ? '#3498DB' : '#7F8C8D',
              fontWeight: activeTab === 'preview' ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
              borderBottom: activeTab === 'preview' ? '2px solid #3498DB' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            预览
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'editor' ? renderEditor() : renderPreview()}
        </div>
      </div>
    );
  }

  if (isPreviewFullscreen) {
    return (
      <div
        ref={containerRef}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ECF0F1',
          color: '#2C3E50',
          position: 'relative',
        }}
      >
        <button
          onClick={() => setIsPreviewFullscreen(false)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            background: '#2C3E50',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Exit Fullscreen
        </button>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            background: '#fff',
            animation: 'fadeIn 0.3s ease-in',
          }}
        >
          <div
            className="prose"
            style={{
              color: '#2C3E50',
              lineHeight: 1.7,
              fontSize: 15,
              maxWidth: 800,
              margin: '0 auto',
            }}
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
        <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#ECF0F1',
        color: '#2C3E50',
      }}
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: `${splitRatio * 100}%`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderEditor()}
        </div>
        <div
          style={{
            width: 4,
            cursor: 'col-resize',
            background: '#ECF0F1',
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onMouseEnter={() => setIsDividerHovered(true)}
          onMouseLeave={() => setIsDividerHovered(false)}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 2,
              height: '100%',
              background: showDividerIndicator ? '#3498DB' : 'transparent',
              transition: 'background 0.15s',
            }}
          />
        </div>
        <div
          style={{
            width: `${(1 - splitRatio) * 100}%`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <button
            onClick={() => setIsPreviewFullscreen(true)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 5,
              background: '#2C3E50',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Fullscreen
          </button>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;
