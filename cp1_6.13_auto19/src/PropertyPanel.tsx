import React from 'react';
import { useStore } from './store';
import { ComponentData, ButtonProps, CardProps, InputProps, getComponentLabel } from './types';
import { Palette } from 'lucide-react';

interface PropertyField {
  key: string;
  label: string;
  type: 'color' | 'range';
  min?: number;
  max?: number;
  step?: number;
}

const BUTTON_FIELDS: PropertyField[] = [
  { key: 'backgroundColor', label: '背景色', type: 'color' },
  { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1 },
  { key: 'fontSize', label: '文字大小', type: 'range', min: 12, max: 24, step: 1 },
  { key: 'textColor', label: '文字颜色', type: 'color' },
  { key: 'shadowDepth', label: '阴影深度', type: 'range', min: 0, max: 16, step: 1 },
];

const CARD_FIELDS: PropertyField[] = [
  { key: 'backgroundColor', label: '背景色', type: 'color' },
  { key: 'borderColor', label: '边框颜色', type: 'color' },
  { key: 'borderWidth', label: '边框粗细', type: 'range', min: 0, max: 8, step: 1 },
  { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1 },
  { key: 'shadowDepth', label: '阴影深度', type: 'range', min: 0, max: 16, step: 1 },
];

const INPUT_FIELDS: PropertyField[] = [
  { key: 'borderColor', label: '边框颜色', type: 'color' },
  { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1 },
  { key: 'placeholderColor', label: '占位符颜色', type: 'color' },
  { key: 'padding', label: '内部内边距', type: 'range', min: 4, max: 20, step: 1 },
];

function getFields(type: ComponentData['type']): PropertyField[] {
  switch (type) {
    case 'button': return BUTTON_FIELDS;
    case 'card': return CARD_FIELDS;
    case 'input': return INPUT_FIELDS;
  }
}

const PropertyPanel: React.FC = () => {
  const { components, selectedId, updateComponentProps } = useStore();
  const selected = components.find((c) => c.id === selectedId);

  if (!selected) {
    return (
      <div
        style={{
          width: 300,
          minWidth: 300,
          background: '#f8fafc',
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 13,
        }}
      >
        <Palette size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
        <div>点击画布上的组件</div>
        <div>编辑其属性</div>
      </div>
    );
  }

  const fields = getFields(selected.type);
  const props = selected.props as Record<string, any>;

  return (
    <div
      className="animate-fade-in"
      style={{
        width: 300,
        minWidth: 300,
        background: '#f8fafc',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: selected.type === 'button' ? '#3b82f6' : selected.type === 'card' ? '#10b981' : '#f59e0b',
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
          {getComponentLabel(selected.type)} 属性
        </span>
      </div>

      {fields.map((field) => {
        const value = props[field.key];
        return (
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                {field.label}
              </label>
              {field.type === 'range' && (
                <span
                  style={{
                    fontSize: 11,
                    color: '#94a3b8',
                    background: '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  {value}px
                </span>
              )}
            </div>
            {field.type === 'color' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={value}
                  onChange={(e) =>
                    updateComponentProps(selected.id, { [field.key]: e.target.value })
                  }
                />
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                  {value}
                </span>
              </div>
            ) : (
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={value}
                onChange={(e) =>
                  updateComponentProps(selected.id, {
                    [field.key]: Number(e.target.value),
                  })
                }
                style={{ width: '100%' }}
              />
            )}
          </div>
        );
      })}

      <div
        style={{
          marginTop: 4,
          padding: '10px 12px',
          background: '#eff6ff',
          borderRadius: 10,
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        按 Delete 键可删除选中组件，中键拖拽可调整叠放顺序
      </div>
    </div>
  );
};

export default PropertyPanel;
