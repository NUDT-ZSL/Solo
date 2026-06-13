import React, { useState } from 'react';
import { parseCode, ParseResult } from '../utils/codeParser';
import { ParticleConfig } from '../utils/particleEngine';

interface CodeInputProps {
  onParse: (config: Partial<ParticleConfig>) => void;
}

const CodeInput: React.FC<CodeInputProps> = ({ onParse }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const handleRun = () => {
    if (!code.trim()) {
      setError('请输入代码片段');
      return;
    }

    const start = performance.now();
    const result: ParseResult = parseCode(code);
    const elapsed = performance.now() - start;

    if (result.success && result.config) {
      setError(null);
      onParse(result.config);
    } else {
      setError(result.error || '解析失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleRun();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
        }}
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="粘贴代码片段 (HTML/CSS/JS)... Ctrl+Enter 运行"
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
          }}
        />
        <button
          onClick={handleRun}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            marginRight: '4px',
            transition: 'background 0.2s ease-out, transform 0.1s ease-out',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#7c3aed';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#8b5cf6';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          ▶
        </button>
      </div>
      {error && (
        <div
          style={{
            width: '60%',
            maxWidth: '800px',
            margin: '0 auto',
            color: '#ef4444',
            fontSize: '12px',
            padding: '4px 16px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default CodeInput;
