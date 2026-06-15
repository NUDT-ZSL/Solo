/**
 * ============================================================
 *  ThemePanel.tsx - 单个主题调色板卡片
 * ============================================================
 *
 * 【职责】
 *    - 渲染 4 个颜色选择器（主色 / 辅色 / 背景色 / 文字色）
 *    - 每个选择器包含：吸色器圆形按钮（悬停放大 1.2x + tooltip）+ HEX 输入框
 *    - 支持折叠/展开（高度缩放动画 300ms cubic-bezier）
 *    - 支持主题名称编辑（8字限制）与删除（触发 200ms 缩小动画）
 *
 * 【被调用位置】
 *    - src/components/App.tsx → 在 themes.map 循环中渲染 N 份
 *
 * 【向上回调 → App】
 *    - onColorChange(themeId, colorKey, value)   :  某颜色值变更
 *    - onNameChange(themeId, name)               :  主题名称变更
 *    - onToggleCollapse(themeId)                 :  折叠/展开切换
 *    - onDelete(themeId)                         :  请求删除（由 App 驱动 deleting → CSS 动画 → splice）
 *
 * 【数据流向】
 *    用户点击圆形吸色器 → 触发隐藏的 <input type=color> → onChange → onColorChange
 *    用户修改 HEX 输入框 → 校验合法 HEX → onChange → onColorChange
 *    （保证颜色变更在 <16ms 内通过 useCallback + 不可变更新传递到看板）
 * ============================================================
 */
import { memo, useState, useRef, useEffect, useCallback } from 'react'
import type { ThemeScheme, ColorKey } from '../types'

interface ThemePanelProps {
  theme: ThemeScheme
  onColorChange: (themeId: string, colorKey: ColorKey, value: string) => void
  onNameChange: (themeId: string, name: string) => void
  onToggleCollapse: (themeId: string) => void
  onDelete: (themeId: string) => void
  canDelete: boolean
}

const colorLabels: Record<ColorKey, string> = {
  primary: '主色',
  secondary: '辅色',
  background: '背景色',
  text: '文字色',
}

const colorKeys: ColorKey[] = ['primary', 'secondary', 'background', 'text']

function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
}

/* ============== ColorPicker 子组件 ============== */
interface ColorPickerProps {
  label: string
  colorKey: ColorKey
  color: string
  onChange: (key: ColorKey, value: string) => void
}

const ColorPicker = memo(function ColorPicker({
  label,
  colorKey,
  color,
  onChange,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(color)
  const [showTooltip, setShowTooltip] = useState(false)
  const nativeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(color)
  }, [color])

  const handleColorInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(colorKey, e.target.value)
    },
    [colorKey, onChange]
  )

  const handleTextInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)
      if (isValidHex(value)) {
        onChange(colorKey, value)
      }
    },
    [colorKey, onChange]
  )

  const handleTextBlur = useCallback(() => {
    if (!isValidHex(inputValue)) {
      setInputValue(color)
    }
  }, [inputValue, color])

  const handlePickerClick = useCallback(() => {
    nativeInputRef.current?.click()
  }, [])

  return (
    <div className="color-picker-row">
      <span className="color-label">{label}</span>
      <div className="color-picker-wrapper">
        <div
          className="color-picker-btn"
          style={{ backgroundColor: color }}
          onClick={handlePickerClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') handlePickerClick()
          }}
        >
          <svg
            className="color-picker-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          {showTooltip && (
            <div className="color-tooltip">{color.toUpperCase()}</div>
          )}
        </div>
        <input
          ref={nativeInputRef}
          type="color"
          value={color}
          onChange={handleColorInput}
          className="color-picker-native"
          aria-label={`选择${label}`}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleTextInput}
          onBlur={handleTextBlur}
          className="color-hex-input"
          maxLength={7}
          spellCheck={false}
          aria-label={`${label}HEX值`}
        />
      </div>
    </div>
  )
})

/* ============== ThemePanel 主组件 ============== */
function ThemePanel({
  theme,
  onColorChange,
  onNameChange,
  onToggleCollapse,
  onDelete,
  canDelete,
}: ThemePanelProps) {
  const handleColorChange = useCallback(
    (key: ColorKey, value: string) => {
      onColorChange(theme.id, key, value)
    },
    [theme.id, onColorChange]
  )

  const handleNameInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(theme.id, e.target.value)
    },
    [theme.id, onNameChange]
  )

  const handleCollapse = useCallback(() => {
    onToggleCollapse(theme.id)
  }, [theme.id, onToggleCollapse])

  const handleDelete = useCallback(() => {
    if (canDelete) onDelete(theme.id)
  }, [canDelete, theme.id, onDelete])

  return (
    <div
      className={`theme-card ${theme.collapsed ? 'collapsed' : ''} ${
        theme.deleting ? 'deleting' : ''
      }`}
    >
      <div className="theme-card-header">
        <div className="theme-header-left">
          <input
            type="text"
            value={theme.name}
            onChange={handleNameInput}
            className="theme-name-input"
            maxLength={8}
            aria-label="主题名称"
          />
          <div className="color-dots">
            {colorKeys.map(key => (
              <span
                key={key}
                className="color-dot"
                style={{ backgroundColor: theme.colors[key] }}
                title={colorLabels[key]}
              />
            ))}
          </div>
        </div>
        <div className="theme-header-actions">
          <button
            className="collapse-btn"
            onClick={handleCollapse}
            title={theme.collapsed ? '展开' : '折叠'}
            aria-label={theme.collapsed ? '展开主题面板' : '折叠主题面板'}
          >
            <svg
              className={`collapse-icon ${theme.collapsed ? 'rotated' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {canDelete && (
            <button
              className="delete-btn"
              onClick={handleDelete}
              title="删除主题"
              aria-label="删除当前主题"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="theme-card-body">
        {colorKeys.map(key => (
          <ColorPicker
            key={key}
            label={colorLabels[key]}
            colorKey={key}
            color={theme.colors[key]}
            onChange={handleColorChange}
          />
        ))}
      </div>
    </div>
  )
}

export default memo(ThemePanel)
