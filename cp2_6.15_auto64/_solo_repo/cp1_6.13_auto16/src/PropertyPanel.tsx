import { useState, useCallback, memo, useEffect } from 'react';
import { Pipette, Ruler } from 'lucide-react';
import { LayoutBlock } from './types';
import './PropertyPanel.css';

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker = memo(function ColorPicker({ label, color, onChange }: ColorPickerProps) {
  const [hex, setHex] = useState(color);
  const [rgb, setRgb] = useState({ r: 0, g: 0, b: 0 });

  useEffect(() => {
    setHex(color);
    const parsed = hexToRgb(color);
    if (parsed) setRgb(parsed);
  }, [color]);

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  };

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (!value.startsWith('#')) value = '#' + value;
      setHex(value);
      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        onChange(value);
        const parsed = hexToRgb(value);
        if (parsed) setRgb(parsed);
      }
    },
    [onChange]
  );

  const handleRgbChange = useCallback(
    (channel: 'r' | 'g' | 'b', value: number) => {
      const newRgb = { ...rgb, [channel]: value };
      setRgb(newRgb);
      const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      setHex(newHex);
      onChange(newHex);
    },
    [rgb, onChange]
  );

  const handleNativeColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHex(value);
      const parsed = hexToRgb(value);
      if (parsed) setRgb(parsed);
      onChange(value);
    },
    [onChange]
  );

  return (
    <div className="color-picker">
      <div className="color-picker-header">
        <span className="color-picker-label">{label}</span>
        <div className="color-preview" style={{ backgroundColor: hex }} />
      </div>

      <div className="color-input-row">
        <label className="color-native-label">
          <input
            type="color"
            value={hex}
            onChange={handleNativeColor}
            className="color-native-input"
          />
          <Pipette size={14} />
        </label>
        <input
          type="text"
          value={hex}
          onChange={handleHexChange}
          className="hex-input"
          maxLength={7}
          placeholder="#000000"
        />
      </div>

      <div className="rgb-sliders">
        <div className="slider-row">
          <span className="slider-label r">R</span>
          <input
            type="range"
            min={0}
            max={255}
            value={rgb.r}
            onChange={(e) => handleRgbChange('r', Number(e.target.value))}
            className="color-slider slider-r"
          />
          <span className="slider-value">{rgb.r}</span>
        </div>
        <div className="slider-row">
          <span className="slider-label g">G</span>
          <input
            type="range"
            min={0}
            max={255}
            value={rgb.g}
            onChange={(e) => handleRgbChange('g', Number(e.target.value))}
            className="color-slider slider-g"
          />
          <span className="slider-value">{rgb.g}</span>
        </div>
        <div className="slider-row">
          <span className="slider-label b">B</span>
          <input
            type="range"
            min={0}
            max={255}
            value={rgb.b}
            onChange={(e) => handleRgbChange('b', Number(e.target.value))}
            className="color-slider slider-b"
          />
          <span className="slider-value">{rgb.b}</span>
        </div>
      </div>
    </div>
  );
});

interface PropertyPanelProps {
  block: LayoutBlock | null;
  onUpdate: (updates: Partial<LayoutBlock>) => void;
}

function PropertyPanel({ block, onUpdate }: PropertyPanelProps) {
  if (!block) {
    return (
      <div className="property-panel empty">
        <div className="empty-state">
          <Ruler size={32} color="#9ca3af" />
          <p className="empty-text">选择一个布局块以编辑属性</p>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="panel-header">
        <h3 className="panel-title">属性面板</h3>
        <span className="panel-subtitle">
          {block.type === 'article-card' && '文章卡片'}
          {block.type === 'sidebar' && '侧边栏'}
          {block.type === 'footer' && '页脚'}
        </span>
      </div>

      <div className="panel-section">
        <h4 className="section-title">尺寸</h4>
        <div className="size-info">
          <div className="size-item">
            <span className="size-label">宽度</span>
            <span className="size-value">{Math.round(block.size.width)}px</span>
          </div>
          <div className="size-item">
            <span className="size-label">高度</span>
            <span className="size-value">{Math.round(block.size.height)}px</span>
          </div>
          <div className="size-item">
            <span className="size-label">X 位置</span>
            <span className="size-value">{Math.round(block.position.x)}px</span>
          </div>
          <div className="size-item">
            <span className="size-label">Y 位置</span>
            <span className="size-value">{Math.round(block.position.y)}px</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h4 className="section-title">样式</h4>
        <ColorPicker
          label="填充颜色"
          color={block.fillColor}
          onChange={(color) => onUpdate({ fillColor: color })}
        />
        <ColorPicker
          label="边框颜色"
          color={block.borderColor}
          onChange={(color) => onUpdate({ borderColor: color })}
        />
      </div>
    </div>
  );
}

export default PropertyPanel;
