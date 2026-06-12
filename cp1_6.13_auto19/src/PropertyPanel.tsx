import React, { useState } from 'react';
import { useStore } from './store';
import { ComponentData, ButtonProps, CardProps, InputProps, getComponentLabel, ComponentType } from './types';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';

type PropField = {
  key: string;
  label: string;
} & (
  | { type: 'color'; preset: string[] }
  | { type: 'range'; min: number; max: number; step: number; unit?: string }
);

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#1e293b', '#ffffff',
];

const BUTTON_PROPS: PropField[] = [
  { key: 'backgroundColor', label: '背景色', type: 'color', preset: PRESET_COLORS },
  { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1, unit: 'px' },
  { key: 'fontSize', label: '文字大小', type: 'range', min: 12, max: 24, step: 1, unit: 'px' },
  { key: 'textColor', label: '文字颜色', type: 'color', preset: PRESET_COLORS },
  { key: 'shadowDepth', label: '阴影深度', type: 'range', min: 0, max: 16, step: 1, unit: 'px' },
];

const CARD_PROPS: PropField[] = [
  { key: 'backgroundColor', label: '背景色', type: 'color', preset: PRESET_COLORS },
  { key: 'borderColor', label: '边框颜色', type: 'color', preset: PRESET_COLORS },
  { key: 'borderWidth', label: '边框粗细', type: 'range', min: 0, max: 8, step: 1, unit: 'px' },
  { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1, unit: 'px' },
  { key: 'shadowDepth', label: '阴影深度', type: 'range', min: 0, max: 16, step: 1, unit: 'px' },
];

const INPUT_PROPS: PropField[] = [
  { key: 'borderColor', label: '边框颜色', type: 'color', preset: PRESET_COLORS },
  { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1, unit: 'px' },
  { key: 'placeholderColor', label: '占位符颜色', type: 'color', preset: PRESET_COLORS },
  { key: 'padding', label: '内部内边距', type: 'range', min: 4, max: 20, step: 1, unit: 'px' },
];

function getPropsByType(type: ComponentType): PropField[] {
  switch (type) {
    case 'button': return BUTTON_PROPS;
    case 'card': return CARD_PROPS;
    case 'input': return INPUT_PROPS;
  }
}

const ColorPicker: React.FC<{
  value: string;
  preset: string[];
  onChange: (v: string) => void;
}> = ({ value, preset, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: value,
              border: '1px solid rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>
            {value}
          </span>
          {expanded ? <ChevronUp size={12} style={{ color: '#94a3b8' }} /> : <ChevronDown size={12} style={{ color: '#94a3b8' }} />}
        </button>
        <label
          style={{
            width: 36,
            height: 32,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: 40,
              height: 40,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        </label>
      </div>
      {expanded && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: 6,
          }}
        >
          {preset.map((c) => (
            <button
              key={c}
              onClick={() => {
                onChange(c);
              }}
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                border: value.toLowerCase() === c.toLowerCase()
                  ? '2px solid #3b82f6'
                  : '1px solid rgba(0,0,0,0.08)',
                background: c,
                cursor: 'pointer',
                padding: 0,
                transition: 'transform 0.1s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RangeSlider: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ value, min, max, step, unit, onChange }) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{min}{unit}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#1e293b',
            background: '#e0e7ff',
            padding: '2px 10px',
            borderRadius: 6,
          }}
        >
          {value}{unit}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{max}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
};

const PropertyPanel: React.FC = () => {
  const { components, selectedId, updateComponentProps } = useStore();
  const selected: ComponentData | undefined = components.find((c) => c.id === selectedId);

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
          textAlign: 'center',
        }}
      >
        <Palette size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
        <div>点击画布上的组件</div>
        <div style={{ marginTop: 2 }}>即可编辑其属性</div>
      </div>
    );
  }

  const fields = getPropsByType(selected.type);
  const props = selected.props as Record<string, any>;
  const typeColor = selected.type === 'button' ? '#3b82f6' : selected.type === 'card' ? '#10b981' : '#f59e0b';

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
        gap: 18,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 14,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: typeColor,
            boxShadow: `0 0 0 4px ${typeColor}20`,
          }}
        />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
            {getComponentLabel(selected.type)}属性
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
            #{selected.id.slice(0, 6)}
          </div>
        </div>
      </div>

      {fields.map((field, idx) => {
        const value = props[field.key];
        return (
          <div
            key={field.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              animation: `fadeIn 0.2s ease ${idx * 0.05}s both`,
            }}
          >
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
              {field.label}
            </label>
            {field.type === 'color' ? (
              <ColorPicker
                value={value as string}
                preset={field.preset}
                onChange={(v) => updateComponentProps(selected.id, { [field.key]: v })}
              />
            ) : (
              <RangeSlider
                value={value as number}
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                onChange={(v) => updateComponentProps(selected.id, { [field.key]: v })}
              />
            )}
          </div>
        );
      })}

      <div
        style={{
          marginTop: 'auto',
          padding: '12px 14px',
          background: '#eff6ff',
          borderRadius: 12,
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.6,
          borderLeft: '3px solid #3b82f6',
        }}
      >
        <div style={{ fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>操作提示</div>
        • 按 Delete 键删除选中组件<br />
        • 鼠标中键拖拽调整叠放顺序
      </div>
    </div>
  );
};

export default PropertyPanel;
