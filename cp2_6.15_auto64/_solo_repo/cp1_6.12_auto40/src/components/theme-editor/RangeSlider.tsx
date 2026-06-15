/**
 * RangeSlider.tsx - 滑块选择器子组件
 *
 * 数据流向：
 *   - 输入：value / min / max / step / label / unit
 *   - 计算：useMemo 计算百分比位置用于自定义轨道样式
 *   - 输出：带高亮轨道的自定义滑块 + 数值标签 + 范围刻度
 *   - 性能：React.memo 包裹，仅当相关 props 变化时重渲染
 *
 * 调用关系：
 *   - 被 ThemeEditor.tsx 调用（圆角、阴影强度复用）
 *   - onChange 回调最终调用 themeStore 的 updateTheme
 */

import { memo, useCallback, useMemo } from 'react';

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  minLabel?: string;
  maxLabel?: string;
  icon?: React.ReactNode;
  onChange: (value: number) => void;
}

const RangeSlider = memo(({
  value,
  min,
  max,
  step = 1,
  label,
  unit = '',
  minLabel,
  maxLabel,
  icon,
  onChange,
}: RangeSliderProps) => {
  const percentage = useMemo(() => {
    return ((value - min) / (max - min)) * 100;
  }, [value, min, max]);

  const trackStyle = useMemo(() => ({
    background: `linear-gradient(to right, var(--primary-color, #4F46E5) 0%, var(--primary-color, #4F46E5) ${percentage}%, #e8eaed ${percentage}%, #e8eaed 100%)`,
  }), [percentage]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  }, [onChange]);

  return (
    <div className="theme-editor__group">
      <label className="theme-editor__label">
        {icon && <span className="theme-editor__label-icon">{icon}</span>}
        {label}
        <span className="theme-editor__value">
          {value}{unit}
        </span>
      </label>
      <div className="theme-editor__slider-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="theme-editor__slider"
          style={trackStyle}
        />
      </div>
      {(minLabel || maxLabel) && (
        <div className="theme-editor__range-labels">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
});

RangeSlider.displayName = 'RangeSlider';

export default RangeSlider;
