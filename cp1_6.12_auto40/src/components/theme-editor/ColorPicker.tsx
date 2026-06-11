/**
 * ColorPicker.tsx - 颜色选择器子组件
 *
 * 数据流向：
 *   - 输入：color (当前颜色值) + onChange (修改回调)
 *   - 输出：颜色预览块 + 原生 input[type=color] + 色值文本
 *   - 性能：React.memo 包裹，仅当 color/onChange 变化时才重渲染
 *
 * 调用关系：
 *   - 被 ThemeEditor.tsx 调用
 *   - onChange 回调最终调用 themeStore 的 updateTheme
 */

import { memo, useCallback } from 'react';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const ColorPicker = memo(({ color, onChange, label = '主色' }: ColorPickerProps) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="theme-editor__group">
      <label className="theme-editor__label">
        <span className="theme-editor__label-icon">
          <Palette size={16} />
        </span>
        {label}
      </label>
      <div className="theme-editor__color-picker">
        <div
          className="theme-editor__color-preview"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          value={color}
          onChange={handleChange}
          className="theme-editor__color-input"
        />
        <span className="theme-editor__color-value">{color.toUpperCase()}</span>
      </div>
    </div>
  );
});

ColorPicker.displayName = 'ColorPicker';

export default ColorPicker;
