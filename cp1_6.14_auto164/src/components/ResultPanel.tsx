import React, { useState, useRef } from 'react';
import { type CSSRegion, generateCSSCode } from '../modules/imageAnalyzer';

interface ResultPanelProps {
  regions: CSSRegion[];
  selectedRegion: CSSRegion | null;
  onSelectRegion?: (region: CSSRegion) => void;
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
  gradient: '渐变',
  shadow: '阴影',
  'border-radius': '圆角',
  mixed: '混合',
};

const ResultPanel: React.FC<ResultPanelProps> = ({ regions, selectedRegion, onSelectRegion }) => {
  const displayRegion = selectedRegion || regions[0] || null;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editTextRef = useRef<Record<string, string>>({});

  const handleCopy = async (regionId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(regionId);
      setTimeout(() => setCopiedId(null), 300);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  if (!displayRegion) {
    return (
      <div className="result-panel" style={panelStyle}>
        <div style={headerStyle}>
          <span style={headerTitleStyle}>提取结果</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>0 个区域</span>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>🎨</div>
            上传设计稿后<br />自动识别CSS样式区域
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="result-panel" style={panelStyle}>
      <div style={headerStyle}>
        <span style={headerTitleStyle}>提取结果</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{regions.length} 个区域</span>
      </div>

      <div
        style={{
          padding: '0 16px 8px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxHeight: '40%',
          overflowY: 'auto',
        }}
      >
        {regions.map((region) => (
          <div
            key={region.id}
            onClick={() => onSelectRegion?.(region)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 8,
              borderRadius: 'var(--radius-sm)',
              background: selectedRegion?.id === region.id ? 'var(--color-bg-tertiary)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
            }}
            className="region-item"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: region.properties.borderRadius || 'var(--radius-sm)',
                background: region.properties.primaryColor || 'var(--color-bg-tertiary)',
                flexShrink: 0,
                boxShadow: region.properties.boxShadow ? region.properties.boxShadow : 'none',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {typeLabels[region.type]}区域
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {Math.round(region.width)} × {Math.round(region.height)}px
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '12px 16px 0 16px',
          borderTop: '1px solid var(--color-border)',
          marginTop: 8,
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: 8 }}>
          CSS 代码
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: '4px 16px 16px 16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {selectedRegion ? (
          <CodeBlock
            region={selectedRegion}
            copiedId={copiedId}
            editingId={editingId}
            editTextRef={editTextRef}
            onCopy={handleCopy}
            onSetEditing={setEditingId}
          />
        ) : (
          regions.slice(0, 3).map((region) => (
            <CodeBlock
              key={region.id}
              region={region}
              copiedId={copiedId}
              editingId={editingId}
              editTextRef={editTextRef}
              onCopy={handleCopy}
              onSetEditing={setEditingId}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface CodeBlockProps {
  region: CSSRegion;
  copiedId: string | null;
  editingId: string | null;
  editTextRef: React.MutableRefObject<Record<string, string>>;
  onCopy: (id: string, code: string) => void;
  onSetEditing: (id: string | null) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  region,
  copiedId,
  editingId,
  editTextRef,
  onCopy,
  onSetEditing,
}) => {
  const originalCode = generateCSSCode(region);
  const isEditing = editingId === region.id;
  const currentCode = editTextRef.current[region.id] ?? originalCode;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      onClick={() => {
        if (!isEditing) {
          editTextRef.current[region.id] = originalCode;
          onSetEditing(region.id);
        }
      }}
      style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${isEditing ? 'var(--color-accent-yellow)' : 'var(--color-border)'}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease-out',
        cursor: isEditing ? 'text' : 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {typeLabels[region.type]}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy(region.id, currentCode);
          }}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: 'none',
            background: copiedId === region.id ? 'var(--color-accent-green)' : 'var(--color-accent-blue)',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease-out',
          }}
          className="action-btn"
        >
          {copiedId === region.id ? '已复制' : '复制'}
        </button>
      </div>
      <div style={{ padding: 12 }}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={currentCode}
            onChange={(e) => {
              editTextRef.current[region.id] = e.target.value;
            }}
            onBlur={() => onSetEditing(null)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              minHeight: 100,
              background: 'var(--color-bg-primary)',
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
            {highlightCSS(currentCode)}
          </pre>
        )}
      </div>
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  width: 280,
  height: '100%',
  background: 'var(--color-bg-secondary)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  boxShadow: 'var(--shadow-md)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '16px',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
};

export default ResultPanel;
