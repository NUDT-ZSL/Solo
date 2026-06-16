import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo
} from 'react';

export interface TypingPanelHandle {
  getInputRef: () => HTMLInputElement | null;
  triggerShake: () => void;
  reset: () => void;
  getPanelRect: () => DOMRect | null;
}

interface TypingPanelProps {
  text: string;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
  disabled?: boolean;
}

const CHARS_PER_VIEW = 200;

const TypingPanel = forwardRef<TypingPanelHandle, TypingPanelProps>((
  { text, onCorrect, onWrong, onComplete, disabled = false },
  ref
) => {
  const [typedIndex, setTypedIndex] = useState(0);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getInputRef: () => inputRef.current,
    triggerShake: () => setShakeKey(k => k + 1),
    reset: () => {
      setTypedIndex(0);
      setErrorIndex(null);
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
      }
    },
    getPanelRect: () => panelRef.current?.getBoundingClientRect() || null
  }));

  useEffect(() => {
    setTypedIndex(0);
    setErrorIndex(null);
    if (inputRef.current) {
      inputRef.current.value = '';
      if (!disabled) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [text, disabled]);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const viewStart = useMemo(() => {
    const halfView = Math.floor(CHARS_PER_VIEW / 2);
    return Math.max(0, typedIndex - halfView);
  }, [typedIndex]);

  const viewEnd = useMemo(() => {
    return Math.min(text.length, viewStart + CHARS_PER_VIEW);
  }, [viewStart, text.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key.length === 1) {
      e.preventDefault();
      const expectedChar = text[typedIndex];

      if (e.key === expectedChar) {
        setErrorIndex(null);
        const newIndex = typedIndex + 1;
        setTypedIndex(newIndex);
        onCorrect();
        if (newIndex >= text.length) {
          onComplete();
        }
      } else {
        setErrorIndex(typedIndex);
        setErrorShakeKey(k => k + 1);
        setTimeout(() => setErrorIndex(null), 100);
        onWrong();
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setTypedIndex(prev => Math.max(0, prev - 1));
      setErrorIndex(null);
    }
  }, [text, typedIndex, disabled, onCorrect, onWrong, onComplete]);

  const renderChars = () => {
    const nodes: React.ReactNode[] = [];

    for (let i = viewStart; i < viewEnd; i++) {
      const char = text[i];
      let className = 'char';
      let style: React.CSSProperties = { color: '#C5C6C7' };

      if (i < typedIndex) {
        style = { color: '#66FCF1' };
      } else if (i === typedIndex) {
        className = 'char cursor';
        style = {
          color: '#FFFFFF',
          backgroundColor: '#45A29E',
          padding: '0 2px',
          borderRadius: '2px'
        };
      }

      if (i === errorIndex) {
        style = { ...style, color: '#C5C6C7' };
        nodes.push(
          <span
            key={`${i}-${errorShakeKey}`}
            className={className}
            style={{
              ...style,
              display: 'inline-block',
              animation: 'errorShake 0.1s ease-in-out'
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      } else {
        nodes.push(
          <span key={i} className={className} style={style}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      }
    }

    return nodes;
  };

  return (
    <>
      <style>{`
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes panelShake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5px, -3px); }
          20% { transform: translate(5px, 3px); }
          30% { transform: translate(-4px, 2px); }
          40% { transform: translate(4px, -2px); }
          50% { transform: translate(-3px, -4px); }
          60% { transform: translate(3px, 4px); }
          70% { transform: translate(-2px, 1px); }
          80% { transform: translate(2px, -1px); }
          90% { transform: translate(-1px, 2px); }
        }
        .typing-panel {
          background: rgba(31, 40, 51, 0.85);
          border: 0.5px solid #45A29E;
          border-radius: 16px;
          padding: 32px 40px;
          max-height: 70vh;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          scrollbar-width: thin;
          scrollbar-color: #45A29E transparent;
        }
        .typing-panel::-webkit-scrollbar {
          width: 6px;
        }
        .typing-panel::-webkit-scrollbar-thumb {
          background: #45A29E;
          border-radius: 3px;
        }
        .text-content {
          font-family: 'Courier New', Courier, monospace;
          font-size: 22px;
          line-height: 1.8;
          letter-spacing: 1px;
          white-space: pre-wrap;
          word-break: break-word;
          text-align: left;
          width: 100%;
        }
        .char {
          transition: color 0.1s ease;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '800px',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'center'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <div
          ref={panelRef}
          key={shakeKey}
          className="typing-panel"
          style={{
            animation: shakeKey > 0 ? 'panelShake 0.2s ease-in-out' : 'none'
          }}
        >
          <div className="text-content">
            {viewStart > 0 && <span style={{ color: '#45A29E' }}>... </span>}
            {renderChars()}
            {viewEnd < text.length && <span style={{ color: '#45A29E' }}> ...</span>}
          </div>
        </div>
        <input
          ref={inputRef}
          type="text"
          onKeyDown={handleKeyDown}
          disabled={disabled}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: disabled ? 'none' : 'auto',
            left: '-9999px',
            top: 0
          }}
          autoFocus
        />
      </div>
    </>
  );
});

TypingPanel.displayName = 'TypingPanel';

export default TypingPanel;
