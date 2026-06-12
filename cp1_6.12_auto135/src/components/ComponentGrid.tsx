import { useState, useMemo } from 'react'
import type { ThemeScheme, ComponentTemplate, ThemeColors } from '../types'

interface ComponentGridProps {
  themes: ThemeScheme[]
  template: ComponentTemplate
  gridCols: string
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt)
  const B = Math.min(255, (num & 0x0000ff) + amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt)
  const B = Math.max(0, (num & 0x0000ff) - amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

interface ThemedButtonProps {
  colors: ThemeColors
  variant: 'primary' | 'secondary' | 'text'
  template: ComponentTemplate
  children: React.ReactNode
}

function ThemedButton({ colors, variant, template, children }: ThemedButtonProps) {
  const style = useMemo(() => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
    }

    if (template === 'material') {
      base.borderRadius = '4px'
      base.textTransform = 'uppercase'
      base.fontSize = '14px'
      base.letterSpacing = '0.5px'
      base.padding = variant === 'text' ? '8px 16px' : '10px 24px'
    } else {
      base.borderRadius = '6px'
      base.fontSize = '14px'
      base.padding = variant === 'text' ? '8px 16px' : '10px 20px'
    }

    if (variant === 'primary') {
      base.backgroundColor = colors.primary
      base.color = '#ffffff'
      base.border = 'none'
    } else if (variant === 'secondary') {
      base.backgroundColor = 'transparent'
      base.color = colors.primary
      base.border = `2px solid ${colors.primary}`
    } else {
      base.backgroundColor = 'transparent'
      base.color = colors.primary
      base.border = 'none'
    }

    return base
  }, [colors, variant, template])

  const [isHovered, setIsHovered] = useState(false)

  const hoverStyle = useMemo(() => {
    if (!isHovered) return {}
    if (variant === 'primary') {
      return { backgroundColor: darkenColor(colors.primary, 10) }
    }
    if (variant === 'secondary') {
      return { backgroundColor: hexToRgba(colors.primary, 0.08) }
    }
    return { backgroundColor: hexToRgba(colors.primary, 0.08) }
  }, [isHovered, colors.primary, variant])

  return (
    <button
      className="themed-button"
      style={{ ...style, ...hoverStyle }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && <span className="button-shimmer" />}
      {children}
    </button>
  )
}

interface ThemedCardProps {
  colors: ThemeColors
  template: ComponentTemplate
}

function ThemedCard({ colors, template }: ThemedCardProps) {
  const cardStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      backgroundColor: colors.background,
      color: colors.text,
      overflow: 'hidden',
      transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    }

    if (template === 'material') {
      base.borderRadius = '8px'
      base.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
    } else {
      base.borderRadius = '12px'
      base.border = `1px solid ${hexToRgba(colors.text, 0.1)}`
    }

    return base
  }, [colors, template])

  return (
    <div className="themed-card" style={cardStyle}>
      <div
        className="card-image"
        style={{ backgroundColor: colors.secondary }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{
            width: '48px',
            height: '48px',
            color: hexToRgba('#ffffff', 0.6),
          }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <div className="card-content">
        <h3 className="card-title" style={{ color: colors.text }}>
          组件卡片标题
        </h3>
        <p className="card-description" style={{ color: hexToRgba(colors.text, 0.7) }}>
          这是一段描述文字，展示卡片组件在当前主题配色下的效果。
        </p>
      </div>
    </div>
  )
}

interface ThemedInputProps {
  colors: ThemeColors
  template: ComponentTemplate
  state: 'default' | 'success' | 'error'
}

function ThemedInput({ colors, template, state }: ThemedInputProps) {
  const inputStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      width: '100%',
      fontSize: '14px',
      color: colors.text,
      backgroundColor: colors.background,
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
    }

    let borderColor = hexToRgba(colors.text, 0.3)
    if (state === 'success') borderColor = '#4caf50'
    if (state === 'error') borderColor = '#f44336'

    if (template === 'material') {
      base.border = 'none'
      base.borderBottom = `2px solid ${borderColor}`
      base.padding = '8px 0'
      base.borderRadius = '0'
    } else {
      base.border = `1px solid ${borderColor}`
      base.padding = '10px 12px'
      base.borderRadius = '6px'
    }

    return base
  }, [colors, template, state])

  const labelText = state === 'default' ? '标签文字' : state === 'success' ? '输入成功' : '输入错误'
  const helperText = state === 'default' ? '请输入内容...' : state === 'success' ? '验证通过' : '请检查输入内容'
  const helperColor = state === 'success' ? '#4caf50' : state === 'error' ? '#f44336' : hexToRgba(colors.text, 0.5)

  return (
    <div className="themed-input-wrapper">
      <label className="input-label" style={{ color: colors.text }}>
        {labelText}
      </label>
      <input
        type="text"
        style={inputStyle}
        placeholder="请输入..."
        className="themed-input"
      />
      <span className="input-helper" style={{ color: helperColor }}>
        {helperText}
      </span>
    </div>
  )
}

