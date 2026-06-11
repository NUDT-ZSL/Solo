/**
 * componentStore.tsx - 组件数据管理模块
 *
 * ============================================================
 * 模块职责
 * ============================================================
 * 管理内置组件库的静态元数据（组件 ID、名称、状态列表、变体列表）
 * 和当前选中的组件 ID。通过 React Context 向下分发，供
 * ComponentList（导航）和 ComponentPreview（预览）共同消费。
 *
 * ============================================================
 * 数据流向图
 * ============================================================
 *
 *       ┌──────────────────────────────────┐
 *       │   COMPONENTS (静态常量数据)      │
 *       │   - 4 个组件定义                 │
 *       │   - 每个组件包含 states/variants  │
 *       └──────────────┬───────────────────┘
 *                      │
 *                      ▼
 *       ComponentProvider 初始化
 *       - selectedComponentId = 'button'
 *                      │
 *        ┌─────────────┴─────────────┐
 *        ▼                           ▼
 *   ComponentList               ComponentPreview
 *   - 渲染导航列表               - 读取 selectedComponent
 *   - 高亮选中项                 - 渲染状态矩阵
 *        │                           │
 *        │ 点击                      │
 *        ▼                           ▼
 *   selectComponent(id)       selectedComponent 更新
 *        │                           │
 *        └───────────┬───────────────┘
 *                    ▼
 *            setSelectedComponentId
 *                    │
 *                    ▼
 *            useMemo 重新计算
 *            selectedComponent
 *                    │
 *                    ▼
 *         ComponentPreview 重新渲染
 *         （显示新组件的所有状态）
 *
 * ============================================================
 * 与 themeStore 的关系
 * ============================================================
 * - componentStore 与 themeStore **互相独立，没有直接依赖**
 * - componentStore 只管「有哪些组件、当前看哪个」
 * - themeStore 只管「主题长什么样」
 * - 两者在 App.tsx 中被嵌套 Provider 组合使用：
 *     <ThemeProvider>
 *       <ComponentProvider>
 *         {...}
 *       </ComponentProvider>
 *     </ThemeProvider>
 * - 组件预览区的最终渲染效果 = 组件数据(componentStore) + 主题样式(themeStore)
 *   但两者数据层面互不影响，是正交的
 *
 * ============================================================
 * 调用关系一览
 * ============================================================
 * 上游（Provider 层）：
 *   - App.tsx: 用 <ComponentProvider> 包裹应用
 *
 * 消费方（读取数据）：
 *   - ComponentList.tsx: 读取 components 列表 + selectedComponentId
 *     → 渲染导航，高亮选中项
 *   - ComponentPreview.tsx: 读取 selectedComponent + getStateLabel
 *     → 渲染当前组件的所有状态矩阵
 *
 * 操作方（修改状态）：
 *   - ComponentList.tsx: 调用 selectComponent(id) 切换当前组件
 *
 * ============================================================
 * 性能说明
 * ============================================================
 * - components 是静态常量，不会变化，不会触发重渲染
 * - 只有 selectedComponentId 变化时，消费组件才会重渲染
 * - 切换组件时仅 ComponentList 和 ComponentPreview 重渲染
 * - ThemeEditor 不会因为组件切换而重渲染（它不消费 componentStore）
 * - useMemo 缓存 selectedComponent 和 context value，避免引用变更
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type ComponentType, type ComponentItem, type ComponentState } from '@/types/component';

/**
 * 内置组件库的静态数据
 * 包含四个组件：按钮、输入框、提示条、开关
 * 每个组件定义了支持的状态列表和变体列表
 *
 * 注意：这是静态常量，整个应用生命周期内不会变化
 * 可以抽离到单独的数据文件，但为了内聚性暂时放在这里
 */
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

/**
 * ComponentContext 类型定义
 * - components: 全部组件的元数据列表
 * - selectedComponentId: 当前选中的组件 ID
 * - selectedComponent: 当前选中的完整组件对象（派生值）
 * - selectComponent: 切换选中组件的方法
 * - getStateLabel: 状态枚举值 → 中文标签的映射函数
 */
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

/** 状态英文 → 中文标签的映射表 */
const STATE_LABELS: Record<ComponentState, string> = {
  default: '默认',
  hover: '悬停',
  focus: '聚焦',
  loading: '加载中',
  disabled: '禁用',
  success: '成功',
  error: '错误',
};

/**
 * ComponentProvider - 组件数据提供者
 *
 * 内部实现：
 *   1. useState 管理 selectedComponentId
 *   2. useMemo 从 components 中派生出 selectedComponent
 *   3. useCallback 包装 selectComponent / getStateLabel 保持引用稳定
 *   4. useMemo 包装 context value
 */
export const ComponentProvider = ({ children }: ComponentProviderProps) => {
  const [selectedComponentId, setSelectedComponentId] = useState<ComponentType>('button');

  /**
   * selectComponent - 切换当前选中的组件
   * @param id - 目标组件 ID
   *
   * 数据流向：
   *   ComponentList 点击事件
   *     → setSelectedComponentId(id)
   *     → state 更新
   *     → useMemo 重新计算 selectedComponent
   *     → ComponentPreview 接收到新数据并重渲染
   */
  const selectComponent = useCallback((id: ComponentType) => {
    setSelectedComponentId(id);
  }, []);

  /**
   * getStateLabel - 状态值转中文标签
   * @param state - 状态枚举值
   * @returns 对应的中文标签
   */
  const getStateLabel = useCallback((state: ComponentState): string => {
    return STATE_LABELS[state];
  }, []);

  /**
   * selectedComponent - 派生出当前选中的完整组件对象
   * 使用 useMemo 缓存，只有 selectedComponentId 变化时才重新查找
   */
  const selectedComponent = useMemo(() => {
    return COMPONENTS.find(c => c.id === selectedComponentId) || COMPONENTS[0];
  }, [selectedComponentId]);

  // 用 useMemo 缓存 context value
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

/**
 * useComponent - 消费组件数据的 Hook
 * @throws 如果在 ComponentProvider 外部使用会抛出错误
 * @returns { components, selectedComponentId, selectedComponent, selectComponent, getStateLabel }
 */
export const useComponent = (): ComponentContextType => {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error('useComponent must be used within a ComponentProvider');
  }
  return context;
};
