import React, { useState } from 'react';
import CurveEditor from './CurveEditor';
import { HSLParams, ControlPoint } from '../types';

interface ControlPanelProps {
  hsl: HSLParams;
  tiltCurve: ControlPoint[];
  rotationCurve: ControlPoint[];
  onHslChange: (hsl: HSLParams) => void;
  onTiltCurveChange: (points: ControlPoint[]) => void;
  onRotationCurveChange: (points: ControlPoint[]) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  colorPreview?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, unit, onChange, colorPreview }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={sliderContainerStyle}>
      <div style={sliderLabelRow}>
        <span style={{
          ...sliderLabelStyle,
          color: isHover ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
          transition: 'color 0.2s ease'
        }}>{label}</span>
        <span style={{
          ...sliderValueStyle,
          color: isDragging || isHover ? '#00BFFF' : 'rgba(255,255,255,0.6)',
          transition: 'color 0.2s ease',
          textShadow: isDragging ? '0 0 8px rgba(0,191,255,0.8)' : 'none'
        }}>
          {value.toFixed(0)}{unit}
        </span>
      </div>
      <div
        style={sliderTrackStyle}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => {
          setIsHover(false);
          setIsDragging(false);
        }}
      >
        <div style={{
          ...sliderFillStyle,
          width: `${percent}%`,
          background: colorPreview || 'linear-gradient(90deg, #4A5568 0%, #00BFFF 100%)',
          boxShadow: isHover ? '0 0 10px rgba(0,191,255,0.4)' : 'none',
          transition: 'box-shadow 0.2s ease'
        }} />
        {(isDragging || isHover) && (
          <div style={{
            position: 'absolute',
            left: `calc(${percent}% - 30px)`,
            top: '-28px',
            background: 'rgba(0,191,255,0.9)',
            color: '#FFFFFF',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,191,255,0.5)',
            animation: 'fadeIn 0.15s ease'
          }}>
            {value.toFixed(0)}{unit}
          </div>
        )}
        <div
          style={{
            ...sliderThumbStyle,
            left: `calc(${percent}% - 7px)`,
            background: isDragging ? '#00BFFF' : (isHover ? '#FFFFFF' : '#8892A6'),
            boxShadow: isDragging
              ? '0 0 0 4px rgba(0,191,255,0.3), 0 0 12px rgba(0,191,255,0.8)'
              : (isHover ? '0 0 8px rgba(255,255,255,0.6)' : '0 2px 4px rgba(0,0,0,0.3)'),
            transition: 'all 0.2s ease'
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          style={sliderInputStyle}
        />
      </div>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  hsl,
  tiltCurve,
  rotationCurve,
  onHslChange,
  onTiltCurveChange,
  onRotationCurveChange
}) => {
  const hueGradient = 'linear-gradient(90deg, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(90deg, hsl(${hsl.hue}, 0%, 50%) 0%, hsl(${hsl.hue}, 100%, 50%) 100%)`;
  const lightGradient = `linear-gradient(90deg, hsl(${hsl.hue}, ${hsl.saturation}%, 0%) 0%, hsl(${hsl.hue}, ${hsl.saturation}%, 50%) 50%, hsl(${hsl.hue}, ${hsl.saturation}%, 100%) 100%)`;
  const previewColor = `hsl(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%)`;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={headerTitleRow}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#00BFFF',
            boxShadow: '0 0 12px #00BFFF',
            marginRight: '10px'
          }} />
          <h2 style={headerTitleStyle}>光棱控制台</h2>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '6px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: previewColor,
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: `0 0 10px ${previewColor}60`
          }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            HSL({hsl.hue}, {hsl.saturation}%, {hsl.lightness}%)
          </span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span style={sectionDotStyle} />
          颜色参数
        </div>
        <Slider
          label="色相偏移"
          value={hsl.hue}
          min={-180}
          max={180}
          unit="°"
          onChange={(v) => onHslChange({ ...hsl, hue: v })}
          colorPreview={hueGradient}
        />
        <Slider
          label="饱和度"
          value={hsl.saturation}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => onHslChange({ ...hsl, saturation: v })}
          colorPreview={satGradient}
        />
        <Slider
          label="明度"
          value={hsl.lightness}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => onHslChange({ ...hsl, lightness: v })}
          colorPreview={lightGradient}
        />
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span style={sectionDotStyle} />
          波形编辑器
        </div>
        <CurveEditor
          label="倾斜波形函数"
          points={tiltCurve}
          onChange={onTiltCurveChange}
          yRange={[0, 30]}
        />
        <CurveEditor
          label="旋转速度曲线"
          points={rotationCurve}
          onChange={onRotationCurveChange}
          yRange={[0, 360]}
        />
      </div>

      <div style={footerStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.4)'
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          拖拽场景旋转 · 滚轮缩放 · 点击棱柱触发涟漪
        </div>
      </div>
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: '24px',
  transform: 'translateY(-50%)',
  width: 'clamp(280px, 20vw, 360px)',
  maxHeight: 'calc(100vh - 48px)',
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '16px',
  padding: '20px',
  overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
  zIndex: 10,
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(0,191,255,0.5) transparent'
};

const headerStyle: React.CSSProperties = {
  marginBottom: '20px',
  paddingBottom: '16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)'
};

const headerTitleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center'
};

const headerTitleStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: '18px',
  fontWeight: 600,
  letterSpacing: '1px',
  margin: 0,
  textShadow: '0 0 20px rgba(0,191,255,0.3)'
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '20px'
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  color: '#FFFFFF',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '14px',
  letterSpacing: '0.5px'
};

const sectionDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#00BFFF',
  marginRight: '8px',
  boxShadow: '0 0 8px #00BFFF'
};

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: '16px'
};

const sliderLabelRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px'
};

const sliderLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500
};

const sliderValueStyle: React.CSSProperties = {
  fontSize: '12px',
  fontFamily: 'monospace',
  fontWeight: 600
};

const sliderTrackStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '6px',
  background: 'rgba(255,255,255,0.1)',
  borderRadius: '3px',
  cursor: 'pointer'
};

const sliderFillStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  borderRadius: '3px',
  transition: 'width 0.05s linear'
};

const sliderThumbStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  cursor: 'grab',
  zIndex: 2
};

const sliderInputStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  margin: 0,
  padding: 0
};

const footerStyle: React.CSSProperties = {
  marginTop: '20px',
  paddingTop: '14px',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  justifyContent: 'center'
};

export default ControlPanel;
