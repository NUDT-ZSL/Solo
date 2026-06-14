import React, { useRef } from 'react';
import { ToolType, PRESET_COLORS } from './types';

interface ToolbarProps {
  currentTool: ToolType;
  currentColor: string;
  currentFontSize: number;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onFontSizeChange: (size: number) => void;
  onImageUpload: (file: File) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentColor,
  currentFontSize,
  onToolChange,
  onColorChange,
  onFontSizeChange,
  onImageUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tools: { type: ToolType; label: string; icon: string }[] = [
    { type: 'select', label: '选择', icon: '↖' },
    { type: 'anchor', label: '锚点', icon: '●' },
    { type: 'text', label: '文本', icon: 'T' },
    { type: 'arrow', label: '箭头', icon: '→' },
    { type: 'ruler', label: '量尺', icon: '⟷' },
  ];

  const fontSizes = Array.from({ length: 12 }, (_, i) => 10 + i * 2);

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button
          className="upload-btn"
          onClick={handleUploadClick}
          title="上传图片"
        >
          上传图片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="toolbar-tools">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className={`tool-btn ${currentTool === tool.type ? 'active' : ''}`}
            onClick={() => onToolChange(tool.type)}
            title={tool.label}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <div className="color-picker">
          <span className="picker-label">颜色</span>
          <div className="color-options">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`color-option ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onColorChange(color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="font-size-picker">
          <span className="picker-label">字号</span>
          <select
            className="font-size-select"
            value={currentFontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
          >
            {fontSizes.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
