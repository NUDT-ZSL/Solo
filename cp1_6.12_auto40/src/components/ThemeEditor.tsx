/**
 * ThemeEditor.tsx - 主题编辑器面板
 *
 * 数据流向：
 *   - 输入：useTheme() 获取 theme 对象 + updateTheme/resetTheme 方法
 *   - 分发：将 theme 各字段分别传入对应的子组件（ColorPicker/RangeSlider/FontSelector）
 *   - 回调：各子组件的 onChange → 调用 updateTheme(partial) → themeStore 更新 CSS 变量
 *
 * 性能优化策略：
 *   1. 父组件用 React.memo 包裹
 *   2. 每个子控件拆分为独立 memo 子组件，避免整体重渲染
 *   3. 每个 onChange 用 useCallback 包装，保持引用稳定
 *   4. 主题更新通过 CSS 变量生效，不触发 React 组件树级联重渲染
 *   5. 因此滑块拖动时只有滑块组件自身重渲染，500ms 内完成更新
 *
 * 调用关系：
 *   - 消费：useTheme (from themeStore)
 *   - 被调用：App.tsx 作为右侧面板 / 抽屉内容引入
 *   - 调用：ColorPicker / RangeSlider / FontSelector (子控件组件)
 */

import { memo, useCallback, useMemo } from 'react';
import { RotateCcw, Palette, Maximize2, Box } from 'lucide-react';
import { useTheme } from '@/state/themeStore';
import { type FontFamilyOption } from '@/types/theme';
import ColorPicker from './theme-editor/ColorPicker';
import RangeSlider from './theme-editor/RangeSlider';
import FontSelector from './theme-editor/FontSelector';
import './ThemeEditor.css';

const fontOptions: { value: FontFamilyOption; label: string }[] = [
  { value: 'sans-serif', label: '无衬线体' },
  { value: 'serif', label: '衬线体' },
  { value: 'monospace', label: '等宽体' },
];

const ThemeEditor = () => {
  const { theme, updateTheme, resetTheme } = useTheme();

  const handleColorChange = useCallback((color: string) => {
    updateTheme({ primaryColor: color });
  }, [updateTheme]);

  const handleRadiusChange = useCallback((value: number) => {
    updateTheme({ borderRadius: value });
  }, [updateTheme]);

  const handleShadowChange = useCallback((value: number) => {
    updateTheme({ boxShadow: value });
  }, [updateTheme]);

  const handleFontChange = useCallback((value: string) => {
    updateTheme({ fontFamily: value });
  }, [updateTheme]);

  const handleReset = useCallback(() => {
    resetTheme();
  }, [resetTheme]);

  const radiusIcon = useMemo(() => <Maximize2 size={16} />, []);
  const shadowIcon = useMemo(() => <Box size={16} />, []);

  return (
    <aside className="theme-editor">
      <div className="theme-editor__header">
        <h2 className="theme-editor__title">
          <Palette size={18} />
          主题定制
        </h2>
        <button
          className="theme-editor__reset"
          onClick={handleReset}
          title="重置主题"
          type="button"
        >
          <RotateCcw size={16} />
          重置
        </button>
      </div>

      <div className="theme-editor__content">
        <ColorPicker
          color={theme.primaryColor}
          onChange={handleColorChange}
          label="主色"
        />

        <RangeSlider
          value={theme.borderRadius}
          min={4}
          max={20}
          step={1}
          label="圆角大小"
          unit="px"
          minLabel="4px"
          maxLabel="20px"
          icon={radiusIcon}
          onChange={handleRadiusChange}
        />

        <RangeSlider
          value={theme.boxShadow}
          min={0}
          max={8}
          step={1}
          label="阴影强度"
          minLabel="无"
          maxLabel="强"
          icon={shadowIcon}
          onChange={handleShadowChange}
        />

        <FontSelector
          value={theme.fontFamily}
          options={fontOptions}
          onChange={handleFontChange}
          label="字体族"
        />
      </div>
    </aside>
  );
};

ThemeEditor.displayName = 'ThemeEditor';

export default memo(ThemeEditor);
