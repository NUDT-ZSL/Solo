import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ComponentRenderer from '../component-renderer/ComponentRenderer';
import { generateComponentCode } from '../utils/codeGenerator';
import { ComponentItem, ComponentType, ComponentProps, ComponentConfig, PropertyField } from '../types';

interface PlatformLayoutProps {
  componentList: ComponentItem[];
  currentComponentId: ComponentType;
  componentProps: ComponentProps;
  componentConfigs: Record<string, ComponentConfig>;
  onComponentChange: (id: ComponentType) => void;
  onPropsChange: (id: ComponentType, key: string, value: any) => void;
  onStatusChange: (id: ComponentType, status: string) => void;
}

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CodeHighlight: React.FC<{ code: string }> = ({ code }) => {
  const highlightJSX = (input: string) => {
    let result = input;
    result = result.replace(/(<\/?)([A-Z]\w*)/g, (_m, p1, p2) => {
      return `${p1}<span style="color:#569CD6">${p2}</span>`;
    });
    result = result.replace(/(\s)([a-zA-Z_][a-zA-Z0-9_]*)(=)/g, (_m, p1, p2, p3) => {
      return `${p1}<span style="color:#9CDCFE">${p2}</span>${p3}`;
    });
    result = result.replace(/('[^']*')/g, '<span style="color:#CE9178">$1</span>');
    result = result.replace(/(\{[^}]*\})/g, (m) => {
      const inner = m.slice(1, -1);
      if (inner === 'true' || inner === 'false') {
        return `{<span style="color:#569CD6">${inner}</span>}`;
      }
      if (!isNaN(Number(inner))) {
        return `{<span style="color:#B5CEA8">${inner}</span>}`;
      }
      return m;
    });
    result = result.replace(/(\/>|<\/|<|>)/g, (m) => {
      return `<span style="color:#808080">${m}</span>`;
    });
    return result;
  };

  const lines = code.split('\n');

  return (
    <div
      className="fade-in"
      style={{
        fontFamily: "'Fira Code', monospace",
        fontSize: '13px',
        lineHeight: 1.6,
        color: '#D4D4D4',
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', minHeight: '20px' }}>
          <span style={{ color: '#6E7681', width: '36px', textAlign: 'right', paddingRight: '16px', userSelect: 'none', flexShrink: 0 }}>
            {i + 1}
          </span>
          <span style={{ whiteSpace: 'pre-wrap', flex: 1 }} dangerouslySetInnerHTML={{ __html: highlightJSX(line) || '&nbsp;' }} />
        </div>
      ))}
    </div>
  );
};

const PropertyControl: React.FC<{
  field: PropertyField;
  value: any;
  onChange: (key: string, value: any) => void;
}> = ({ field, value, onChange }) => {
  const baseLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#94A3B8',
    marginBottom: '6px',
  };

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #334155',
    borderRadius: '6px',
    backgroundColor: '#0F172A',
    color: '#E2E8F0',
    outline: 'none',
    transition: 'all 200ms ease',
    boxSizing: 'border-box',
  };

  const renderControl = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.key, e.target.value)}
            style={{
              ...baseInputStyle,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
            onBlur={(e) => (e.target.style.borderColor = '#334155')}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value || 0}
            onChange={(e) => onChange(field.key, parseInt(e.target.value) || 0)}
            style={baseInputStyle}
            onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
            onBlur={(e) => (e.target.style.borderColor = '#334155')}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.key, e.target.value)}
            rows={3}
            style={{ ...baseInputStyle, resize: 'vertical', minHeight: '72px' }}
            onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
            onBlur={(e) => (e.target.style.borderColor = '#334155')}
          />
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            style={{ ...baseInputStyle, cursor: 'pointer' }}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'boolean':
        return (
          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '10px', userSelect: 'none' }}>
            <div
              style={{
                position: 'relative',
                width: '40px',
                height: '22px',
                backgroundColor: value ? '#3B82F6' : '#334155',
                borderRadius: '11px',
                transition: 'background-color 200ms ease',
                flexShrink: 0,
              }}
              onClick={() => onChange(field.key, !value)}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: value ? '20px' : '2px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  transition: 'left 200ms ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            </div>
            <span style={{ fontSize: '13px', color: '#E2E8F0' }}>
              {value ? '开启' : '关闭'}
            </span>
          </label>
        );
      case 'color':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: value || '#2563EB',
                border: '2px solid #334155',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
            <input
              type="color"
              value={value || '#2563EB'}
              onChange={(e) => onChange(field.key, e.target.value)}
              style={{
                position: 'absolute',
                width: '36px',
                height: '36px',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              style={{ ...baseInputStyle, fontFamily: "'Fira Code', monospace" }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ marginBottom: '16px', position: field.type === 'color' ? 'relative' : undefined }}>
      <label style={baseLabelStyle}>{field.label}</label>
      {renderControl()}
    </div>
  );
};

