import React, { useState } from 'react';
import { type CSSRegion, generateCSSCode } from '../modules/imageAnalyzer';

interface DetailPopupProps {
  region: CSSRegion | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

function highlightCSS(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    const commentMatch = line.match(/^(\s*)\/\*(.*)\*\/$/);
    if (commentMatch) {
      return (
        <div key={i} style={{ color: '#9ca3af' }}>
          {commentMatch[1]}/*{commentMatch[2]}*/
        </div>
      );
    }

    const selectorMatch = line.match(/^(\s*)(\.[\w-]+|[\w-]+)(\s*\{)$/);
    if (selectorMatch) {
      return (
        <div key={i}>
          <span style={{ color: '#f1f5f9' }}>{selectorMatch[1]}</span>
          <span style={{ color: '#fbbf24' }}>{selectorMatch[2]}</span>
          <span style={{ color: '#f1f5f9' }}>{selectorMatch[3]}</span>
        </div>
      );
    }

    if (line.trim() === '}') {
      return <div key={i} style={{ color: '#f1f5f9' }}>{line}</div>;
    }

    const propMatch = line.match(/^(\s*)([\w-]+)(:\s*)(.*)(;)$/);
    if (propMatch) {
      return (
        <div key={i}>
          <span style={{ color: '#f1f5f9' }}>{propMatch[1]}</span>
          <span style={{ color: '#60a5fa' }}>{propMatch[2]}</span>
          <span style={{ color: '#f1f5f9' }}>{propMatch[3]}</span>
          <span style={{ color: '#34d399' }}>{propMatch[4]}</span>
          <span style={{ color: '#f1f5f9' }}>{propMatch[5]}</span>
        </div>
      );
    }

    return <div key={i} style={{ color: '#f1f5f9' }}>{line}</div>;
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

  if (!region || !position) return null;

  const code = generateCSSCode(region);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 300);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const popupWidth = 320;
  const popupHeight = 280;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = position.x + 20;
  let top = position.y + 20;

  if (left + popupWidth > viewportWidth) {
    left = position.x - popupWidth - 20;
  }
  if (top + popupHeight > viewportHeight) {
    top = viewportHeight - popupHeight - 20;
  }
  left = Math.max(20, left);
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
          background: '#1e293b',
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 999,
          overflow: 'hidden',
          animation: 'popupIn 0.3s ease-out',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
            {typeLabels[region.type]}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
              padding: 0,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            className="action-btn"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: region.properties.primaryColor || '#334155',
                boxShadow: region.properties.boxShadow || 'none',
                borderRadius: region.properties.borderRadius || 8,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                尺寸
              </div>
              <div style={{ fontSize: 13, color: '#f1f5f9', fontFamily: 'Consolas, monospace' }}>
                {Math.round(region.width)} × {Math.round(region.height)} px
              </div>
              {region.properties.primaryColor && (
                <>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, marginBottom: 2 }}>
                    主色
                  </div>
                  <div style={{ fontSize: 13, color: '#f1f5f9', fontFamily: 'Consolas, monospace' }}>
                    {region.properties.primaryColor}
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              background: '#0f172a',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              maxHeight: 160,
              overflowY: 'auto',
            }}
          >
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
              {highlightCSS(code)}
            </pre>
          </div>

          <button
            onClick={handleCopy}
            className="action-btn"
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: copied ? '#22c55e' : '#3b82f6',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
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
