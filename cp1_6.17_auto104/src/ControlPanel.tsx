import React, { useMemo, useCallback } from 'react';
import { TypographyParams, FONT_OPTIONS, getFontInfo, rafThrottle } from './helpers';

interface ControlPanelProps {
  params: TypographyParams;
  onChange: (params: Partial<TypographyParams>) => void;
  isCompact: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange, isCompact }) => {
  const fontInfo = useMemo(() => getFontInfo(params.fontFamily), [params.fontFamily]);
  const weightDisabled = !(fontInfo?.variableWeight ?? true);

  const handleFontFamily = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontFamily = e.target.value;
    const newFontInfo = getFontInfo(fontFamily);
    const updates: Partial<TypographyParams> = { fontFamily };
    if (newFontInfo && !newFontInfo.variableWeight) {
      updates.fontWeight = newFontInfo.defaultWeight;
    }
    onChange(updates);
  };

  const throttledChange = useCallback(
    rafThrottle((partial: Partial<TypographyParams>) => {
      onChange(partial);
    }),
    [onChange]
  );

  const handleFontWeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!weightDisabled) {
      throttledChange({ fontWeight: Number(e.target.value) });
    }
  };

  const handleFontSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledChange({ fontSize: Number(e.target.value) });
  };

  const handleLineHeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledChange({ lineHeight: Number(e.target.value) });
  };

  const handleLetterSpacing = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledChange({ letterSpacing: Number(e.target.value) });
  };

  const handleBackgroundColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledChange({ backgroundColor: e.target.value });
  };

  const handleTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledChange({ textColor: e.target.value });
  };

  const sliderStyle = isCompact
    ? { width: 120, display: 'inline-block' as const, marginRight: 16 }
    : { width: '100%' };

  const rowStyle = isCompact
    ? { display: 'inline-block' as const, marginRight: 16, marginBottom: 8 }
    : { marginBottom: 16 };

  const colorPickerWrap = isCompact
    ? { display: 'inline-block' as const, marginRight: 12, verticalAlign: 'middle' as const }
    : { display: 'flex' as const, alignItems: 'center', gap: 8, marginBottom: 16 };

  return (
    <div
      style={{
        backgroundColor: '#2D2D2D',
        borderRadius: 12,
        padding: isCompact ? 16 : 24,
        width: isCompact ? '100%' : 320,
        color: '#DCDCDC',
        flexShrink: 0,
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={rowStyle}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#AAAAAA' }}>
          字体
        </label>
        <select
          value={params.fontFamily}
          onChange={handleFontFamily}
          style={{
            width: isCompact ? 160 : '100%',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #555',
            backgroundColor: '#3D3D3D',
            color: '#DCDCDC',
            fontSize: 13,
            outline: 'none',
            cursor: 'pointer',
            verticalAlign: 'middle',
          }}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div style={rowStyle}>
        <label style={{ display: isCompact ? 'inline' : 'block', marginRight: 8, fontSize: 13, color: weightDisabled ? '#888' : '#AAAAAA' }}>
          字重
          <span style={{ marginLeft: 6, color: weightDisabled ? '#888' : '#569CD6', fontWeight: 600 }}>
            {params.fontWeight}
          </span>
        </label>
        <input
          type="range"
          min={100}
          max={900}
          step={100}
          value={params.fontWeight}
          onChange={handleFontWeight}
          disabled={weightDisabled}
          style={{
            ...sliderStyle,
            opacity: weightDisabled ? 0.5 : 1,
            cursor: weightDisabled ? 'not-allowed' : 'pointer',
            accentColor: weightDisabled ? '#888' : undefined,
          }}
        />
        {weightDisabled && !isCompact && (
          <div style={{ fontSize: 11, color: '#DCDCAA', marginTop: 4 }}>
            该字体仅支持固定字重
          </div>
        )}
        {weightDisabled && isCompact && (
          <span style={{ fontSize: 10, color: '#DCDCAA', marginLeft: 4 }}>（固定）</span>
        )}
      </div>

      <div style={rowStyle}>
        <label style={{ display: isCompact ? 'inline' : 'block', marginRight: 8, fontSize: 13, color: '#AAAAAA' }}>
          字号
          <span style={{ marginLeft: 6, color: '#569CD6', fontWeight: 600 }}>
            {params.fontSize}px
          </span>
        </label>
        <input
          type="range"
          min={12}
          max={72}
          step={1}
          value={params.fontSize}
          onChange={handleFontSize}
          style={sliderStyle}
        />
      </div>

      <div style={rowStyle}>
        <label style={{ display: isCompact ? 'inline' : 'block', marginRight: 8, fontSize: 13, color: '#AAAAAA' }}>
          行高
          <span style={{ marginLeft: 6, color: '#569CD6', fontWeight: 600 }}>
            {params.lineHeight.toFixed(1)}
          </span>
        </label>
        <input
          type="range"
          min={1.0}
          max={2.5}
          step={0.1}
          value={params.lineHeight}
          onChange={handleLineHeight}
          style={sliderStyle}
        />
      </div>

      <div style={rowStyle}>
        <label style={{ display: isCompact ? 'inline' : 'block', marginRight: 8, fontSize: 13, color: '#AAAAAA' }}>
          字间距
          <span style={{ marginLeft: 6, color: '#569CD6', fontWeight: 600 }}>
            {params.letterSpacing.toFixed(2)}em
          </span>
        </label>
        <input
          type="range"
          min={-0.1}
          max={0.3}
          step={0.01}
          value={params.letterSpacing}
          onChange={handleLetterSpacing}
          style={sliderStyle}
        />
      </div>

      <div style={colorPickerWrap}>
        <label style={{ fontSize: 13, color: '#AAAAAA', marginRight: 8, verticalAlign: 'middle' }}>背景色</label>
        <label
          style={{
            display: 'inline-block',
            width: isCompact ? 28 : 36,
            height: isCompact ? 28 : 36,
            borderRadius: '50%',
            border: '2px solid #555',
            backgroundColor: params.backgroundColor,
            cursor: 'pointer',
            verticalAlign: 'middle',
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative',
          }}
          title="选择背景色"
        >
          <input
            type="color"
            value={params.backgroundColor}
            onChange={handleBackgroundColor}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '150%',
              height: '150%',
              padding: 0,
              margin: '-25%',
              border: 'none',
              cursor: 'pointer',
              opacity: 0,
            }}
          />
        </label>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 4, verticalAlign: 'middle' }}>
          {params.backgroundColor}
        </span>
      </div>

      <div style={colorPickerWrap}>
        <label style={{ fontSize: 13, color: '#AAAAAA', marginRight: 8, verticalAlign: 'middle' }}>文字色</label>
        <label
          style={{
            display: 'inline-block',
            width: isCompact ? 28 : 36,
            height: isCompact ? 28 : 36,
            borderRadius: '50%',
            border: '2px solid #555',
            backgroundColor: params.textColor,
            cursor: 'pointer',
            verticalAlign: 'middle',
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative',
          }}
          title="选择文字色"
        >
          <input
            type="color"
            value={params.textColor}
            onChange={handleTextColor}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '150%',
              height: '150%',
              padding: 0,
              margin: '-25%',
              border: 'none',
              cursor: 'pointer',
              opacity: 0,
            }}
          />
        </label>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 4, verticalAlign: 'middle' }}>
          {params.textColor}
        </span>
      </div>
    </div>
  );
};

export default ControlPanel;
