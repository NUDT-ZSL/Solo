import React, { useState, useEffect, useRef } from 'react';

interface ControlPanelProps {
  onGenerate: (text: string) => void;
  onExportCSS: () => void;
  onExportPNG: () => void;
  lockedCount: number;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onGenerate,
  onExportCSS,
  onExportPNG,
  lockedCount,
  isLoading,
}) => {
  const [text, setText] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  const handleGenerate = () => {
    onGenerate(text);
  };

  const handleExportCSS = () => {
    onExportCSS();
    setCopied(true);
    setExportOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnBaseStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    transition: 'background 0.15s ease, transform 0.1s ease',
    userSelect: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#1A202C',
          marginBottom: 4,
          letterSpacing: -0.5,
        }}
      >
        色彩调色板生成器
      </h1>
      <p style={{ fontSize: 14, color: '#718096', marginBottom: 12 }}>
        输入文字描述，自动生成配色方案
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          maxWidth: 600,
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 50))}
          onKeyDown={handleKeyDown}
          placeholder="例如：夏日的海滩、复古蒸汽波..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #CBD5E0',
            fontSize: 14,
            background: '#fff',
            color: '#2D3748',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3182CE';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(49,130,206,0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E0';
            e.currentTarget.style.boxShadow = 'none';
          }}
          maxLength={50}
        />

        <button
          onClick={handleGenerate}
          style={{
            ...btnBaseStyle,
            background: '#3182CE',
            color: '#fff',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#2B6CB0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#3182CE';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          生成
        </button>

        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            style={{
              ...btnBaseStyle,
              background: '#fff',
              color: '#2D3748',
              border: '1px solid #CBD5E0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#EDF2F7';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#fff';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            导出
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>

          {exportOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                minWidth: 170,
                zIndex: 10,
                animation: 'fadeIn 0.15s ease',
              }}
            >
              <button
                onClick={handleExportCSS}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 14,
                  color: '#2D3748',
                  textAlign: 'left',
                  background: copied ? '#C6F6D5' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = copied ? '#9AE6B4' : '#EDF2F7';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = copied ? '#C6F6D5' : 'transparent';
                }}
              >
                {copied ? '✓ 已复制到剪贴板' : '导出为 CSS 变量'}
              </button>
              <button
                onClick={() => {
                  onExportPNG();
                  setExportOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 14,
                  color: '#2D3748',
                  textAlign: 'left',
                  background: 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#EDF2F7';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                导出为 PNG 截图
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        {isLoading && (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: '#FF6B6B',
              borderRightColor: '#FFE66D',
              borderBottomColor: '#4ECDC4',
              borderLeftColor: '#9B5DE5',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
        {!isLoading && lockedCount > 0 && (
          <div
            style={{
              fontSize: 12,
              color: '#D69E2E',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
            </svg>
            已锁定 {lockedCount} 个颜色
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
