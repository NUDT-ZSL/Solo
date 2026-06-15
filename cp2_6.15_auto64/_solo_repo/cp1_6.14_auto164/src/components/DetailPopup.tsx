import React, { useState, useRef, useEffect } from 'react';
import { type CSSRegion, generateCSSCode } from '../modules/imageAnalyzer';

interface DetailPopupProps {
  region: CSSRegion | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

type TokenType = 'comment' | 'selector' | 'property' | 'value' | 'punctuation' | 'default';

function tokenizeLine(line: string): { text: string; type: TokenType }[] {
  const tokens: { text: string; type: TokenType }[] = [];
  const trimmed = line.trim();

  if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
    const indent = line.match(/^(\s*)/)?.[1] || '';
    tokens.push({ text: indent, type: 'default' });
    tokens.push({ text: trimmed, type: 'comment' });
    return tokens;
  }

  if (trimmed === '}' || trimmed === '{') {
    const indent = line.match(/^(\s*)/)?.[1] || '';
    tokens.push({ text: indent, type: 'default' });
    tokens.push({ text: trimmed, type: 'punctuation' });
    return tokens;
  }

  const selectorMatch = line.match(/^(\s*)(\.[\w-]+|#[\w-]+|[\w-]+)(\s*\{)$/);
  if (selectorMatch) {
    tokens.push({ text: selectorMatch[1], type: 'default' });
    tokens.push({ text: selectorMatch[2], type: 'selector' });
    tokens.push({ text: selectorMatch[3], type: 'punctuation' });
    return tokens;
  }

  const propMatch = line.match(/^(\s*)([\w-]+)(:\s*)(.*?)(;?)$/);
  if (propMatch) {
    tokens.push({ text: propMatch[1], type: 'default' });
    tokens.push({ text: propMatch[2], type: 'property' });
    tokens.push({ text: propMatch[3], type: 'punctuation' });
    tokens.push({ text: propMatch[4], type: 'value' });
    if (propMatch[5]) tokens.push({ text: propMatch[5], type: 'punctuation' });
    return tokens;
  }

  tokens.push({ text: line, type: 'default' });
  return tokens;
}

function highlightCSS(code: string): React.ReactNode {
  const lines = code.split('\n');
  return lines.map((line, lineIdx) => {
    const tokens = tokenizeLine(line);
    return (
      <div key={lineIdx} style={{ whiteSpace: 'pre' }}>
        {tokens.map((t, i) => {
          let color = 'var(--color-text-primary)';
          switch (t.type) {
            case 'comment': color = 'var(--color-text-muted)'; break;
            case 'property': color = 'var(--color-accent-blue-light)'; break;
            case 'value': color = 'var(--color-accent-green-light)'; break;
            case 'selector': color = 'var(--color-accent-yellow-light)'; break;
            case 'punctuation': color = 'var(--color-text-primary)'; break;
            default: color = 'var(--color-text-primary)';
          }
          return <span key={i} style={{ color }}>{t.text}</span>;
        })}
      </div>
    );
  });
}

const typeLabels: Record<CSSRegion['type'], string> = {
  gradient: '渐变背景',
  shadow: '阴影效果',
  'border-radius': '圆角边框',
  mixed: '混合样式',
};

const DetailPopup: React.FC<DetailPopupProps> = ({ region, position, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (region) {
      setEditedCode(generateCSSCode(region));
      setIsEditing(false);
    }
  }, [region]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  if (!region || !position) return null;

  const displayCode = isEditing ? editedCode : generateCSSCode(region);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 300);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleTextareaBlur = () => {
    setIsEditing(false);
  };

  const popupWidth = 320;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = position.x + 20;
  let top = position.y + 20;
  const estimatedHeight = 300;

  if (left + popupWidth > viewportWidth - 20) {
    left = position.x - popupWidth - 20;
  }
  if (top + estimatedHeight > viewportHeight - 20) {
    top = Math.max(84, viewportHeight - estimatedHeight - 20);
  }
  left = Math.max(20, Math.min(viewportWidth - popupWidth - 20, left));
  top = Math.max(84, top);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 998,
          background: 'transparent',
        }}
        onClick={onClose}
      />
      <div
        className="detail-popup"
        style={{
          position: 'fixed',
          left,
          top,
          width: popupWidth,
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 999,
          overflow: 'hidden',
          animation: 'popupIn var(--transition-slow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {typeLabels[region.type]}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 0,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              transition: 'all var(--transition-base)',
              lineHeight: 1,
            }}
            className="action-btn"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: region.properties.borderRadius
                  ? parseInt(region.properties.borderRadius) || 8
                  : 8,
                background: region.properties.primaryColor || 'var(--color-bg-tertiary)',
                boxShadow: region.properties.boxShadow || 'none',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                尺寸
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'Consolas, Monaco, monospace' }}>
                {Math.round(region.width)} × {Math.round(region.height)} px
              </div>
              {region.properties.primaryColor && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6, marginBottom: 2 }}>
                    主色
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'Consolas, Monaco, monospace' }}>
                    {region.properties.primaryColor}
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            onClick={handleCodeClick}
            style={{
              background: 'var(--color-bg-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              marginBottom: 12,
              maxHeight: 180,
              overflowY: 'auto',
              border: `2px solid ${isEditing ? 'var(--color-accent-yellow)' : 'transparent'}`,
              cursor: isEditing ? 'text' : 'pointer',
              transition: 'border-color var(--transition-base)',
            }}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                onBlur={handleTextareaBlur}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  minHeight: 100,
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              />
            ) : (
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {highlightCSS(displayCode)}
              </pre>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="action-btn"
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: copied ? 'var(--color-accent-green)' : 'var(--color-accent-blue)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-base)',
            }}
          >
            {copied ? '✓ 已复制' : '一键复制 CSS 代码'}
          </button>
        </div>
      </div>
    </>
  );
};

export default DetailPopup;
