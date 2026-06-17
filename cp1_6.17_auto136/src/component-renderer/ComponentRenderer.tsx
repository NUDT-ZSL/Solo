import React, { memo, useMemo } from 'react';
import { ComponentType, ComponentProps } from '../types';
import Button from './components/Button';
import Input from './components/Input';
import Modal from './components/Modal';
import Dropdown from './components/Dropdown';

interface ComponentRendererProps {
  componentType: ComponentType;
  props: ComponentProps;
}

/**
 * 组件渲染模块 - ComponentRenderer
 *
 * 数据流向：
 * 1. 接收 PlatformLayout 传递的 componentType 和 props 配置
 * 2. 根据 componentType 通过 useMemo 动态计算要渲染的组件实例
 * 3. 将 props 展开传递给具体的组件实现（Button/Input/Modal/Dropdown）
 * 4. 在实时渲染区内展示渲染结果
 *
 * 性能优化：
 * - 外层使用 React.memo 避免不必要的重渲染
 * - 组件实例使用 useMemo 缓存，仅当 componentType 或 props 变化时重新计算
 * - 确保属性变化后 30ms 内完成渲染更新
 */
const ComponentRenderer: React.FC<ComponentRendererProps> = memo(({ componentType, props }) => {
  // useMemo 缓存渲染结果，仅依赖项变化时重新计算组件
  const renderedComponent = useMemo(() => {
    switch (componentType) {
      case 'button':
        return <Button {...(props as any)} />;
      case 'input':
        return <Input {...(props as any)} />;
      case 'modal':
        return <Modal {...(props as any)} />;
      case 'dropdown':
        return <Dropdown {...(props as any)} />;
      default:
        return <div style={{ color: '#94A3B8' }}>未知组件类型</div>;
    }
  }, [componentType, props]);

  const renderAreaStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '24px',
    minHeight: '280px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
    position: componentType === 'modal' ? 'relative' : undefined,
    overflow: componentType === 'modal' ? 'visible' : undefined,
  };

  return (
    <div
      className="slide-in"
      style={renderAreaStyle}
      key={componentType}
    >
      {renderedComponent}
    </div>
  );
});

ComponentRenderer.displayName = 'ComponentRenderer';

export default ComponentRenderer;
