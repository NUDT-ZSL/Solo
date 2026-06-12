import React from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import { DataState } from './stateManager';

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
    description: '按钮组件，支持多种状态和主题',
    Component: Button,
    defaultProps: {
      label: 'Click Me',
      onClick: () => {
        console.log('Button clicked!');
        alert('Button clicked! Check console for more info.');
      },
    },
  },
  {
    id: 'card',
    name: 'Card',
    category: '容器组件',
    description: '卡片组件，用于展示内容',
    Component: Card,
    defaultProps: {
      title: 'Card Title',
      description: 'This is a card description with some sample text to show how the component looks.',
    },
  },
  {
    id: 'input',
    name: 'Input',
    category: '表单组件',
    description: '输入框组件，支持多种状态',
    Component: Input,
    defaultProps: {
      placeholder: 'Enter text...',
    },
  },
  {
    id: 'badge',
    name: 'Badge',
    category: '数据展示',
    description: '徽章组件，用于标记状态',
    Component: Badge,
    defaultProps: {
      count: 5,
      text: 'New',
    },
  },
  {
    id: 'modal',
    name: 'Modal',
    category: '反馈组件',
    description: '弹窗组件，用于展示对话框',
    Component: Modal,
    defaultProps: {
      title: 'Modal Title',
      content: 'This is the modal content. You can put any information here.',
    },
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    category: '反馈组件',
    description: '骨架屏组件，用于加载占位',
    Component: Skeleton,
    defaultProps: {
      rows: 3,
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
