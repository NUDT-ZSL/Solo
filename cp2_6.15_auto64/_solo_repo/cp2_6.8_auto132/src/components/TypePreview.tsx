import React from 'react';
import { Type, AlignLeft } from 'lucide-react';
import type { TypographyToken } from '../types';
import { AVAILABLE_FONTS } from '../types';

interface TypePreviewProps {
  typography: TypographyToken;
  onChange: (typography: TypographyToken) => void;
}

const TypePreview: React.FC<TypePreviewProps> = ({ typography, onChange }) => {
  const update = (patch: Partial<TypographyToken>) => {
    onChange({ ...typography, ...patch });
  };

  return (
    <div className="type-preview">
      <div className="control-group">
        <label className="control-label">
          <Type size={14} />
          字体
        </label>
        <select
          className="control-select"
          value={typography.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value })}
        >
          {AVAILABLE_FONTS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label className="control-label">
          字号: {typography.fontSize}px
        </label>
        <input
          type="range"
          min={12}
          max={72}
          value={typography.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="control-slider"
        />
      </div>

      <div className="control-group">
        <label className="control-label">
          字重: {typography.fontWeight}
        </label>
        <input
          type="range"
          min={300}
          max={900}
          step={100}
          value={typography.fontWeight}
          onChange={(e) => update({ fontWeight: Number(e.target.value) })}
          className="control-slider"
        />
      </div>

      <div className="control-group">
        <label className="control-label">
          行高: {typography.lineHeight}
        </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={typography.lineHeight}
          onChange={(e) => update({ lineHeight: Number(e.target.value) })}
          className="control-slider"
        />
      </div>

      <div className="control-group">
        <label className="control-label">
          <AlignLeft size={14} />
          预览文本
        </label>
        <textarea
          className="control-textarea"
          value={typography.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={3}
        />
      </div>

      <div className="control-group">
        <label className="control-label checkbox-label">
          <input
            type="checkbox"
            checked={typography.showGrid}
            onChange={(e) => update({ showGrid: e.target.checked })}
          />
          透明网格背景
        </label>
      </div>
    </div>
  );
};

export default TypePreview;