const PlatformLayout: React.FC<PlatformLayoutProps> = ({
  componentList,
  currentComponentId,
  componentProps,
  componentConfigs,
  onComponentChange,
  onPropsChange,
  onStatusChange,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(35);
  const [rightPanelWidth, setRightPanelWidth] = useState(35);
  const [copied, setCopied] = useState(false);
  const leftDragRef = useRef(false);
  const rightDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConfig = componentConfigs[currentComponentId];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLeftDragStart = useCallback((e: React.MouseEvent) => {
    leftDragRef.current = true;
    e.preventDefault();
  }, []);

  const handleRightDragStart = useCallback((e: React.MouseEvent) => {
    rightDragRef.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const mainAreaWidth = containerRect.width;

      if (leftDragRef.current) {
        const newWidth = ((e.clientX - containerRect.left) / mainAreaWidth) * 100;
        const clampedWidth = Math.max(150 / mainAreaWidth * 100, Math.min(60, newWidth));
        const remainingWidth = 100 - clampedWidth;
        if (remainingWidth - rightPanelWidth >= 150 / mainAreaWidth * 100) {
          setLeftPanelWidth(clampedWidth);
        }
      }

      if (rightDragRef.current) {
        const newWidth = ((containerRect.right - e.clientX) / mainAreaWidth) * 100;
        const clampedWidth = Math.max(150 / mainAreaWidth * 100, Math.min(60, newWidth));
        const remainingWidth = 100 - clampedWidth;
        if (remainingWidth - leftPanelWidth >= 150 / mainAreaWidth * 100) {
          setRightPanelWidth(clampedWidth);
        }
      }
    };

    const handleMouseUp = () => {
      leftDragRef.current = false;
      rightDragRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftPanelWidth, rightPanelWidth]);

  const generatedCode = useMemo(() => {
    return generateComponentCode(currentComponentId, componentProps);
  }, [currentComponentId, componentProps]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [generatedCode]);

  const handlePropsChange = useCallback((key: string, value: any) => {
    onPropsChange(currentComponentId, key, value);
  }, [currentComponentId, onPropsChange]);

  const handleStatusChange = useCallback((status: string) => {
    onStatusChange(currentComponentId, status);
  }, [currentComponentId, onStatusChange]);

  const currentStatus = (componentProps as any).status || 'default';

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#1E293B',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #334155',
    overflow: 'auto',
  };

  const dividerStyle: React.CSSProperties = {
    width: '8px',
    backgroundColor: '#1E293B',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 200ms ease',
  };

  if (isMobile) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A' }}>
        <div style={{
          height: '56px',
          backgroundColor: '#1E293B',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#E2E8F0' }}>
            🎨 组件展示平台
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: '#1E293B',
          borderBottom: '1px solid #334155',
          overflowX: 'auto',
          flexShrink: 0,
        }}>
          {componentList.map((item) => (
            <button
              key={item.id}
              onClick={() => onComponentChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: currentComponentId === item.id ? '#334155' : 'transparent',
                color: currentComponentId === item.id ? '#E2E8F0' : '#94A3B8',
                fontSize: '13px',
                fontWeight: currentComponentId === item.id ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 200ms ease',
                whiteSpace: 'nowrap',
                borderLeft: currentComponentId === item.id ? '4px solid #3B82F6' : '4px solid transparent',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ ...panelStyle }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>
              ⚙️ 属性控制
            </h4>
            {currentConfig?.properties.map((field) => (
              <PropertyControl
                key={field.key}
                field={field}
                value={(componentProps as any)[field.key]}
                onChange={handlePropsChange}
              />
            ))}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94A3B8', marginBottom: '6px' }}>
                组件状态
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentConfig?.statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: currentStatus === opt.value ? '#3B82F6' : '#334155',
                      backgroundColor: currentStatus === opt.value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: currentStatus === opt.value ? '#3B82F6' : '#94A3B8',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...panelStyle, padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>
              🖼️ 实时渲染
            </h4>
            <ComponentRenderer componentType={currentComponentId} props={componentProps} />
          </div>

          <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #334155',
              backgroundColor: '#263449',
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>
                📝 代码预览
              </h4>
              <button
                onClick={handleCopy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: copied ? '#10B981' : '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#1E1E1E', overflow: 'auto' }}>
              <CodeHighlight code={generatedCode} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A' }}>
        <div style={{
          height: '56px',
          backgroundColor: '#1E293B',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          flexShrink: 0,
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>🎨</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#E2E8F0' }}>
              组件展示与调试平台
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
            }} />
            <span>运行中</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{
            width: '240px',
            backgroundColor: '#1E293B',
            borderRight: '1px solid #334155',
            padding: '16px 0',
            overflowY: 'auto',
            flexShrink: 0,
          }}>
            <div style={{ padding: '0 16px 12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              组件库
            </div>
            {componentList.map((item) => (
              <div
                key={item.id}
                onClick={() => onComponentChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  backgroundColor: currentComponentId === item.id ? '#334155' : 'transparent',
                  borderLeft: currentComponentId === item.id ? '4px solid #3B82F6' : '4px solid transparent',
                  color: currentComponentId === item.id ? '#E2E8F0' : '#94A3B8',
                  fontWeight: currentComponentId === item.id ? 500 : 400,
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => {
                  if (currentComponentId !== item.id) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#263449';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentComponentId !== item.id) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>

          <div ref={containerRef} style={{ flex: 1, display: 'flex', padding: '16px', gap: 0, minWidth: 0 }}>
            <div style={{ ...panelStyle, width: `${leftPanelWidth}%`, minWidth: '150px' }}>
              <h4 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 600, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚙️</span> 属性控制面板
              </h4>
              {currentConfig?.properties.map((field) => (
                <PropertyControl
                  key={field.key}
                  field={field}
                  value={(componentProps as any)[field.key]}
                  onChange={handlePropsChange}
                />
              ))}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94A3B8', marginBottom: '8px' }}>
                  组件状态预览
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {currentConfig?.statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: currentStatus === opt.value ? '#3B82F6' : '#334155',
                        backgroundColor: currentStatus === opt.value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: currentStatus === opt.value ? '#60A5FA' : '#94A3B8',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={dividerStyle}
              onMouseDown={handleLeftDragStart}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '2px', height: '20px', backgroundColor: '#475569', borderRadius: '1px' }} />
              </div>
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: '150px',
              gap: '16px',
            }}>
              <div style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🖼️</span> 实时渲染区
                </h4>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ComponentRenderer componentType={currentComponentId} props={componentProps} />
                </div>
              </div>
            </div>

            <div
              style={dividerStyle}
              onMouseDown={handleRightDragStart}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '2px', height: '20px', backgroundColor: '#475569', borderRadius: '1px' }} />
              </div>
            </div>

            <div style={{ ...panelStyle, width: `${rightPanelWidth}%`, minWidth: '150px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid #334155',
                backgroundColor: '#263449',
                flexShrink: 0,
              }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📝</span> 代码预览
                </h4>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: copied ? '#10B981' : '#94A3B8',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <div style={{ flex: 1, padding: '16px', backgroundColor: '#1E1E1E', overflow: 'auto' }}>
                <CodeHighlight code={generatedCode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default PlatformLayout;