interface ThemedToggleProps {
  colors: ThemeColors
  template: ComponentTemplate
}

function ThemedToggle({ colors, template }: ThemedToggleProps) {
  const [checked, setChecked] = useState(false)

  const trackStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      width: template === 'material' ? '36px' : '48px',
      height: template === 'material' ? '14px' : '24px',
      borderRadius: template === 'material' ? '7px' : '12px',
      backgroundColor: checked ? hexToRgba(colors.primary, 0.5) : hexToRgba(colors.text, 0.3),
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    }
    return base
  }, [checked, colors.primary, colors.text, template])

  const thumbStyle = useMemo<React.CSSProperties>(() => {
    const size = template === 'material' ? '20px' : '20px'
    const base: React.CSSProperties = {
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: checked ? colors.primary : '#ffffff',
      position: 'absolute',
      top: '50%',
      transform: `translateY(-50%) translateX(${checked ? (template === 'material' ? '16px' : '28px') : '2px'})`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      transition: 'all 0.2s ease',
    }
    return base
  }, [checked, colors.primary, template])

  return (
    <div
      className="themed-toggle"
      style={trackStyle}
      onClick={() => setChecked(!checked)}
    >
      <div style={thumbStyle} />
    </div>
  )
}

interface ThemeColumnProps {
  theme: ThemeScheme
  template: ComponentTemplate
}

function ThemeColumn({ theme, template }: ThemeColumnProps) {
  return (
    <div
      className="theme-column"
      style={{
        backgroundColor: theme.colors.background,
        borderRadius: '12px',
        padding: '24px',
        minHeight: '100%',
      }}
    >
      <div className="theme-column-header">
        <h3
          className="theme-column-title"
          style={{ color: theme.colors.text }}
        >
          {theme.name}
        </h3>
      </div>

      <div className="component-row">
        <div className="component-group">
          <h4 className="component-group-title" style={{ color: theme.colors.text }}>
            按钮 Button
          </h4>
          <div className="button-variants">
            <ThemedButton colors={theme.colors} variant="primary" template={template}>
              主要按钮
            </ThemedButton>
            <ThemedButton colors={theme.colors} variant="secondary" template={template}>
              次要按钮
            </ThemedButton>
            <ThemedButton colors={theme.colors} variant="text" template={template}>
              文字按钮
            </ThemedButton>
          </div>
        </div>
      </div>

      <div className="component-row">
        <div className="component-group">
          <h4 className="component-group-title" style={{ color: theme.colors.text }}>
            卡片 Card
          </h4>
          <ThemedCard colors={theme.colors} template={template} />
        </div>
      </div>

      <div className="component-row">
        <div className="component-group">
          <h4 className="component-group-title" style={{ color: theme.colors.text }}>
            输入框 Input
          </h4>
          <div className="input-variants">
            <ThemedInput colors={theme.colors} template={template} state="default" />
            <ThemedInput colors={theme.colors} template={template} state="success" />
            <ThemedInput colors={theme.colors} template={template} state="error" />
          </div>
        </div>
      </div>

      <div className="component-row">
        <div className="component-group">
          <h4 className="component-group-title" style={{ color: theme.colors.text }}>
            开关 Toggle
          </h4>
          <div className="toggle-wrapper">
            <ThemedToggle colors={theme.colors} template={template} />
            <span className="toggle-label" style={{ color: theme.colors.text }}>
              启用功能
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ComponentGrid({ themes, template, gridCols }: ComponentGridProps) {
  const gridClass = themes.length <= 2 ? 'cols-2' : themes.length <= 4 ? 'cols-4' : 'cols-2-rows-3'

  return (
    <div className="component-grid-wrapper" id="component-grid">
      <div className={`component-grid ${gridClass}`}>
        {themes.map(theme => (
          <ThemeColumn key={theme.id} theme={theme} template={template} />
        ))}
      </div>
    </div>
  )
}

export default ComponentGrid
