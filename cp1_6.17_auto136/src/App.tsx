import { useState, useCallback } from 'react';
import PlatformLayout from './platform-module/PlatformLayout';
import { COMPONENT_LIST, COMPONENT_CONFIGS } from './config/components';
import { ComponentType, ComponentProps } from './types';

/**
 * 应用主组件 - App
 *
 * 数据流向总览：
 * ┌─────────────┐     currentComponentId      ┌─────────────────────┐
 * │   App.tsx   │ ──────────────────────────→ │  PlatformLayout.tsx  │
 * │  (状态管理)  │ ←────────────────────────── │  (布局与交互)        │
 * └─────────────┘  onComponentChange/Props    └─────────┬───────────┘
 *       ↑                                              │ componentType + props
 *       │                                              ↓
 *       │ componentPropsMap                    ┌─────────────────────┐
 *       └────────────────────────────────────── │ ComponentRenderer   │
 *                                                │ (动态组件渲染)      │
 *                                                └─────────────────────┘
 *
 * 职责说明：
 * 1. 初始化组件列表默认配置（从 COMPONENT_CONFIGS 读取）
 * 2. 管理当前选中的组件ID (currentComponentId)
 * 3. 管理所有组件的属性状态集合 (componentPropsMap)
 * 4. 接收 PlatformLayout 的事件回调，更新对应状态
 * 5. 将当前组件数据分发给 PlatformLayout 和 ComponentRenderer
 */
function App() {
  // 当前选中的组件ID，传递给 PlatformLayout 用于高亮和渲染
  const [currentComponentId, setCurrentComponentId] = useState<ComponentType>('button');

  // 所有组件的属性配置映射，key为组件类型，value为对应props
  // 从 COMPONENT_CONFIGS 初始化每个组件的默认属性
  const [componentPropsMap, setComponentPropsMap] = useState<Record<ComponentType, ComponentProps>>(() => {
    const map = {} as Record<ComponentType, ComponentProps>;
    COMPONENT_LIST.forEach(item => {
      map[item.id] = { ...COMPONENT_CONFIGS[item.id].defaultProps };
    });
    return map;
  });

  // 处理组件切换事件 - 从 PlatformLayout 接收，更新 currentComponentId
  const handleComponentChange = useCallback((componentId: ComponentType) => {
    setCurrentComponentId(componentId);
  }, []);

  // 处理属性变化事件 - 从 PlatformLayout 接收，更新指定组件的属性
  const handlePropsChange = useCallback((componentId: ComponentType, key: string, value: any) => {
    setComponentPropsMap(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        [key]: value,
      },
    }));
  }, []);

  // 处理状态切换事件 - 从 PlatformLayout 接收，更新指定组件的 status 属性
  const handleStatusChange = useCallback((componentId: ComponentType, status: string) => {
    setComponentPropsMap(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        status,
      },
    }));
  }, []);

  // 将数据和事件分发给平台框架模块 (PlatformLayout)
  return (
    <PlatformLayout
      // 静态配置数据
      componentList={COMPONENT_LIST}
      componentConfigs={COMPONENT_CONFIGS}
      // 动态状态数据
      currentComponentId={currentComponentId}
      componentProps={componentPropsMap[currentComponentId]}
      // 事件回调 - 子组件通过这些回调通知父组件状态变化
      onComponentChange={handleComponentChange}
      onPropsChange={handlePropsChange}
      onStatusChange={handleStatusChange}
    />
  );
}

export default App;
