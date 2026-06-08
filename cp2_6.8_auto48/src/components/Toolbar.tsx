import React, { useState } from 'react';
import { Template, TEMPLATES, PRESET_COLORS, FONT_SIZES } from '@/types';
import { Download, Palette, Type, Layout, Layers, ChevronUp, ChevronDown } from 'lucide-react';

interface ToolbarProps {
  activeTemplate: Template;
  backgroundColor: string;
  fontSize: number;
  margin: number;
  isExporting: boolean;
  onTemplateChange: (templateId: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onFontSizeChange: (size: number) => void;
  onMarginChange: (margin: number) => void;
  onExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeTemplate,
  backgroundColor,
  fontSize,
  margin,
  isExporting,
  onTemplateChange,
  onBackgroundColorChange,
  onFontSizeChange,
  onMarginChange,
  onExport,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  return (
    <div className={`toolbar ${isMobileExpanded ? 'expanded' : ''}`}>
      <button
        className="toolbar-mobile-toggle"
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
      >
        <span>设计工具</span>
        {isMobileExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>

      <div className="toolbar-content">
        <div className="toolbar-section">
          <div className="toolbar-section-title">
            <Layers size={16} />
            <span>预设模板</span>
          </div>
          <div className="template-grid">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                className={`template-item ${activeTemplate.id === template.id ? 'active' : ''}`}
                onClick={() => onTemplateChange(template.id)}
              >
                <div
                  className="template-preview"
                  style={{
                    backgroundColor: template.backgroundColor,
                    borderColor: template.accentColor,
                  }}
                >
                  <div
                    className="template-dot"
                    style={{ backgroundColor: template.accentColor }}
                  />
                  <div
                    className="template-line template-line-long"
                    style={{ backgroundColor: template.textColor }}
                  />
                  <div
                    className="template-line template-line-short"
                    style={{ backgroundColor: template.textColor, opacity: 0.6 }}
                  />
                </div>
                <span className="template-name">{template.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-section">
          <div className="toolbar-section-title">
            <Palette size={16} />
            <span>背景颜色</span>
          </div>
          <div className="color-grid">
            {PRESET_COLORS.map((color, idx) => (
              <button
                key={idx}
                className={`color-item ${backgroundColor === color ? 'active' : ''}`}
                onClick={() => onBackgroundColorChange(color)}
                style={
                  color.includes('gradient')
                    ? { backgroundImage: color }
                    : { backgroundColor: color }
                }
              />
            ))}
          </div>
        </div>

        <div className="toolbar-section">
          <div className="toolbar-section-title">
            <Type size={16} />
            <span>字体大小</span>
          </div>
          <select
            className="font-size-select"
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-section">
          <div className="toolbar-section-title">
            <Layout size={16} />
            <span>元素边距: {margin}px</span>
          </div>
          <input
            type="range"
            className="margin-slider"
            min={0}
            max={30}
            value={margin}
            onChange={(e) => onMarginChange(Number(e.target.value))}
          />
        </div>

        <div className="toolbar-section">
          <button
            className={`export-btn ${isExporting ? 'loading' : ''}`}
            onClick={onExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="spinner" />
                导出中...
              </>
            ) : (
              <>
                <Download size={18} />
                导出 PNG
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
