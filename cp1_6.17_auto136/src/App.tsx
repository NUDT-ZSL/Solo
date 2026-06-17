import { useState, useCallback } from 'react';
import PlatformLayout from './platform-module/PlatformLayout';
import { COMPONENT_LIST, COMPONENT_CONFIGS } from './config/components';
import { ComponentType, ComponentProps } from './types';

function App() {
  const [currentComponentId, setCurrentComponentId] = useState<ComponentType>('button');
  const [componentPropsMap, setComponentPropsMap] = useState<Record<ComponentType, ComponentProps>>(() => {
    const map = {} as Record<ComponentType, ComponentProps>;
    COMPONENT_LIST.forEach(item => {
      map[item.id] = { ...COMPONENT_CONFIGS[item.id].defaultProps };
    });
    return map;
  });

  const handleComponentChange = useCallback((componentId: ComponentType) => {
    setCurrentComponentId(componentId);
  }, []);

  const handlePropsChange = useCallback((componentId: ComponentType, key: string, value: any) => {
    setComponentPropsMap(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        [key]: value,
      },
    }));
  }, []);

  const handleStatusChange = useCallback((componentId: ComponentType, status: string) => {
    setComponentPropsMap(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        status,
      },
    }));
  }, []);

  return (
    <PlatformLayout
      componentList={COMPONENT_LIST}
      currentComponentId={currentComponentId}
      componentProps={componentPropsMap[currentComponentId]}
      componentConfigs={COMPONENT_CONFIGS}
      onComponentChange={handleComponentChange}
      onPropsChange={handlePropsChange}
      onStatusChange={handleStatusChange}
    />
  );
}

export default App;
