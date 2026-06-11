import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { socketService } from '../services/socket';

interface RemoteCursor {
  username: string;
  position: number;
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
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleRemoteContentChange = (data: { content: string; userId?: string }) => {
      if (data.userId !== userId) {
        onContentChange(data.content);
      }
    };
    const handleRemoteCursorMove = (data: { userId: string; username: string; position: number; color: string }) => {
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, { username: data.username, position: data.position, color: data.color });
        return next;
      });
    };

    socketService.on('remote-content-change', handleRemoteContentChange);
    socketService.on('remote-cursor-move', handleRemoteCursorMove);

    return () => {
      socketService.off('remote-content-change', handleRemoteContentChange);
      socketService.off('remote-cursor-move', handleRemoteCursorMove);
    };
  }, []);

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
    socketService.sendContentChange(proposalId, value, userId);
    onContentChange(value);
  }, [proposalId, userId, onContentChange]);

  const handleCursorChange = useCallback(() => {
    if (textareaRef.current) {
      socketService.sendCursorMove(proposalId, textareaRef.current.selectionStart);
    }
  }, [proposalId]);

  const lines = content.split('\n');
  const lineCount = lines.length;
  const lineNumberWidth = String(lineCount).length * 10 + 16;

  const getCursorStyle = (position: number): { top: number; left: number } => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    const textBeforeCursor = content.substring(0, position);
    const lineIndex = textBeforeCursor.split('\n').length - 1;
    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const colIndex = position - lastNewline - 1;
    const lineHeight = 21;
    const charWidth = 8.4;
    return {
      top: lineIndex * lineHeight,
      left: colIndex * charWidth + lineNumberWidth + 12,
    };
  };

  const isMobile = windowWidth < 768;

  const renderEditor = () => (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
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
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyUp={handleCursorChange}
          onClick={handleCursorChange}
          style={{
            flex: 1,
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
            tabSize: 2,
          }}
        />
        <div style={{ position: 'absolute', top: 8, left: lineNumberWidth + 12, pointerEvents: 'none' }}>
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
                }}
              >
                <div
                  style={{
                    width: 2,
                    height: 21,
                    background: cursor.color,
                    display: 'inline-block',
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
                  }}
                >
                  {cursor.username}
                </div>
              </div>
            );
          })}
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

  const dividerStyle: React.CSSProperties = {
    width: 4,
    cursor: 'col-resize',
    background: '#ECF0F1',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.15s',
  };

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
            borderBottom: '2px solid #2C3E50',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setActiveTab('editor')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: activeTab === 'editor' ? '#3498DB' : '#ECF0F1',
              color: activeTab === 'editor' ? '#fff' : '#2C3E50',
              fontWeight: activeTab === 'editor' ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: activeTab === 'preview' ? '#3498DB' : '#ECF0F1',
              color: activeTab === 'preview' ? '#fff' : '#2C3E50',
              fontWeight: activeTab === 'preview' ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Preview
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
          style={dividerStyle}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 1,
              width: 2,
              height: '100%',
              background: 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '#3498DB';
            }}
            onMouseLeave={(e) => {
              if (!isDragging) {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }
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
