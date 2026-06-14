import React, { useState, useRef } from 'react';
import { type CSSRegion, generateCSSCode } from '../modules/imageAnalyzer';

interface ResultPanelProps {
  regions: CSSRegion[];
  selectedRegion: CSSRegion | null;
  onSelectRegion?: (region: CSSRegion) => void;
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
          <span style={{ fontSize: 12, color: '#94a3b8' }}>0 个区域</span>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
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
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{regions.length} 个区域</span>
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
              borderRadius: 8,
              background: selectedRegion?.id === region.id ? '#334155' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
            }}
            className="region-item"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: region.properties.primaryColor || '#334155',
                flexShrink: 0,
                boxShadow: region.properties.boxShadow ? region.properties.boxShadow : 'none',
                borderRadius: region.properties.borderRadius || 8,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500 }}>
                {typeLabels[region.type]}区域
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {Math.round(region.width)} × {Math.round(region.height)}px
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '12px 16px 0 16px',
          borderTop: '1px solid #334155',
          marginTop: 8,
        }}
      >
        <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500, marginBottom: 8 }}>
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
        background: '#0f172a',
        borderRadius: 12,
        border: `2px solid ${isEditing ? '#eab308' : '#334155'}`,
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
          background: '#1e293b',
          borderBottom: '1px solid #334155',
        }}
      >
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
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
            background: copiedId === region.id ? '#22c55e' : '#3b82f6',
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
              background: '#0f172a',
              color: '#f1f5f9',
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
  background: '#1e293b',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '16px',
  borderBottom: '1px solid #334155',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#f1f5f9',
};

export default ResultPanel;
