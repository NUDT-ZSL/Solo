import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import type { DataState } from './stateManager';

export interface ComponentMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  Component: React.ComponentType<any>;
  defaultProps: Record<string, any>;
}

export const componentRegistry: ComponentMeta[] = [
  {
    id: 'button',
    name: 'Button',
    category: '基础组件',
    description: '按钮组件，支持多种状态和主题，可点击触发交互',
    Component: Button,
    defaultProps: {
      label: 'Submit',
      onClick: () => {
        console.log('[MockMingle] Button clicked! Button component interaction triggered.');
        console.log('[MockMingle] Current timestamp:', new Date().toISOString());
        alert('✅ Button clicked! Check console for detailed logs.');
      },
    },
  },
  {
    id: 'card',
    name: 'Card',
    category: '容器组件',
    description: '卡片组件，用于展示标题和描述内容，支持悬停缩放',
    Component: Card,
    defaultProps: {
      title: 'Product Showcase',
      description: 'This is a beautifully designed card component that demonstrates how content is displayed with proper spacing, typography, and visual hierarchy. Hover to see the scale animation effect.',
    },
  },
  {
    id: 'input',
    name: 'Input',
    category: '表单组件',
    description: '输入框组件，支持文本输入、聚焦高亮和错误提示',
    Component: Input,
    defaultProps: {
      placeholder: 'Please enter your email address...',
    },
  },
  {
    id: 'badge',
    name: 'Badge',
    category: '数据展示',
    description: '徽章组件，用于显示通知数量、状态标签等信息',
    Component: Badge,
    defaultProps: {
      count: 12,
      text: 'Notifications',
    },
  },
  {
    id: 'modal',
    name: 'Modal',
    category: '反馈组件',
    description: '弹窗组件，用于展示对话框、确认框等浮层内容',
    Component: Modal,
    defaultProps: {
      title: 'Confirm Action',
      content: 'Are you sure you want to proceed with this action? This operation cannot be undone. Please review your changes before confirming.',
    },
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    category: '反馈组件',
    description: '骨架屏组件，用于数据加载时的占位显示，减少用户等待焦虑',
    Component: Skeleton,
    defaultProps: {
      rows: 4,
    },
  },
];

export const getComponentById = (id: string): ComponentMeta | undefined => {
  return componentRegistry.find((comp) => comp.id === id);
};

export const themeVariables = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f5f5f5',
    '--bg-tertiary': '#e0e0e0',
    '--bg-card': '#ffffff',
    '--text-primary': '#333333',
    '--text-secondary': '#666666',
    '--border-color': '#e0e0e0',
    '--panel-bg': '#f0f0f0',
    '--accent-color': '#4A90D9',
    '--success-color': '#52c41a',
    '--error-color': '#ff4d4f',
  },
  dark: {
    '--bg-primary': '#141414',
    '--bg-secondary': '#1e1e1e',
    '--bg-tertiary': '#2a2a2a',
    '--bg-card': '#1e1e1e',
    '--text-primary': '#e0e0e0',
    '--text-secondary': '#999999',
    '--border-color': '#333333',
    '--panel-bg': '#222222',
    '--accent-color': '#4A90D9',
    '--success-color': '#52c41a',
    '--error-color': '#ff4d4f',
  },
};

export type { DataState };
