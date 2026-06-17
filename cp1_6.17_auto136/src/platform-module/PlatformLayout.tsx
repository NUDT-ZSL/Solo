import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Highlight, themes } from 'prism-react-renderer';
import ComponentRenderer from '../component-renderer/ComponentRenderer';
import { generateComponentCode } from '../utils/codeGenerator';
import { useMediaQuery } from '../hooks/useMediaQuery';
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

/**
 * 代码高亮组件 - CodeHighlight
 *
 * 使用 prism-react-renderer 对 JSX 代码进行语法高亮
 * 支持关键字、字符串、标签、属性等语法着色
 * 包含行号显示、淡入动画效果
 */
const CodeHighlight: React.FC<{ code: string }> = ({ code }) => {
  return (
    <Highlight
      theme={themes.nightOwl}
      code={code}
      language="jsx"
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`fade-in ${className}`}
          style={{
            ...style,
            margin: 0,
            padding: 0,
            background: 'transparent',
            fontFamily: "'Fira Code', monospace",
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })} style={{ display: 'flex', minHeight: '20px' }}>
              <span
                style={{
                  color: '#6E7681',
                  width: '36px',
                  textAlign: 'right',
                  paddingRight: '16px',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </span>
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};

/**
 * 属性控制组件 - PropertyControl
 *
 * 根据属性字段类型动态渲染对应的表单控件
 * 支持类型：text、number、select、boolean、color、textarea
 * 属性变化实时通知父组件
 */
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
            style={baseInputStyle}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            <input
              type="color"
              value={value || '#2563EB'}
              onChange={(e) => onChange(field.key, e.target.value)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '2px solid #334155',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
                background: 'none',
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
    <div style={{ marginBottom: '16px' }}>
      <label style={baseLabelStyle}>{field.label}</label>
      {renderControl()}
    </div>
  );
};

/**
 * 平台框架模块 - PlatformLayout
 *
 * 数据流向：
 * 输入（从 App 接收）：
 *   - componentList: 组件列表数据
 *   - currentComponentId: 当前选中的组件ID
 *   - componentProps: 当前组件的属性配置
 *   - componentConfigs: 所有组件的配置元数据
 *   - onComponentChange: 组件切换回调 → 通知 App 更新 currentComponentId
 *   - onPropsChange: 属性变化回调 → 通知 App 更新 componentPropsMap
 *   - onStatusChange: 状态切换回调 → 通知 App 更新组件 status
 *
 * 输出（向子组件传递）：
 *   - 向 ComponentRenderer 传递 componentType 和 componentProps
 *   - 向代码预览区传递 generatedCode（通过 codeGenerator 生成）
 *   - 向属性控制面板传递 properties 配置和当前值
 *
 * 内部管理：
 *   - 左右面板宽度状态（拖拽调整）
 *   - 复制按钮状态
 *   - 响应式布局状态（通过 useMediaQuery）
 */
