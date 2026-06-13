import React, { useCallback } from 'react';
import { type FontPair, type FontConfig, allFonts, webSafeFonts, googleFonts } from './fonts';

interface TextStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

interface ControlPanelProps {
  fontPairs: FontPair[];
  activePairIndex: number;
  onActivePairChange: (index: number) => void;
  onTitleFontChange: (pairIndex: number, font: FontConfig) => void;
  onBodyFontChange: (pairIndex: number, font: FontConfig) => void;
  textStyle: TextStyle;
  onTextStyleChange: (style: TextStyle) => void;
  testText: string;
  onTestTextChange: (text: string) => void;
  onScreenshot: () => void;
}

const Divider: React.FC = () => (
  <div style={{ height: 1, background: '#e2e8f0', margin: '0' }} />
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, color, unit = '', onChange }) => {
  const rafRef = React.useRef<number>(0);
  const pendingRef = React.useRef<number>(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      pendingRef.current = v;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onChange(pendingRef.current);
        rafRef.current = 0;
      });
    },
    [onChange]
  );

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {step < 1 ? value.toFixed(1) : value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{
          width: '100%',
          height: 4,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
          borderRadius: 2,
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};

const FontSelect: React.FC<{
  label: string;
  value: FontConfig;
  options: FontConfig[];
  onChange: (font: FontConfig) => void;
}> = ({ label, value, options, onChange }) => (
  <div style={{ marginBottom: 12 }}>
    <label
      style={{
        fontSize: 12,
        color: '#64748b',
        fontWeight: 500,
        display: 'block',
        marginBottom: 4,
      }}
    >
      {label}
    </label>
    <select
      value={value.name}
      onChange={(e) => {
        const font = options.find((f) => f.name === e.target.value);
        if (font) onChange(font);
      }}
      style={{
        width: '100%',
        padding: '6px 8px',
        fontSize: 13,
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        background: '#fff',
        color: '#1e293b',
        outline: 'none',
        fontFamily: value.family,
        cursor: 'pointer',
      }}
    >
      <optgroup label="Web 安全字体">
        {webSafeFonts.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Google Fonts">
        {googleFonts.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
      </optgroup>
    </select>
  </div>
);

const ControlPanel: React.FC<ControlPanelProps> = ({
  fontPairs,
  activePairIndex,
  onActivePairChange,
  onTitleFontChange,
  onBodyFontChange,
  textStyle,
  onTextStyleChange,
  testText,
  onTestTextChange,
  onScreenshot,
}) => {
  const activePair = fontPairs[activePairIndex];

  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        height: '100vh',
        background: '#f8fafc',
        overflowY: 'auto',
        overflowX: 'hidden',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '20px 16px' }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            marginBottom: 4,
          }}
        >
          字体搭配对比
        </h1>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          对比不同字体组合在中英文混排下的视觉效果
        </p>
      </div>

      <Divider />

      <div style={{ padding: '16px' }}>
        <div
          style={{
            height: 120,
            border: '1px dashed #cbd5e1',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 0,
            background: '#fff',
            overflow: 'hidden',
            padding: '0 16px',
          }}
        >
          <span
            style={{
              fontFamily: activePair?.title?.family ?? 'sans-serif',
              fontSize: 36,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            中英混排 AaBbCc
          </span>
        </div>
      </div>

      <Divider />

      <div style={{ padding: '16px' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            marginBottom: 10,
          }}
        >
          选择方案
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {fontPairs.map((pair, i) => (
            <button
              key={pair.id}
              onClick={() => onActivePairChange(i)}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid',
                borderColor: i === activePairIndex ? '#3b82f6' : '#e2e8f0',
                background: i === activePairIndex ? '#eff6ff' : '#fff',
                color: i === activePairIndex ? '#3b82f6' : '#64748b',
                cursor: 'pointer',
                fontWeight: i === activePairIndex ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              方案 {i + 1}
            </button>
          ))}
        </div>

        {activePair && (
          <>
            <FontSelect
              label="标题字体"
              value={activePair.title}
              options={allFonts}
              onChange={(font) => onTitleFontChange(activePairIndex, font)}
            />
            <FontSelect
              label="正文字体"
              value={activePair.body}
              options={allFonts}
              onChange={(font) => onBodyFontChange(activePairIndex, font)}
            />
            <div
              style={{
                background: '#f1f5f9',
                borderRadius: 6,
                padding: 10,
                fontSize: 12,
                color: '#475569',
                lineHeight: 1.6,
              }}
            >
              <div>
                <span style={{ color: '#94a3b8' }}>标题：</span>
                {activePair.title.name} / {activePair.title.weights.join(', ')}
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>正文：</span>
                {activePair.body.name} / {activePair.body.weights.join(', ')}
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>行高：</span>
                {textStyle.lineHeight.toFixed(1)}
              </div>
            </div>
          </>
        )}
      </div>

      <Divider />

      <div style={{ padding: '16px' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            marginBottom: 12,
          }}
        >
          排版参数
        </div>
        <Slider
          label="字号"
          value={textStyle.fontSize}
          min={12}
          max={48}
          step={1}
          color="#1e293b"
          unit="px"
          onChange={(v) => onTextStyleChange({ ...textStyle, fontSize: v })}
        />
        <Slider
          label="行高"
          value={textStyle.lineHeight}
          min={1.0}
          max={2.0}
          step={0.1}
          color="#475569"
          onChange={(v) => onTextStyleChange({ ...textStyle, lineHeight: v })}
        />
        <Slider
          label="字间距"
          value={textStyle.letterSpacing}
          min={-2}
          max={4}
          step={0.5}
          color="#6366f1"
          unit="px"
          onChange={(v) => onTextStyleChange({ ...textStyle, letterSpacing: v })}
        />
      </div>

      <Divider />

      <div style={{ padding: '16px' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            marginBottom: 8,
          }}
        >
          测试文本
        </div>
        <textarea
          value={testText}
          onChange={(e) => onTestTextChange(e.target.value)}
          style={{
            width: '100%',
            height: 80,
            padding: 8,
            fontSize: 13,
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            color: '#1e293b',
            lineHeight: 1.5,
            background: '#fff',
          }}
        />
      </div>

      <Divider />

      <div style={{ padding: '16px', marginTop: 'auto' }}>
        <button
          onClick={onScreenshot}
          style={{
            width: '100%',
            padding: '10px 0',
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            background: '#3b82f6',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          一键截图对比
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
