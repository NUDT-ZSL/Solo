/**
 * FontSelector.tsx - 字体族选择器子组件
 *
 * 数据流向：
 *   - 输入：value (当前字体族 key) + options (选项列表) + onChange
 *   - 输出：原生 select 下拉框
 *   - 性能：React.memo 包裹，仅当 value/options/onChange 变化时重渲染
 *
 * 调用关系：
 *   - 被 ThemeEditor.tsx 调用
 *   - onChange 回调最终调用 themeStore 的 updateTheme
 */

import { memo, useCallback } from 'react';
import { Type } from 'lucide-react';

interface FontOption {
  value: string;
  label: string;
}

interface FontSelectorProps {
  value: string;
  options: FontOption[];
  onChange: (value: string) => void;
  label?: string;
}

const FontSelector = memo(({ value, options, onChange, label = '字体族' }: FontSelectorProps) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="theme-editor__group">
      <label className="theme-editor__label">
        <span className="theme-editor__label-icon">
          <Type size={16} />
        </span>
        {label}
      </label>
      <select
        value={value}
        onChange={handleChange}
        className="theme-editor__select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

FontSelector.displayName = 'FontSelector';

export default FontSelector;
