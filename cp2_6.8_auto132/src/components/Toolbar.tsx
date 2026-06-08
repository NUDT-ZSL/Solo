import React from 'react';
import { Palette, Type, Ruler, Eye, EyeOff } from 'lucide-react';
import type { ColorToken, TypographyToken } from '../types';

interface ToolbarProps {
  colors: ColorToken[];
  typography: TypographyToken;
  rulerVisible: boolean;
  onToggleRuler: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  colors,
  typography,
  rulerVisible,
  onToggleRuler,
}) => {
  return (
    <div className="canvas-toolbar">
      <div className="toolbar-group">
        <div className="toolbar-item" title="提取的主色">
          <Palette size={14} />
          <div className="color-dots">
            {colors.slice(0, 5).map((c, i) => (
              <span
                key={i}
                className="color-dot"
                style={{ backgroundColor: c.hex }}
                title={c.hex}
              />
            ))}
            {colors.length === 0 && <span className="empty-hint">暂无</span>}
          </div>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-item" title="字体摘要">
          <Type size={14} />
          <span className="font-summary">
            {typography.fontFamily} · {typography.fontSize}px · {typography.fontWeight}
          </span>
        </div>
      </div>

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${rulerVisible ? 'active' : ''}`}
          onClick={onToggleRuler}
          title={rulerVisible ? '隐藏标尺' : '显示标尺'}
        >
          {rulerVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          <Ruler size={14} />
          <span>{rulerVisible ? '标尺开启' : '标尺关闭'}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
