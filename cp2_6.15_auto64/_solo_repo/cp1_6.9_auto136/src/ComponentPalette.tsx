import React, { useState } from 'react';
import {
  BATTERY_VOLTAGES,
  BATTERY_COLORS,
  RESISTOR_VALUES,
  LED_COLORS,
  LedColor,
  ComponentType,
} from './types';

const WIRE_COLOR = '#4A90D9';

interface PaletteItemParams {
  voltage?: number;
  resistance?: number;
  color?: LedColor;
  closed?: boolean;
}

interface PaletteItemProps {
  type: ComponentType;
  label: string;
  params: PaletteItemParams;
  onDragStart: (e: React.DragEvent, type: ComponentType, params: PaletteItemParams) => void;
  children: React.ReactNode;
}

function PaletteItem({ type, label, params, onDragStart, children }: PaletteItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type, params)}
      style={{
        background: '#2D2D44',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        cursor: 'grab',
        transition: 'transform 0.15s ease, background 0.15s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
        (e.currentTarget as HTMLDivElement).style.background = '#3D3D54';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLDivElement).style.background = '#2D2D44';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {children}
        <span style={{ color: '#E0E0F0', fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
    </div>
  );
}

interface ComponentPaletteProps {
  onDragStart: (e: React.DragEvent, type: ComponentType, params: PaletteItemParams) => void;
}

export default function ComponentPalette({ onDragStart }: ComponentPaletteProps) {
  const [voltage, setVoltage] = useState<number>(3);
  const [resistance, setResistance] = useState<number>(220);
  const [ledColor, setLedColor] = useState<LedColor>('red');

  return (
    <div
      style={{
        width: 240,
        background: '#2D2D44',
        padding: 16,
        boxSizing: 'border-box',
        overflowY: 'auto',
        flexShrink: 0,
        height: '100%',
      }}
    >
      <h2
        style={{
          color: '#E0E0F0',
          fontSize: 16,
          fontWeight: 700,
          margin: '0 0 16px 0',
          letterSpacing: 0.5,
        }}
      >
        元器件面板
      </h2>

      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#A0A0B0', fontSize: 12, marginBottom: 6 }}>电池电压 (V)</div>
        <input
          type="range"
          min={0}
          max={BATTERY_VOLTAGES.length - 1}
          step={1}
          value={BATTERY_VOLTAGES.indexOf(voltage)}
          onChange={(e) => setVoltage(BATTERY_VOLTAGES[parseInt(e.target.value, 10)])}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {BATTERY_VOLTAGES.map((v) => (
            <span
              key={v}
              style={{
                fontSize: 11,
                color: v === voltage ? '#00FF88' : '#606078',
                fontWeight: v === voltage ? 700 : 400,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>

      <PaletteItem
        type="battery"
        label={`电池 ${voltage}V`}
        params={{ voltage }}
        onDragStart={onDragStart}
      >
        <svg width="40" height="24" viewBox="0 0 40 24">
          <rect x="2" y="4" width="30" height="16" rx="3" fill={BATTERY_COLORS[voltage]} stroke="#666" />
          <rect x="32" y="9" width="5" height="6" rx="1" fill="#888" />
          <text x="10" y="16" fontSize="9" fill="#222" fontWeight="bold">+</text>
          <text x="22" y="16" fontSize="9" fill="#222" fontWeight="bold">-</text>
        </svg>
      </PaletteItem>

      <div style={{ marginBottom: 14, marginTop: 4 }}>
        <div style={{ color: '#A0A0B0', fontSize: 12, marginBottom: 6 }}>电阻阻值 (Ω)</div>
        <select
          value={resistance}
          onChange={(e) => setResistance(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            padding: 6,
            background: '#1E1E2E',
            color: '#E0E0F0',
            border: '1px solid #444',
            borderRadius: 4,
          }}
        >
          {RESISTOR_VALUES.map((r) => (
            <option key={r} value={r}>
              {r >= 1000 ? `${r / 1000}kΩ` : `${r}Ω`}
            </option>
          ))}
        </select>
      </div>

      <PaletteItem
        type="resistor"
        label={`电阻 ${resistance >= 1000 ? resistance / 1000 + 'k' : resistance}Ω`}
        params={{ resistance }}
        onDragStart={onDragStart}
      >
        <svg width="40" height="18" viewBox="0 0 40 18">
          <line x1="2" y1="9" x2="10" y2="9" stroke="#888" strokeWidth="2" />
          <rect x="10" y="5" width="20" height="8" rx="2" fill="#C9A66B" stroke="#8B6F47" />
          <line x1="30" y1="9" x2="38" y2="9" stroke="#888" strokeWidth="2" />
          <rect x="12" y="6" width="2" height="6" fill="#5D4037" />
          <rect x="16" y="6" width="2" height="6" fill="#D32F2F" />
          <rect x="20" y="6" width="2" height="6" fill="#5D4037" />
          <rect x="24" y="6" width="2" height="6" fill="#D32F2F" />
        </svg>
      </PaletteItem>

      <div style={{ marginBottom: 14, marginTop: 4 }}>
        <div style={{ color: '#A0A0B0', fontSize: 12, marginBottom: 6 }}>LED 颜色</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['red', 'green', 'blue', 'yellow'] as LedColor[]).map((c) => (
            <button
              key={c}
              onClick={() => setLedColor(c)}
              style={{
                flex: 1,
                height: 26,
                borderRadius: 4,
                background: LED_COLORS[c],
                border: ledColor === c ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer',
                opacity: 0.85,
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      <PaletteItem
        type="led"
        label={`LED (${ledColor})`}
        params={{ color: ledColor }}
        onDragStart={onDragStart}
      >
        <svg width="40" height="24" viewBox="0 0 40 24">
          <line x1="4" y1="12" x2="12" y2="12" stroke="#888" strokeWidth="2" />
          <line x1="28" y1="12" x2="36" y2="12" stroke="#888" strokeWidth="2" />
          <polygon points="12,6 24,12 12,18" fill={LED_COLORS[ledColor]} stroke="#666" opacity="0.75" />
          <line x1="24" y1="6" x2="24" y2="18" stroke="#666" strokeWidth="2" />
          <line x1="16" y1="4" x2="20" y2="0" stroke="#ccc" strokeWidth="1.5" />
          <line x1="19" y1="5" x2="23" y2="1" stroke="#ccc" strokeWidth="1.5" />
        </svg>
      </PaletteItem>

      <PaletteItem
        type="switch"
        label="开关 (单刀单掷)"
        params={{ closed: false }}
        onDragStart={onDragStart}
      >
        <svg width="40" height="20" viewBox="0 0 40 20">
          <circle cx="6" cy="14" r="3" fill="#666" />
          <circle cx="34" cy="14" r="3" fill="#666" />
          <line x1="6" y1="14" x2="26" y2="4" stroke="#999" strokeWidth="2.5" />
          <line x1="6" y1="14" x2="6" y2="18" stroke="#888" strokeWidth="2" />
          <line x1="34" y1="14" x2="34" y2="18" stroke="#888" strokeWidth="2" />
        </svg>
      </PaletteItem>

      <PaletteItem
        type="wire"
        label="导线"
        params={{}}
        onDragStart={onDragStart}
      >
        <svg width="40" height="16" viewBox="0 0 40 16">
          <circle cx="4" cy="8" r="4" fill={WIRE_COLOR} opacity="0.9" />
          <circle cx="36" cy="8" r="4" fill={WIRE_COLOR} opacity="0.9" />
          <path d="M 6 8 Q 20 2 34 8" stroke={WIRE_COLOR} strokeWidth="2" fill="none" />
        </svg>
      </PaletteItem>
    </div>
  );
}
