import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { ComponentType, ComponentItem, ComponentState } from '@/types/component';

const COMPONENTS: ComponentItem[] = [
  {
    id: 'button',
    name: '按钮 Button',
    description: '支持主要、次要、文字三种变体',
    states: ['default', 'hover', 'focus', 'loading', 'disabled', 'success', 'error'],
    variants: [
      { id: 'primary', name: '主要按钮', props: { variant: 'primary' } },
      { id: 'secondary', name: '次要按钮', props: { variant: 'secondary' } },
      { id: 'text', name: '文字按钮', props: { variant: 'text' } },
    ],
    defaultProps: { children: '按钮' },
  },
  {
    id: 'input',
    name: '输入框 Input',
    description: '支持文本、密码、搜索三种类型',
    states: ['default', 'hover', 'focus', 'loading', 'disabled', 'success', 'error'],
    variants: [
      { id: 'text', name: '文本输入', props: { type: 'text' } },
      { id: 'password', name: '密码输入', props: { type: 'password' } },
      { id: 'search', name: '搜索输入', props: { type: 'search' } },
    ],
    defaultProps: { placeholder: '请输入内容' },
  },
  {
    id: 'alert',
    name: '提示条 Alert',
    description: '支持信息、警告、错误、成功四种类型',
    states: ['default', 'hover', 'disabled'],
    variants: [
      { id: 'info', name: '信息提示', props: { type: 'info' } },
      { id: 'warning', name: '警告提示', props: { type: 'warning' } },
      { id: 'error', name: '错误提示', props: { type: 'error' } },
      { id: 'success', name: '成功提示', props: { type: 'success' } },
    ],
    defaultProps: { message: '这是一条提示信息' },
  },
  {
    id: 'switch',
    name: '开关 Switch',
    description: '支持开、关、禁用三种状态',
    states: ['default', 'hover', 'focus', 'disabled'],
    variants: [
      { id: 'on', name: '开启状态', props: { checked: true } },
      { id: 'off', name: '关闭状态', props: { checked: false } },
    ],
    defaultProps: { label: '开关' },
  },
];

interface ComponentContextType {
  components: ComponentItem[];
  selectedComponentId: ComponentType;
  selectedComponent: ComponentItem;
  selectComponent: (id: ComponentType) => void;
  getStateLabel: (state: ComponentState) => string;
}

const ComponentContext = createContext<ComponentContextType | undefined>(undefined);

interface ComponentProviderProps {
  children: ReactNode;
}

const STATE_LABELS: Record<ComponentState, string> = {
  default: '默认',
  hover: '悬停',
  focus: '聚焦',
  loading: '加载中',
  disabled: '禁用',
  success: '成功',
  error: '错误',
};

export const ComponentProvider: React.FC<ComponentProviderProps> = ({ children }) => {
  const [selectedComponentId, setSelectedComponentId] = useState<ComponentType>('button');

  const selectComponent = useCallback((id: ComponentType) => {
    setSelectedComponentId(id);
  }, []);

  const getStateLabel = useCallback((state: ComponentState): string => {
    return STATE_LABELS[state];
  }, []);

  const selectedComponent = useMemo(() => {
    return COMPONENTS.find(c => c.id === selectedComponentId) || COMPONENTS[0];
  }, [selectedComponentId]);

  const value = useMemo(
    () => ({
      components: COMPONENTS,
      selectedComponentId,
      selectedComponent,
      selectComponent,
      getStateLabel,
    }),
    [selectedComponentId, selectedComponent, selectComponent, getStateLabel]
  );

  return (
    <ComponentContext.Provider value={value}>
      {children}
    </ComponentContext.Provider>
  );
};

export const useComponent = (): ComponentContextType => {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error('useComponent must be used within a ComponentProvider');
  }
  return context;
};
