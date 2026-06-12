import React, { useState, useMemo } from 'react';
import { useStore } from './store';
import { ComponentData, ButtonProps, CardProps, InputProps, getComponentLabel, ComponentType } from './types';
import { Palette, ChevronDown, ChevronUp, Sliders } from 'lucide-react';

const PRESET_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#1e293b', '#ffffff',
];

type PropType = 'color' | 'range';

interface PropConfigBase {
  key: string;
  label: string;
  type: PropType;
}

interface ColorPropConfig extends PropConfigBase {
  type: 'color';
}

interface RangePropConfig extends PropConfigBase {
  type: 'range';
  min: number;
  max: number;
  step: number;
  unit?: string;
}

type PropConfig = ColorPropConfig | RangePropConfig;

const COMPONENT_PROPS_CONFIG: Record<string, PropConfig[]> = {
  button: [
    { key: 'backgroundColor', label: '背景色', type: 'color' },
    { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1, unit: 'px' },
    { key: 'fontSize', label: '文字大小', type: 'range', min: 12, max: 24, step: 1, unit: 'px' },
    { key: 'textColor', label: '文字颜色', type: 'color' },
    { key: 'shadowDepth', label: '阴影深度', type: 'range', min: 0, max: 16, step: 1, unit: 'px' },
  ],
  card: [
    { key: 'backgroundColor', label: '背景色', type: 'color' },
    { key: 'borderColor', label: '边框颜色', type: 'color' },
    { key: 'borderWidth', label: '边框粗细', type: 'range', min: 0, max: 8, step: 1, unit: 'px' },
    { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1, unit: 'px' },
    { key: 'shadowDepth', label: '阴影深度', type: 'range', min: 0, max: 16, step: 1, unit: 'px' },
  ],
  input: [
    { key: 'borderColor', label: '边框颜色', type: 'color' },
    { key: 'borderRadius', label: '圆角大小', type: 'range', min: 0, max: 32, step: 1, unit: 'px' },
    { key: 'placeholderColor', label: '占位符颜色', type: 'color' },
    { key: 'padding', label: '内部内边距', type: 'range', min: 4, max: 20, step: 1, unit: 'px' },
  ],
};

function getPropsByType(type: ComponentType | string): PropConfig[] {
  return COMPONENT_PROPS_CONFIG[type] || [];
}

const ColorPicker: React.FC<{
  value: string;
  palette?: string[];
  onChange: (v: string) => void;
}> = ({ value, palette = PRESET_PALETTE, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 10,
            border: '2px solid #e2e8f0',
            background: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s',
            flex: 1,
            justifyContent: 'flex-start',
            minWidth: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
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
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontFamily: "'Fira Code', Consolas, monospace",
              color: '#475569',
              fontWeight: 600,
              textTransform: 'lowercase',
            }}
          >
            {value}
          </span>
          <div style={{ marginLeft: 'auto' }}>
            {expanded
              ? <ChevronUp size={14} style={{ color: '#94a3b8' }} />
              : <ChevronDown size={14} style={{ color: '#94a3b8' }} />}
          </div>
        </button>

        <label
          title="自定义颜色"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #ef4444, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLLabelElement).style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLLabelElement).style.borderColor = '#e2e8f0';
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sliders size={10} style={{ color: '#3b82f6' }} />
          </div>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
              height: '100%',
              padding: 0,
              border: 'none',
            }}
          />
        </label>
      </div>

      {expanded && (
        <div
          className="animate-fade-in"
          style={{
            marginTop: 10,
            padding: 12,
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            预设色盘
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: 8,
            }}
          >
            {palette.map((color) => {
              const isActive = value.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  onClick={() => {
                    onChange(color);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    border: isActive
                      ? '2px solid #3b82f6'
                      : '1px solid rgba(0,0,0,0.08)',
                    background: color,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.12s ease',
                    boxShadow: isActive
                      ? '0 0 0 2px #dbeafe'
                      : 'none',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)';
                    (e.currentTarget as HTMLButtonElement).style.zIndex = '10';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = isActive ? 'scale(1.15)' : 'scale(1)';
                    (e.currentTarget as HTMLButtonElement).style.zIndex = '1';
                  }}
                />
              );
            })}
          </div>
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
}> = ({ value, min, max, step, unit = '', onChange }) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{min}{unit}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#1e293b',
            background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
            padding: '3px 12px',
            borderRadius: 8,
            minWidth: 48,
            textAlign: 'center',
          }}
        >
          {value}{unit}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{max}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 6 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: 6,
            borderRadius: 3,
            background: '#e2e8f0',
            width: '100%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: 6,
            borderRadius: 3,
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            width: `${percent}%`,
            transition: 'width 0.08s linear',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'relative',
            width: '100%',
            height: 6,
            background: 'transparent',
            WebkitAppearance: 'none',
            appearance: 'none',
            margin: 0,
            padding: 0,
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
};

const PropertyPanel: React.FC = () => {
  const { components, selectedId, updateComponentProps } = useStore();
  const selected = components.find((c) => c.id === selectedId);

  const fields = useMemo(() => {
    if (!selected) return [];
    return getPropsByType(selected.type);
  }, [selected]);

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
        <Palette size={36} style={{ marginBottom: 14, opacity: 0.35, color: '#94a3b8' }} />
        <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>选择一个组件</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>即可查看和编辑其属性</div>
      </div>
    );
  }

  const props = selected.props as Record<string, any>;
  const typeColor = selected.type === 'button' ? '#3b82f6' : selected.type === 'card' ? '#10b981' : '#f59e0b';
  const typeIcon = selected.type === 'button' ? '🔘' : selected.type === 'card' ? '🟩' : '⌨️';

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
        gap: 20,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${typeColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          {typeIcon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
            {getComponentLabel(selected.type)}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>
            #{selected.id.slice(0, 8)}
          </div>
        </div>
      </div>

      {fields.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>
          该组件类型暂无可用属性
        </div>
      ) : (
        fields.map((field, idx) => {
          const value = props[field.key];
          if (value === undefined) return null;

          return (
            <div
              key={field.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                animation: `fadeIn 0.2s ease ${idx * 0.04}s both`,
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }}>
                {field.label}
              </label>
              {field.type === 'color' ? (
                <ColorPicker
                  value={value as string}
                  palette={PRESET_PALETTE}
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
        })
      )}

      <div
        style={{
          marginTop: 'auto',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          borderRadius: 14,
          fontSize: 11.5,
          color: '#3b82f6',
          lineHeight: 1.7,
          borderLeft: '3px solid #3b82f6',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>💡</span>
          <span>操作提示</span>
        </div>
        <div style={{ color: '#64748b' }}>
          • 按 <code style={{ background: '#e0e7ff', padding: '1px 5px', borderRadius: 4 }}>Delete</code> 键删除<br />
          • 中键拖拽调整叠放顺序
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