const PlatformLayout: React.FC<PlatformLayoutProps> = ({
  componentList,
  currentComponentId,
  componentProps,
  componentConfigs,
  onComponentChange,
  onPropsChange,
  onStatusChange,
}) => {
  // 使用 useMediaQuery hook 检测移动端（viewport < 768px）
  const isMobile = useMediaQuery('(max-width: 767px)');

  // 左右面板宽度（百分比，相对于主显示区）
  const [leftPanelWidth, setLeftPanelWidth] = useState(35);
  const [rightPanelWidth, setRightPanelWidth] = useState(35);
  const [copied, setCopied] = useState(false);

  // 拖拽状态引用
  const leftDragRef = useRef(false);
  const rightDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 当前组件配置（从 componentConfigs 中根据 ID 获取）
  const currentConfig = componentConfigs[currentComponentId];

  // ========== 面板拖拽逻辑 ==========
  // 拖拽边界限制：
  // - 最小宽度：150px
  // - 最大宽度：占主显示区的 60%

  const handleLeftDragStart = useCallback((e: React.MouseEvent) => {
    leftDragRef.current = true;
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleRightDragStart = useCallback((e: React.MouseEvent) => {
    rightDragRef.current = true;
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const mainAreaWidth = containerRect.width;

      // 左面板拖拽（属性控制面板）
      if (leftDragRef.current) {
        const newWidthPct = ((e.clientX - containerRect.left) / mainAreaWidth) * 100;
        const minWidthPct = (150 / mainAreaWidth) * 100;
        const maxWidthPct = 60;

        // 边界限制：最小 150px，最大 60%
        let clampedWidth = Math.max(minWidthPct, Math.min(maxWidthPct, newWidthPct));

        // 确保右面板有至少 150px 的空间
        const rightMinWidthPct = (150 / mainAreaWidth) * 100;
        const middlePanelMinPct = (150 / mainAreaWidth) * 100;
        const remainingForRight = 100 - clampedWidth - middlePanelMinPct;

        if (remainingForRight < rightMinWidthPct) {
          clampedWidth = 100 - middlePanelMinPct - rightMinWidthPct;
        }

        setLeftPanelWidth(clampedWidth);
      }

      // 右面板拖拽（代码预览区）
      if (rightDragRef.current) {
        const newWidthPct = ((containerRect.right - e.clientX) / mainAreaWidth) * 100;
        const minWidthPct = (150 / mainAreaWidth) * 100;
        const maxWidthPct = 60;

        // 边界限制：最小 150px，最大 60%
        let clampedWidth = Math.max(minWidthPct, Math.min(maxWidthPct, newWidthPct));

        // 确保左面板有至少 150px 的空间
        const leftMinWidthPct = (150 / mainAreaWidth) * 100;
        const middlePanelMinPct = (150 / mainAreaWidth) * 100;
        const remainingForLeft = 100 - clampedWidth - middlePanelMinPct;

        if (remainingForLeft < leftMinWidthPct) {
          clampedWidth = 100 - middlePanelMinPct - leftMinWidthPct;
        }

        setRightPanelWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      leftDragRef.current = false;
      rightDragRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 生成代码（useMemo 缓存，仅当组件或属性变化时重新生成）
  const generatedCode = useMemo(() => {
    return generateComponentCode(currentComponentId, componentProps);
  }, [currentComponentId, componentProps]);

  // 复制代码到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [generatedCode]);

  // 属性变化处理 - 包装 onPropsChange，传递当前组件ID
  const handlePropsChange = useCallback((key: string, value: any) => {
    onPropsChange(currentComponentId, key, value);
  }, [currentComponentId, onPropsChange]);

  // 状态变化处理 - 包装 onStatusChange，传递当前组件ID
  const handleStatusChange = useCallback((status: string) => {
    onStatusChange(currentComponentId, status);
  }, [currentComponentId, onStatusChange]);

  const currentStatus = (componentProps as any).status || 'default';

  // ========== 样式定义 ==========
  const panelStyle: React.CSSProperties = {
    backgroundColor: '#1E293B',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #334155',
    overflow: 'auto',
  };

  // 分隔条样式：宽度 8px，颜色 #E0E0E0（悬停时）
  const dividerStyle: React.CSSProperties = {
    width: '8px',
    backgroundColor: 'transparent',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 200ms ease',
    position: 'relative',
  };

  const dividerInnerStyle: React.CSSProperties = {
    width: '2px',
    height: '24px',
    backgroundColor: '#475569',
    borderRadius: '1px',
  };

  // ========== 移动端布局 ==========
  if (isMobile) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A' }}>
        {/* 顶部导航栏 */}
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

        {/* 顶部水平标签栏（左侧组件列表在移动端变为顶部） */}
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

        {/* 垂直堆叠：属性面板在上，渲染区在中，代码预览在下 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 属性控制面板（上） */}
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

          {/* 实时渲染区（中） */}
          <div style={{ ...panelStyle, padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>
              🖼️ 实时渲染
            </h4>
            <ComponentRenderer componentType={currentComponentId} props={componentProps} />
          </div>

          {/* 代码预览区（下） */}
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

  // ========== 桌面端布局 ==========
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A' }}>
        {/* 顶部导航栏 - 高度 56px */}
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
          {/* 左侧组件列表 */}
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
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
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

          {/* 右侧主显示区 */}
          <div ref={containerRef} style={{ flex: 1, display: 'flex', padding: '16px', gap: 0, minWidth: 0 }}>
            {/* 左侧属性控制面板 - 可拖拽调整宽度 */}
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

            {/* 左分隔条 - 宽 8px，悬停时颜色 #E0E0E0 */}
            <div
              style={dividerStyle}
              onMouseDown={handleLeftDragStart}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E0E0E0';
              }}
              onMouseLeave={(e) => {
                if (!leftDragRef.current) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={dividerInnerStyle} />
            </div>

            {/* 中间实时渲染区 */}
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

            {/* 右分隔条 - 宽 8px，悬停时颜色 #E0E0E0 */}
            <div
              style={dividerStyle}
              onMouseDown={handleRightDragStart}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E0E0E0';
              }}
              onMouseLeave={(e) => {
                if (!rightDragRef.current) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={dividerInnerStyle} />
            </div>

            {/* 右侧代码预览区 - 可拖拽调整宽度 */}
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
