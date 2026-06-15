import React, { memo, useCallback } from 'react';
import { Square, Type, AlertCircle, ToggleLeft } from 'lucide-react';
import { useComponent } from '@/state/componentStore';
import { ComponentType } from '@/types/component';
import './ComponentList.css';

const iconMap: Record<ComponentType, React.ReactNode> = {
  button: <Square size={18} />,
  input: <Type size={18} />,
  alert: <AlertCircle size={18} />,
  switch: <ToggleLeft size={18} />,
};

const ComponentList: React.FC = () => {
  const { components, selectedComponentId, selectComponent } = useComponent();

  const handleSelect = useCallback((id: ComponentType) => {
    selectComponent(id);
  }, [selectComponent]);

  return (
    <aside className="component-list">
      <div className="component-list__header">
        <h2 className="component-list__title">组件库</h2>
        <span className="component-list__count">{components.length} 个组件</span>
      </div>
      <nav className="component-list__nav">
        {components.map((component) => (
          <button
            key={component.id}
            className={`component-list__item ${
              selectedComponentId === component.id ? 'component-list__item--active' : ''
            }`}
            onClick={() => handleSelect(component.id)}
            title={component.description}
          >
            <span className="component-list__icon">{iconMap[component.id]}</span>
            <span className="component-list__name">{component.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

ComponentList.displayName = 'ComponentList';

export default memo(ComponentList);
