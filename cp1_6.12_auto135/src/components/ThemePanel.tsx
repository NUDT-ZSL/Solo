import { useState, useRef, useEffect } from 'react'
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

function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
}

function ColorPicker({
  label,
  colorKey,
  color,
  onChange,
}: {
  label: string
  colorKey: ColorKey
  color: string
  onChange: (key: ColorKey, value: string) => void
}) {
  const [inputValue, setInputValue] = useState(color)
  const [showTooltip, setShowTooltip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(color)
  }, [color])

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onChange(colorKey, value)
  }

  const handleTextInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (isValidHex(value)) {
      onChange(colorKey, value)
    }
  }

  const handleTextBlur = () => {
    if (!isValidHex(inputValue)) {
      setInputValue(color)
    }
  }

  const handlePickerClick = () => {
    inputRef.current?.click()
  }

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
          ref={inputRef}
          type="color"
          value={color}
          onChange={handleColorInput}
          className="color-picker-native"
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleTextInput}
          onBlur={handleTextBlur}
          className="color-hex-input"
          maxLength={7}
        />
      </div>
    </div>
  )
}

function ThemePanel({
  theme,
  onColorChange,
  onNameChange,
  onToggleCollapse,
  onDelete,
  canDelete,
}: ThemePanelProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = () => {
    if (!canDelete) return
    setIsDeleting(true)
    setTimeout(() => {
      onDelete(theme.id)
    }, 200)
  }

  const handleColorChange = (key: ColorKey, value: string) => {
    onColorChange(theme.id, key, value)
  }

  const colorKeys: ColorKey[] = ['primary', 'secondary', 'background', 'text']

  return (
    <div
      className={`theme-card ${theme.collapsed ? 'collapsed' : ''} ${
        isDeleting ? 'deleting' : ''
      }`}
    >
      <div className="theme-card-header">
        <div className="theme-header-left">
          <input
            type="text"
            value={theme.name}
            onChange={e => onNameChange(theme.id, e.target.value)}
            className="theme-name-input"
            maxLength={8}
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
            onClick={() => onToggleCollapse(theme.id)}
            title={theme.collapsed ? '展开' : '折叠'}
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

export default ThemePanel
