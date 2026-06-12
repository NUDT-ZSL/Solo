import React, { useState } from 'react';
import { useStore } from './store';
import { ComponentData, ButtonProps, CardProps, InputProps, getComponentLabel, ComponentType } from './types';
import { X, Copy, Check } from 'lucide-react';

function generateCSS(components: ComponentData[]): string {
  const groups: Record<ComponentType, ComponentData[]> = {
    button: [],
    card: [],
    input: [],
  };

  components.forEach((comp) => {
    groups[comp.type].push(comp);
  });

  const sections: string[] = [];

  const typeOrder: ComponentType[] = ['button', 'card', 'input'];
  typeOrder.forEach((type) => {
    const comps = groups[type];
    if (comps.length === 0) return;

    const typeName = getComponentLabel(type);
    sections.push(`/* ========== ${typeName} ========== */\n`);

    comps.forEach((comp, index) => {
      const selectorName = `.css-designer-${type}-${index + 1}`;
      sections.push(`${selectorName} {`);

      const props = comp.props as Record<string, any>;
      switch (comp.type) {
        case 'button': {
          const bp = props as ButtonProps;
          sections.push(`  width: ${bp.width}px;`);
          sections.push(`  height: ${bp.height}px;`);
          sections.push(`  background-color: ${bp.backgroundColor};`);
          sections.push(`  border-radius: ${bp.borderRadius}px;`);
          sections.push(`  font-size: ${bp.fontSize}px;`);
          sections.push(`  color: ${bp.textColor};`);
          if (bp.shadowDepth > 0) {
            sections.push(`  box-shadow: 0 ${bp.shadowDepth / 2}px ${bp.shadowDepth}px rgba(0, 0, 0, 0.15);`);
          }
          break;
        }
        case 'card': {
          const cp = props as CardProps;
          sections.push(`  width: ${cp.width}px;`);
          sections.push(`  height: ${cp.height}px;`);
          sections.push(`  background-color: ${cp.backgroundColor};`);
          sections.push(`  border: ${cp.borderWidth}px solid ${cp.borderColor};`);
          sections.push(`  border-radius: ${cp.borderRadius}px;`);
          if (cp.shadowDepth > 0) {
            sections.push(`  box-shadow: 0 ${cp.shadowDepth / 2}px ${cp.shadowDepth}px rgba(0, 0, 0, 0.1);`);
          }
          break;
        }
        case 'input': {
          const ip = props as InputProps;
          sections.push(`  width: ${ip.width}px;`);
          sections.push(`  height: ${ip.height}px;`);
          sections.push(`  border: 1px solid ${ip.borderColor};`);
          sections.push(`  border-radius: ${ip.borderRadius}px;`);
          sections.push(`  padding: 0 ${ip.padding}px;`);
          sections.push(`  color: ${ip.placeholderColor};`);
          break;
        }
      }

      sections.push('}\n');
    });
  });

  return sections.join('\n');
}

function highlightCSS(css: string): React.ReactNode[] {
  const lines = css.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('/*')) {
      return <div key={i} style={{ color: '#94a3b8', fontStyle: 'italic' }}>{line}</div>;
    }
    if (line.includes('{')) {
      const match = line.match(/^(\S+)\s*\{?/);
      if (match) {
        return (
          <div key={i}>
            <span className="selector">{match[1]}</span>
            {' {'}
          </div>
        );
      }
    }
    if (line.trim() === '}') {
      return <div key={i}>{'}'}</div>;
    }
    if (line.includes(':')) {
      const match = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.+);?$/);
      if (match) {
        return (
          <div key={i}>
            {match[1]}
            <span className="prop-name">{match[2]}</span>
            {match[3]}
            <span className="prop-value">{match[4]}</span>;
          </div>
        );
      }
    }
    return <div key={i}>{line}</div>;
  });
}

const ExportModal: React.FC = () => {
  const { components, showExport, setShowExport } = useStore();
  const [copied, setCopied] = useState(false);

  if (!showExport) return null;

  const cssCode = generateCSS(components);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = cssCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={() => setShowExport(false)}
    >
      <div
        className="animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: '80vh',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            导出 CSS 代码
          </h2>
          <button
            onClick={() => setShowExport(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#475569';
              (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 24px',
          }}
        >
          {components.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
              画布上没有组件，请先添加组件
            </div>
          ) : (
            <pre
              className="export-code"
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #e2e8f0',
                overflow: 'auto',
                whiteSpace: 'pre',
                margin: 0,
              }}
            >
              {highlightCSS(cssCode)}
            </pre>
          )}
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={handleCopy}
            disabled={components.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: components.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: '#ffffff',
              background: copied ? '#10b981' : '#3b82f6',
              transition: 'all 0.2s',
              opacity: components.length === 0 ? 0.5 : 1,
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制全部'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
