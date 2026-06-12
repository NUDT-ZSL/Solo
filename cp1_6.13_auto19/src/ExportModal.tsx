import React, { useState } from 'react';
import { useStore } from './store';
import { ComponentData, ButtonProps, CardProps, InputProps, getComponentLabel, ComponentType } from './types';
import { X, Copy, Check } from 'lucide-react';

const TYPE_ORDER: ComponentType[] = ['button', 'card', 'input'];

interface CSSProperty {
  name: string;
  value: string;
}

function collectButtonProps(comp: ComponentData): CSSProperty[] {
  const p = comp.props as ButtonProps;
  const list: CSSProperty[] = [
    { name: 'width', value: `${p.width}px` },
    { name: 'height', value: `${p.height}px` },
    { name: 'background-color', value: p.backgroundColor },
    { name: 'border-radius', value: `${p.borderRadius}px` },
    { name: 'font-size', value: `${p.fontSize}px` },
    { name: 'color', value: p.textColor },
  ];
  if (p.shadowDepth > 0) {
    list.push({
      name: 'box-shadow',
      value: `0 ${p.shadowDepth / 2}px ${p.shadowDepth}px rgba(0, 0, 0, 0.15)`,
    });
  }
  return list;
}

function collectCardProps(comp: ComponentData): CSSProperty[] {
  const p = comp.props as CardProps;
  const list: CSSProperty[] = [
    { name: 'width', value: `${p.width}px` },
    { name: 'height', value: `${p.height}px` },
    { name: 'background-color', value: p.backgroundColor },
    { name: 'border', value: `${p.borderWidth}px solid ${p.borderColor}` },
    { name: 'border-radius', value: `${p.borderRadius}px` },
  ];
  if (p.shadowDepth > 0) {
    list.push({
      name: 'box-shadow',
      value: `0 ${p.shadowDepth / 2}px ${p.shadowDepth}px rgba(0, 0, 0, 0.1)`,
    });
  }
  return list;
}

function collectInputProps(comp: ComponentData): CSSProperty[] {
  const p = comp.props as InputProps;
  return [
    { name: 'width', value: `${p.width}px` },
    { name: 'height', value: `${p.height}px` },
    { name: 'border', value: `1px solid ${p.borderColor}` },
    { name: 'border-radius', value: `${p.borderRadius}px` },
    { name: 'padding', value: `0 ${p.padding}px` },
    { name: 'color', value: p.placeholderColor },
  ];
}

function collectPropsByType(comp: ComponentData): CSSProperty[] {
  switch (comp.type) {
    case 'button': return collectButtonProps(comp);
    case 'card': return collectCardProps(comp);
    case 'input': return collectInputProps(comp);
  }
}

function groupByType(components: ComponentData[]): Record<ComponentType, ComponentData[]> {
  const groups: Record<ComponentType, ComponentData[]> = {
    button: [],
    card: [],
    input: [],
  };
  components.forEach((c) => groups[c.type].push(c));
  return groups;
}

function generatePlainCSS(components: ComponentData[]): string {
  const groups = groupByType(components);
  const lines: string[] = [];

  TYPE_ORDER.forEach((type) => {
    const comps = groups[type];
    if (comps.length === 0) return;

    lines.push(`/* ========== ${getComponentLabel(type)} ========== */`);
    lines.push('');

    comps.forEach((comp, idx) => {
      const selector = `.css-designer-${type}-${idx + 1}`;
      lines.push(`${selector} {`);
      const props = collectPropsByType(comp);
      props.forEach((p) => {
        lines.push(`  ${p.name}: ${p.value};`);
      });
      lines.push('}');
      lines.push('');
    });
  });

  return lines.join('\n').trimEnd() + '\n';
}

const SyntaxLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

const Comment: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{children}</span>
);

const Selector: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{children}</span>
);

const PropName: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: '#3b82f6' }}>{children}</span>
);

const PropValue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: '#10b981' }}>{children}</span>
);

function renderHighlighted(components: ComponentData[]): React.ReactNode {
  const groups = groupByType(components);
  const nodes: React.ReactNode[] = [];
  let keyCounter = 0;

  TYPE_ORDER.forEach((type) => {
    const comps = groups[type];
    if (comps.length === 0) return;

    nodes.push(
      <SyntaxLine key={keyCounter++}>
        <Comment>{`/* ========== ${getComponentLabel(type)} ========== */`}</Comment>
      </SyntaxLine>
    );
    nodes.push(<SyntaxLine key={keyCounter++}>&nbsp;</SyntaxLine>);

    comps.forEach((comp, idx) => {
      const selector = `.css-designer-${type}-${idx + 1}`;
      nodes.push(
        <SyntaxLine key={keyCounter++}>
          <Selector>{selector}</Selector>
          <span style={{ color: '#475569' }}> {'{'}</span>
        </SyntaxLine>
      );

      const props = collectPropsByType(comp);
      props.forEach((p) => {
        nodes.push(
          <SyntaxLine key={keyCounter++}>
            <span>&nbsp;&nbsp;</span>
            <PropName>{p.name}</PropName>
            <span style={{ color: '#475569' }}>: </span>
            <PropValue>{p.value}</PropValue>
            <span style={{ color: '#475569' }}>;</span>
          </SyntaxLine>
        );
      });

      nodes.push(
        <SyntaxLine key={keyCounter++}>
          <span style={{ color: '#475569' }}>{'}'}</span>
        </SyntaxLine>
      );
      nodes.push(<SyntaxLine key={keyCounter++}>&nbsp;</SyntaxLine>);
    });
  });

  return nodes;
}

const ExportModal: React.FC = () => {
  const { components, showExport, setShowExport } = useStore();
  const [copied, setCopied] = useState(false);

  if (!showExport) return null;

  const plainCSS = generatePlainCSS(components);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainCSS);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = plainCSS;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        background: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.3s ease forwards',
      }}
      onClick={() => setShowExport(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: '80vh',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalFadeIn 0.3s ease forwards',
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
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>
              导出 CSS 代码
            </h2>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0 0' }}>
              按组件类型分组，共 {components.length} 个组件
            </p>
          </div>
          <button
            onClick={() => setShowExport(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#475569';
              (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 20px',
          }}
        >
          {components.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#94a3b8',
                padding: 40,
                fontSize: 13,
              }}
            >
              画布上暂无组件，请先从左侧拖拽添加
            </div>
          ) : (
            <pre
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #e2e8f0',
                overflow: 'auto',
                whiteSpace: 'pre',
                margin: 0,
                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.7,
                tabSize: 2,
              }}
            >
              {renderHighlighted(components)}
            </pre>
          )}
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            onClick={() => setShowExport(false)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
            }}
          >
            关闭
          </button>
          <button
            onClick={handleCopy}
            disabled={components.length === 0}
            style={{
              display: 'inline-flex',
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
              transition: 'background 0.2s, transform 0.1s',
              opacity: components.length === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (components.length > 0) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                if (!copied) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                }
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              if (!copied) {
                (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
              }
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
