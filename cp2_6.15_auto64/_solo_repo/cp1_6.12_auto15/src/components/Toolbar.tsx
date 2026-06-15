import { Undo2, Trash2 } from 'lucide-react';

export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: '红', hex: '#ff4757' },
  { name: '橙', hex: '#ff7f50' },
  { name: '黄', hex: '#ffd93d' },
  { name: '绿', hex: '#6bcB77' },
  { name: '青', hex: '#4ecdc4' },
  { name: '蓝', hex: '#45b7d1' },
  { name: '紫', hex: '#a55eea' },
  { name: '粉', hex: '#fd79a8' },
  { name: '白', hex: '#f5f6fa' },
  { name: '黑', hex: '#2d3436' },
];

export interface ToolbarProps {
  currentColor: string;
  brushSize: number;
  isAdmin: boolean;
  canUndo: boolean;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onClearCanvas: () => void;
}

function Toolbar({
  currentColor,
  brushSize,
  isAdmin,
  canUndo,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onClearCanvas,
}: ToolbarProps) {
  return (
    <aside className="toolbar">
      {isAdmin && <div className="admin-badge">管理员</div>}

      <div className="toolbar-section">
        <span className="toolbar-label">颜色</span>
        <div className="color-grid">
          {PRESET_COLORS.map((c) => (
            <div
              key={c.hex}
              role="button"
              tabIndex={0}
              aria-label={`选择${c.name}色`}
              className={`color-swatch ${currentColor === c.hex ? 'selected' : ''}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => onColorChange(c.hex)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onColorChange(c.hex);
                }
              }}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">笔刷</span>
        <div className="brush-slider-container">
          <div className="brush-preview" aria-hidden="true">
            <div
              className="brush-preview-circle"
              style={{
                width: `${Math.max(4, brushSize)}px`,
                height: `${Math.max(4, brushSize)}px`,
                backgroundColor: currentColor,
              }}
            />
          </div>
          <input
            type="range"
            className="brush-slider"
            min={1}
            max={20}
            step={1}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            aria-label="笔刷大小"
          />
        </div>
      </div>

      <div className="toolbar-buttons">
        <button
          type="button"
          className="icon-button undo"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="撤销"
          title="撤销上一步"
        >
          <Undo2 size={20} strokeWidth={2} />
        </button>
        {isAdmin && (
          <button
            type="button"
            className="icon-button clear"
            onClick={onClearCanvas}
            aria-label="清除画布"
            title="清除全部内容（管理员）"
          >
            <Trash2 size={20} strokeWidth={2} />
          </button>
        )}
      </div>
    </aside>
  );
}

export default Toolbar;
