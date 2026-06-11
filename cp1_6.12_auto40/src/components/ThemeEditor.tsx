import React, { memo, useCallback, useMemo } from 'react';
import { RotateCcw, Palette, Maximize2, Box, Type } from 'lucide-react';
import { useTheme } from '@/state/themeStore';
import { FontFamilyOption } from '@/types/theme';
import './ThemeEditor.css';

const fontOptions: { value: FontFamilyOption; label: string }[] = [
  { value: 'sans-serif', label: '无衬线体' },
  { value: 'serif', label: '衬线体' },
  { value: 'monospace', label: '等宽体' },
];

const ThemeEditor: React.FC = () => {
  const { theme, updateTheme, resetTheme } = useTheme();

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateTheme({ primaryColor: e.target.value });
  }, [updateTheme]);

  const handleRadiusChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateTheme({ borderRadius: Number(e.target.value) });
  }, [updateTheme]);

  const handleShadowChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateTheme({ boxShadow: Number(e.target.value) });
  }, [updateTheme]);

  const handleFontChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateTheme({ fontFamily: e.target.value });
  }, [updateTheme]);

  const handleReset = useCallback(() => {
    resetTheme();
  }, [resetTheme]);

  const shadowPercentage = useMemo(() => (theme.boxShadow / 8) * 100, [theme.boxShadow]);
  const radiusPercentage = useMemo(() => ((theme.borderRadius - 4) / 16) * 100, [theme.borderRadius]);

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
        <div className="theme-editor__group">
          <label className="theme-editor__label">
            <span className="theme-editor__label-icon">
              <Palette size={16} />
            </span>
            主色
          </label>
          <div className="theme-editor__color-picker">
            <div
              className="theme-editor__color-preview"
              style={{ backgroundColor: theme.primaryColor }}
            />
            <input
              type="color"
              value={theme.primaryColor}
              onChange={handleColorChange}
              className="theme-editor__color-input"
            />
            <span className="theme-editor__color-value">{theme.primaryColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="theme-editor__group">
          <label className="theme-editor__label">
            <span className="theme-editor__label-icon">
              <Maximize2 size={16} />
            </span>
            圆角大小
            <span className="theme-editor__value">{theme.borderRadius}px</span>
          </label>
          <div className="theme-editor__slider-wrapper">
            <input
              type="range"
              min="4"
              max="20"
              step="1"
              value={theme.borderRadius}
              onChange={handleRadiusChange}
              className="theme-editor__slider"
              style={{
                background: `linear-gradient(to right, var(--primary-color, #4F46E5) 0%, var(--primary-color, #4F46E5) ${radiusPercentage}%, #e8eaed ${radiusPercentage}%, #e8eaed 100%)`,
              }}
            />
            <div
              className="theme-editor__slider-thumb"
              style={{ left: `calc(${radiusPercentage}% - 8px)` }}
            />
          </div>
          <div className="theme-editor__range-labels">
            <span>4px</span>
            <span>20px</span>
          </div>
        </div>

        <div className="theme-editor__group">
          <label className="theme-editor__label">
            <span className="theme-editor__label-icon">
              <Box size={16} />
            </span>
            阴影强度
            <span className="theme-editor__value">{theme.boxShadow}</span>
          </label>
          <div className="theme-editor__slider-wrapper">
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={theme.boxShadow}
              onChange={handleShadowChange}
              className="theme-editor__slider"
              style={{
                background: `linear-gradient(to right, var(--primary-color, #4F46E5) 0%, var(--primary-color, #4F46E5) ${shadowPercentage}%, #e8eaed ${shadowPercentage}%, #e8eaed 100%)`,
              }}
            />
            <div
              className="theme-editor__slider-thumb"
              style={{ left: `calc(${shadowPercentage}% - 8px)` }}
            />
          </div>
          <div className="theme-editor__range-labels">
            <span>无</span>
            <span>强</span>
          </div>
        </div>

        <div className="theme-editor__group">
          <label className="theme-editor__label">
            <span className="theme-editor__label-icon">
              <Type size={16} />
            </span>
            字体族
          </label>
          <select
            value={theme.fontFamily}
            onChange={handleFontChange}
            className="theme-editor__select"
          >
            {fontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
};

ThemeEditor.displayName = 'ThemeEditor';

export default memo(ThemeEditor);
