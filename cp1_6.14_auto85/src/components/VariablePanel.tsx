import React, { useState, useRef, useEffect } from 'react';

interface VariablePanelProps {
  variables: Record<string, string>;
}

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

interface CopyButtonProps {
  text: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [phase, setPhase] = useState<'hidden' | 'showing' | 'hiding'>('hidden');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);

      clearAllTimers();

      setPhase('showing');

      const t1 = setTimeout(() => {
        setPhase('hiding');
      }, 500);
      timersRef.current.push(t1);

      const t2 = setTimeout(() => {
        setPhase('hidden');
      }, 500 + 1200);
      timersRef.current.push(t2);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isVisible = phase !== 'hidden';
  const isFadingOut = phase === 'hiding';

  return (
    <button className="copy-button" onClick={handleCopy} title="复制">
      <CopyIcon />
      <span
        className={`copied-tooltip ${isVisible ? 'visible' : ''}`}
        style={{
          opacity: isFadingOut ? 0 : isVisible ? 1 : 0,
          transition: isFadingOut
            ? 'opacity 1.2s ease, transform 1.2s ease'
            : isVisible
            ? 'opacity 0.2s ease, transform 0.2s ease'
            : 'none',
          transform: isFadingOut
            ? 'translateX(-50%) translateY(5px)'
            : isVisible
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(5px)',
        }}
      >
        Copied!
      </span>
    </button>
  );
};

const formatValue = (value: string): string => {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      return `"${parsed}"`;
    }
    return value;
  } catch {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value;
    }
    if (/^[a-zA-Z_$]/.test(value) && !value.includes(' ') && !value.includes('"')) {
      return `"${value}"`;
    }
    return value;
  }
};

const VariablePanel: React.FC<VariablePanelProps> = ({ variables }) => {
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return (
      <div className="variable-panel">
        <div className="variable-header">变量作用域</div>
        <div className="empty-state" style={{ height: 'calc(100% - 40px)' }}>
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">暂无变量数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className="variable-panel">
      <div className="variable-header">变量作用域</div>
      <div className="variable-list">
        {entries.map(([name, value]) => (
          <div key={name} className="variable-item">
            <CopyButton text={`${name} = ${value}`} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="variable-name">{name}:</span>
                <span className="variable-value">{formatValue(value)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VariablePanel;
