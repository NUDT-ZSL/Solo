import React, { useState, useCallback } from 'react';
import { useColorContext } from '../context/ColorContext';

export const ImportPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { importScheme } = useColorContext();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleImport = useCallback(() => {
    const schemeName = name.trim() || '导入的方案';
    const success = importScheme(code, schemeName);
    if (success) {
      setCode('');
      setName('');
      setError('');
      onClose();
    } else {
      setError('无法解析颜色变量，请检查格式是否正确。支持CSS变量(--name: #xxx;)和SCSS变量($name: #xxx;)格式。');
    }
  }, [code, name, importScheme, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleImport();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleImport, onClose]);

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
          transform: 'translateX(-50%)',
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
            导入配色变量
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

        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              方案名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入方案名称（可选）"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              粘贴 CSS/SCSS 变量代码
            </label>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder={`:root {
  --primary: #3b82f6;
  --secondary: #6b7280;
}

或 SCSS 格式：
$primary: #3b82f6;
$secondary: #6b7280;`}
              style={{
                width: '100%',
                minHeight: '180px',
                padding: '14px',
                borderRadius: '8px',
                border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: "'JetBrains Mono', monospace",
                transition: 'border-color 0.2s ease',
                backgroundColor: '#f9fafb',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = error ? '#ef4444' : '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = error ? '#ef4444' : '#d1d5db';
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

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
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={!code.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: code.trim() ? '#3b82f6' : '#d1d5db',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: code.trim() ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (code.trim()) {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (code.trim()) {
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
            >
              导入
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
