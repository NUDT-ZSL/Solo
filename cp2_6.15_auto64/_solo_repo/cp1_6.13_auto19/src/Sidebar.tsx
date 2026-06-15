import React from 'react';
import { ComponentType, getComponentLabel, DEFAULT_BUTTON_PROPS, DEFAULT_CARD_PROPS, DEFAULT_INPUT_PROPS } from './types';
import { Square, RectangleHorizontal, TextCursorInput } from 'lucide-react';

interface SidebarProps {
  onDragStart: (type: ComponentType, e: React.DragEvent) => void;
  sidebarWidth: number;
}

const COMPONENT_ITEMS: { type: ComponentType; label: string; icon: React.ReactNode; preview: React.ReactNode }[] = [
  {
    type: 'button',
    label: getComponentLabel('button'),
    icon: <RectangleHorizontal size={20} />,
    preview: (
      <div
        style={{
          width: 60,
          height: 24,
          borderRadius: DEFAULT_BUTTON_PROPS.borderRadius / 2,
          backgroundColor: DEFAULT_BUTTON_PROPS.backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: DEFAULT_BUTTON_PROPS.textColor,
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        Button
      </div>
    ),
  },
  {
    type: 'card',
    label: getComponentLabel('card'),
    icon: <Square size={20} />,
    preview: (
      <div
        style={{
          width: 50,
          height: 36,
          borderRadius: DEFAULT_CARD_PROPS.borderRadius / 2,
          backgroundColor: DEFAULT_CARD_PROPS.backgroundColor,
          border: `1px solid ${DEFAULT_CARD_PROPS.borderColor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      />
    ),
  },
  {
    type: 'input',
    label: getComponentLabel('input'),
    icon: <TextCursorInput size={20} />,
    preview: (
      <div
        style={{
          width: 60,
          height: 22,
          borderRadius: DEFAULT_INPUT_PROPS.borderRadius / 2,
          border: `1px solid ${DEFAULT_INPUT_PROPS.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 6,
          fontSize: 8,
          color: DEFAULT_INPUT_PROPS.placeholderColor,
        }}
      >
        输入...
      </div>
    ),
  },
];

const Sidebar: React.FC<SidebarProps> = ({ onDragStart, sidebarWidth }) => {
  return (
    <div
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: '#ffffff',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'auto',
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8,
        }}
      >
        组件面板
      </h3>
      {COMPONENT_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(item.type, e)}
          style={{
            width: '100%',
            height: 64,
            background: '#f8fafc',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            cursor: 'grab',
            transition: 'all 0.2s ease',
            border: '1px solid #f1f5f9',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLDivElement).style.background = '#ffffff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
          }}
        >
          <div style={{ color: '#3b82f6', flexShrink: 0 }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
          </div>
          {item.preview}
        </div>
      ))}
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          background: '#eff6ff',
          borderRadius: 10,
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        拖拽组件到画布区域即可添加，最多放置6个组件
      </div>
    </div>
  );
};

export default Sidebar;
