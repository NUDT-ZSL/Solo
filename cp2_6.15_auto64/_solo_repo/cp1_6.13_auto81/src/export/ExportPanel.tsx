import React, { useState, useMemo, useCallback } from 'react';
import { useColorContext, ColorToken } from '../context/ColorContext';

const generateCSS = (tokens: ColorToken[]): string => {
  const lines = tokens.map(token => `  ${token.name}: ${token.value};`);
  return `:root {\n${lines.join('\n')}\n}`;
};

const generateSCSS = (tokens: ColorToken[]): string => {
  return tokens
    .map(token => {
      const scssName = token.name.replace(/^--/, '$');
      return `${scssName}: ${token.value};`;
    })
    .join('\n');
};

export const ExportPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { getCurrentScheme } = useColorContext();
  const [activeTab, setActiveTab] = useState<'css' | 'scss'>('css');
  const [copied, setCopied] = useState(false);

  const currentScheme = getCurrentScheme();

  const cssContent = useMemo(() => {
    return currentScheme ? generateCSS(currentScheme.tokens) : '';
  }, [currentScheme]);

  const scssContent = useMemo(() => {
    return currentScheme ? generateSCSS(currentScheme.tokens) : '';
  }, [currentScheme]);

  const currentContent = activeTab === 'css' ? cssContent : scssContent;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [currentContent]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease',
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '60px',
          left: '50%',
          transform: isOpen ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
          width: '100%',
          maxWidth: '600px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 1001,
          animation: 'slideDown 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2937',
            }}
          >
            导出配色变量
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => setActiveTab('css')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              color: activeTab === 'css' ? '#3b82f6' : '#6b7280',
              borderBottom: activeTab === 'css' ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.2s ease',
            }}
          >
            CSS 变量
          </button>
          <button
            onClick={() => setActiveTab('scss')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              color: activeTab === 'scss' ? '#3b82f6' : '#6b7280',
              borderBottom: activeTab === 'scss' ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.2s ease',
            }}
          >
            SCSS 变量
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div
            style={{
              position: 'relative',
              backgroundColor: '#1f2937',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                color: '#f9fafb',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6,
              }}
            >
              {currentContent}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              关闭
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: copied ? '#10b981' : '#3b82f6',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
            >
              {copied ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  复制到剪贴板
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
};
