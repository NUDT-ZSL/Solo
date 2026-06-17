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

const ComponentRenderer: React.FC<ComponentRendererProps> = memo(({ componentType, props }) => {
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
    position: componentType === 'modal' ? 'relative' : undefined,
    overflow: componentType === 'modal' ? 'visible' : undefined,
  };

  return (
    <div className="slide-in" style={renderAreaStyle} key={componentType}>
      {renderedComponent}
    </div>
  );
});

ComponentRenderer.displayName = 'ComponentRenderer';

export default ComponentRenderer;
