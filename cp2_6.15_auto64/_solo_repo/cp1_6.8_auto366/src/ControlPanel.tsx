import { useCallback } from 'react';
import { useCalligraphyStore } from '@/store';
import type { FontStyle } from '@/utils/calligraphyEngine';
import { Eraser, Download, Brush, Droplets, PenTool } from 'lucide-react';

interface ControlPanelProps {
  onClear: () => void;
  onExport: () => void;
}

const FONT_STYLES: { key: FontStyle; label: string; desc: string }[] = [
  { key: 'kaishu', label: '楷书', desc: '方正工整' },
  { key: 'xingshu', label: '行书', desc: '行云流水' },
  { key: 'caoshu', label: '草书', desc: '流畅飘逸' },
];

export default function ControlPanel({ onClear, onExport }: ControlPanelProps) {
  const { fontStyle, brushSize, inkDensity, setFontStyle, setBrushSize, setInkDensity } = useCalligraphyStore();

  const handleFontChange = useCallback((style: FontStyle) => {
    setFontStyle(style);
  }, [setFontStyle]);

  return (
    <div className="control-panel">
      <div className="panel-header">
        <PenTool size={18} className="panel-icon" />
        <span className="panel-title">墨韵流芳</span>
      </div>

      <div className="panel-section">
        <label className="section-label">字体风格</label>
        <div className="font-selector">
          {FONT_STYLES.map(({ key, label, desc }) => (
            <button
              key={key}
              className={`font-btn ${fontStyle === key ? 'font-btn-active' : ''}`}
              onClick={() => handleFontChange(key)}
            >
              <span className="font-btn-label">{label}</span>
              <span className="font-btn-desc">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">
          <Brush size={14} className="inline-icon" />
          画笔大小
          <span className="slider-value">{brushSize}px</span>
        </label>
        <input
          type="range"
          min="2"
          max="24"
          step="1"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="ink-slider"
        />
      </div>

      <div className="panel-section">
        <label className="section-label">
          <Droplets size={14} className="inline-icon" />
          墨色浓淡
          <span className="slider-value">{Math.round(inkDensity * 100)}%</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={inkDensity}
          onChange={(e) => setInkDensity(Number(e.target.value))}
          className="ink-slider"
        />
      </div>

      <div className="panel-actions">
        <button className="action-btn clear-btn" onClick={onClear}>
          <Eraser size={16} />
          <span>清空画布</span>
        </button>
        <button className="action-btn export-btn" onClick={onExport}>
          <Download size={16} />
          <span>导出PNG</span>
        </button>
      </div>
    </div>
  );
}
