import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github_dark';
import 'ace-builds/src-noconflict/ext-language_tools';
import { useWebSocket, User, CursorPosition, TextOperation } from './useWebSocket';

interface CollaborativeEditorProps {
  roomId: string;
  userId: string;
  username: string;
  role: string;
  language?: 'javascript' | 'python';
  onLanguageChange?: (language: 'javascript' | 'python') => void;
  onCodeChange?: (code: string) => void;
}

type Language = 'javascript' | 'python';
type Theme = 'monokai' | 'github_dark';

function computeDiff(oldText: string, newText: string): TextOperation[] {
  const operations: TextOperation[] = [];
  if (oldText === newText) return operations;

  const maxLen = Math.max(oldText.length, newText.length);
  let start = 0;

  while (start < maxLen && oldText[start] === newText[start]) {
    start++;
  }

  let oldEnd = oldText.length;
  let newEnd = newText.length;

  while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const deleteLength = oldEnd - start;
  const insertText = newText.slice(start, newEnd);

  if (deleteLength > 0) {
    operations.push({
      type: 'delete',
      position: start,
      length: deleteLength,
      timestamp: Date.now(),
    });
  }

  if (insertText.length > 0) {
    operations.push({
      type: 'insert',
      position: start,
      text: insertText,
      timestamp: Date.now(),
    });
  }

  return operations;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e',
];

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  roomId,
  userId,
  username,
  role,
  language: externalLanguage,
  onLanguageChange,
  onCodeChange,
}) => {
  const {
    users,
    document,
    remoteCursors,
    isConnected,
    sendOp,
    sendCursor,
    joinRoom,
    leaveRoom,
    setDocument,
  } = useWebSocket();

  const [internalLanguage, setInternalLanguage] = useState<Language>(externalLanguage || 'javascript');
  const [theme] = useState<Theme>('monokai');

  const language = externalLanguage || internalLanguage;

  useEffect(() => {
    if (externalLanguage && externalLanguage !== internalLanguage) {
      setInternalLanguage(externalLanguage);
    }
  }, [externalLanguage, internalLanguage]);
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevDocumentRef = useRef<string>('');
  const isApplyingRemoteRef = useRef<boolean>(false);
  const pendingOpsRef = useRef<TextOperation[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  const lastRemoteDocRef = useRef<string>('');
  const [, forceRender] = useState(0);

  const currentUser: User = useMemo(() => ({
    id: userId,
    username,
    role,
    color: pickColor(userId),
  }), [userId, username, role]);

  useEffect(() => {
    joinRoom(roomId, currentUser);
    return () => {
      leaveRoom(roomId, userId);
    };
  }, [roomId, currentUser, userId, joinRoom, leaveRoom]);

  useEffect(() => {
    if (isApplyingRemoteRef.current) return;
    if (document === prevDocumentRef.current) return;
    if (document === lastRemoteDocRef.current) return;

    isApplyingRemoteRef.current = true;
    lastRemoteDocRef.current = document;
    try {
      const editor = editorRef.current?.editor;
      if (editor) {
        const session = editor.session;
        const currentValue = session.getValue();
        if (currentValue !== document) {
          const cursor = editor.getCursorPosition();
          const currentDoc = currentValue;
          const newDoc = document;

          if (currentDoc.length === 0 || Math.abs(currentDoc.length - newDoc.length) > 100) {
            session.setValue(newDoc);
          } else {
            const ops = computeDiff(currentDoc, newDoc);
            for (const op of ops) {
              if (op.type === 'insert' && op.text !== undefined) {
                const pos = session.document.indexToPosition(op.position);
                session.insert(pos, op.text);
              } else if (op.type === 'delete' && op.length !== undefined) {
                const startPos = session.document.indexToPosition(op.position);
                const endPos = session.document.indexToPosition(op.position + op.length);
                const range = {
                  start: startPos,
                  end: endPos,
                };
                session.remove(range);
              }
            }
          }
          editor.moveCursorToPosition(cursor);
          editor.clearSelection();
          prevDocumentRef.current = session.getValue();
        }
      }
    } finally {
      isApplyingRemoteRef.current = false;
    }
  }, [document]);

  const onChange = useCallback(
    (newValue: string) => {
      if (isApplyingRemoteRef.current) {
        prevDocumentRef.current = newValue;
        return;
      }

      const oldValue = prevDocumentRef.current;
      const diffs = computeDiff(oldValue, newValue);

      for (const diff of diffs) {
        pendingOpsRef.current.push(diff);
      }

      prevDocumentRef.current = newValue;
      setDocument(newValue);
      if (onCodeChange) {
        onCodeChange(newValue);
      }

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        while (pendingOpsRef.current.length > 0) {
          const op = pendingOpsRef.current.shift()!;
          sendOp(roomId, {
            type: op.type,
            position: op.position,
            text: op.text,
            length: op.length,
            timestamp: op.timestamp,
            userId,
          });
        }
      }, 10);
    },
    [roomId, userId, sendOp, setDocument]
  );

  const onCursorChange = useCallback(
    (selection: any) => {
      const cursor = selection.getCursor();
      const cursorPos: CursorPosition = {
        row: cursor.row,
        column: cursor.column,
        position: 0,
      };
      sendCursor(roomId, {
        ...cursorPos,
        userId,
      });
    },
    [roomId, userId, sendCursor]
  );

  const onLoad = useCallback(
    (editor: any) => {
      editorRef.current = { editor };
      editor.session.setValue(prevDocumentRef.current || document || '');
      prevDocumentRef.current = editor.session.getValue();
      editor.selection.on('changeCursor', () => onCursorChange(editor.selection));

      const intervalId = window.setInterval(() => {
        forceRender((n) => n + 1);
      }, 100);

      editor.on('destroy', () => {
        window.clearInterval(intervalId);
      });
    },
    [document, onCursorChange]
  );

  const renderRemoteCursors = () => {
    const editor = editorRef.current?.editor;
    const container = containerRef.current;
    if (!editor || !container) return null;

    const renderer = editor.renderer;
    const cursors: React.ReactNode[] = [];
    const containerRect = container.getBoundingClientRect();

    remoteCursors.forEach((cursor, uid) => {
      if (uid === userId) return;

      const user = users.find((u) => u.id === uid);
      if (!user) return;

      try {
        const screenCoords = renderer.textToScreenCoordinates(cursor.row, cursor.column);
        if (!screenCoords) return;

        const color = user.color || pickColor(uid);
        const top = screenCoords.pageY - containerRect.top;
        const left = screenCoords.pageX - containerRect.left;

        cursors.push(
          <div
            key={uid}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: `${left}px`,
              pointerEvents: 'none',
              zIndex: 10,
              transition: 'top 0.1s ease, left 0.1s ease',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: color,
                marginBottom: '2px',
              }}
            />
            <div
              style={{
                position: 'relative',
                left: '6px',
                top: '-4px',
                padding: '1px 6px',
                backgroundColor: color,
                color: 'white',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                borderRadius: '3px',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {user.username}
            </div>
          </div>
        );
      } catch (e) {
        // ignore invalid cursor positions
      }
    });

    return cursors;
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const mode = language === 'javascript' ? 'javascript' : 'python';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#2d2d2d',
          borderBottom: '1px solid #404040',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              backgroundColor: '#374151',
              borderRadius: '6px',
              color: '#d1d5db',
              fontSize: '14px',
            }}
          >
            <span style={{ marginRight: '6px', opacity: 0.7 }}>房间:</span>
            <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{roomId}</span>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              backgroundColor: isConnected ? '#064e3b' : '#7f1d1d',
              borderRadius: '6px',
              color: isConnected ? '#86efac' : '#fca5a5',
              fontSize: '14px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#22c55e' : '#ef4444',
                marginRight: '8px',
              }}
            />
            {isConnected ? '已连接' : '未连接'}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              backgroundColor: '#1e3a8a',
              borderRadius: '6px',
              color: '#93c5fd',
              fontSize: '14px',
            }}
          >
            <span style={{ marginRight: '6px', opacity: 0.7 }}>在线:</span>
            <span style={{ fontWeight: 600 }}>{users.length} 人</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ color: '#9ca3af', fontSize: '14px' }}>语言:</label>
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value as Language;
                if (!externalLanguage) {
                  setInternalLanguage(newLang);
                }
                if (onLanguageChange) {
                  onLanguageChange(newLang);
                }
              }}
              style={{
                padding: '4px 10px',
                backgroundColor: '#374151',
                color: '#f3f4f6',
                border: '1px solid #4b5563',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {users.map((u) => (
              <div
                key={u.id}
                title={u.username}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: u.color || pickColor(u.id),
                  border: u.id === userId ? '2px solid white' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                {u.username.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
      >
        <AceEditor
          mode={mode}
          theme={theme}
          onChange={onChange}
          onLoad={onLoad}
          name={`collab-editor-${roomId}`}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
            useWorker: false,
          }}
          style={{ width: '100%', height: '100%' }}
          fontSize={14}
          showPrintMargin={false}
        />
        {renderRemoteCursors()}
      </div>
    </div>
  );
};

export default CollaborativeEditor;
