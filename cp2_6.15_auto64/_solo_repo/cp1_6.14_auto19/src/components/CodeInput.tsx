import React, { useState, useCallback } from 'react';
import { parseCode, ParseResult } from '../utils/codeParser';
import { ParticleConfig } from '../utils/particleEngine';

interface CodeInputProps {
  onParse: (config: Partial<ParticleConfig>) => void;
}

const CodeInput: React.FC<CodeInputProps> = ({ onParse }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(() => {
    if (!code.trim()) {
      setSuccessMsg(null);
      setError('请输入代码片段，例如: count = 8000; speed = 2.5; rotation = 0.5');
      return;
    }

    setIsRunning(true);
    setSuccessMsg(null);
    setError(null);

    requestAnimationFrame(() => {
      try {
        const t0 = performance.now();
        const result: ParseResult = parseCode(code);
        const totalElapsed = performance.now() - t0;

        if (result.success && result.config) {
          const keys = Object.keys(result.config).join(', ');
          setError(null);
          setSuccessMsg(
            `✅ 解析成功 (${totalElapsed.toFixed(0)}ms): ${keys}`
          );
          onParse(result.config);
        } else {
          setError(result.error || '解析失败，请检查代码');
          setSuccessMsg(null);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(`运行时错误: ${msg}`);
        setSuccessMsg(null);
      } finally {
        setIsRunning(false);
      }
    });
  }, [code, onParse]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRun();
    }
  }, [handleRun]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '60%',
          maxWidth: '800px',
          height: '48px',
          background: '#1e1e32',
          borderRadius: '12px',
          border: focused ? '2px solid #8b5cf6' : '2px solid transparent',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease-out',
          margin: '0 auto',
          boxShadow: focused ? '0 0 0 4px rgba(139, 92, 246, 0.15)' : 'none',
        }}
      >
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
            if (successMsg) setSuccessMsg(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="粘贴代码片段 (HTML/CSS/JS)... Ctrl+Enter 运行"
          spellCheck={false}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '16px',
            padding: '0 16px',
            fontFamily: "'Fira Code', 'Consolas', monospace",
            letterSpacing: '0.5px',
            caretColor: '#8b5cf6',
            minWidth: 0,
          }}
        />
        <button
          onClick={handleRun}
          disabled={isRunning}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: isRunning ? '#6366f1' : '#8b5cf6',
            color: 'white',
            border: 'none',
            cursor: isRunning ? 'progress' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            marginRight: '4px',
            flexShrink: 0,
            transition: 'background 0.2s ease-out, transform 0.1s ease-out',
            transform: isRunning ? 'scale(0.95)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (!isRunning) (e.currentTarget as HTMLElement).style.background = '#7c3aed';
          }}
          onMouseLeave={(e) => {
            if (!isRunning) (e.currentTarget as HTMLElement).style.background = '#8b5cf6';
          }}
          onMouseDown={(e) => {
            if (!isRunning) (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)';
          }}
          onMouseUp={(e) => {
            if (!isRunning) (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          {isRunning ? '⋯' : '▶'}
        </button>
      </div>

      {(error || successMsg) && (
        <div
          style={{
            width: '60%',
            maxWidth: '800px',
            margin: '0 auto',
            fontSize: '12px',
            padding: '4px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: error ? '#ef4444' : '#22c55e',
            fontFamily: "'Fira Code', monospace",
          }}
        >
          <span>{error || successMsg}</span>
        </div>
      )}
    </div>
  );
};

export default CodeInput;
