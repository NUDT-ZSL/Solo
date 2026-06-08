import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

const EditorPanel: React.FC = () => {
  const { nickname, roomCode, roomName, roomState, sendEditEvent, sendCodeSnapshot, disconnect } = useApp();
  const [code, setCode] = useState<string>('// 在此编写 JavaScript 代码\nfunction hello() {\n  console.log("Hello, World!");\n}\n');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [glowActive, setGlowActive] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const keyCountRef = useRef<number>(0);
  const lastSendEditRef = useRef<number>(0);
  const lastSendCodeRef = useRef<number>(0);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerGlow = useCallback(() => {
    setGlowActive(true);
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    glowTimerRef.current = setTimeout(() => setGlowActive(false), 200);
  }, []);

  const handleKeyDown = useCallback(() => {
    keyCountRef.current += 1;
    triggerGlow();
  }, [triggerGlow]);

  const syncScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    setCursorPos(e.target.selectionStart);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos(e.currentTarget.selectionStart);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (now - lastSendEditRef.current >= 300) {
        const freq = keyCountRef.current * (1000 / Math.max(now - lastSendEditRef.current, 1));
        sendEditEvent({
          frequency: Math.round(freq * 10) / 10,
          cursorPosition: cursorPos,
          codeLength: code.length,
        });
        keyCountRef.current = 0;
        lastSendEditRef.current = now;
      }

      if (now - lastSendCodeRef.current >= 500) {
        sendCodeSnapshot(code);
        lastSendCodeRef.current = now;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [sendEditEvent, sendCodeSnapshot, cursorPos, code]);

  const lines = code.split('\n');
  const lineNumbers = lines.map((_, i) => i + 1).join('\n');

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.roomCodeBadge}>房间码: {roomCode}</span>
          <span style={styles.roomName}>{roomName || '加载中...'}</span>
        </div>
        <div style={styles.topBarRight}>
          <span style={styles.nickname}>{nickname}</span>
          <span style={styles.studentCount}>
            在线 {roomState?.students.filter(s => s.connected).length ?? 0}/10
          </span>
          <button style={styles.leaveBtn} onClick={disconnect}>
            离开
          </button>
        </div>
      </div>

      <div style={{ ...styles.editorWrap, ...(glowActive ? styles.editorGlow : {}) }}>
        <div style={styles.lineNumbers} ref={lineNumbersRef}>
          <pre style={styles.lineNumbersPre}>{lineNumbers}</pre>
        </div>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#121212',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: '#1E1E1E',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  roomCodeBadge: {
    background: '#F5A623',
    color: '#121212',
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1,
  },
  roomName: {
    color: '#E0E0E0',
    fontSize: 14,
  },
  nickname: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: 500,
  },
  studentCount: {
    color: '#858585',
    fontSize: 12,
  },
  leaveBtn: {
    padding: '6px 14px',
    background: 'rgba(255, 107, 107, 0.15)',
    color: '#FF6B6B',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    transition: 'background 0.2s',
  },
  editorWrap: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    background: '#1e1e1e',
    borderRadius: 0,
    transition: 'box-shadow 0.2s',
  },
  editorGlow: {
    animation: 'pulse-glow 200ms ease-out',
  },
  lineNumbers: {
    flexShrink: 0,
    width: 56,
    background: '#1e1e1e',
    overflow: 'hidden',
    borderRight: '1px solid #2a2a2a',
    userSelect: 'none',
  },
  lineNumbersPre: {
    margin: 0,
    padding: '16px 12px 16px 0',
    fontFamily: "'Fira Code', monospace",
    fontSize: 16,
    lineHeight: 1.5,
    color: '#858585',
    textAlign: 'right',
    whiteSpace: 'pre',
  },
  textarea: {
    flex: 1,
    padding: 16,
    background: '#1e1e1e',
    color: '#E0E0E0',
    border: 'none',
    fontFamily: "'Fira Code', monospace",
    fontSize: 16,
    lineHeight: 1.5,
    overflow: 'auto',
    caretColor: '#4ECDC4',
  },
};

export default EditorPanel;
