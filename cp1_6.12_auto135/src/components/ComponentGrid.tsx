/**
 * ============================================================
 *  ComponentGrid.tsx - 组件看板 / 预览网格
 * ============================================================
 *
 * 【职责】
 *    - 按主题数量使用 CSS Grid 精确排列：
 *        2 主题 → 2 列 1 行（cols-2）
 *        3-4 主题 → 4 列 1 行（cols-4）
 *        5-6 主题 → 2 列 3 行（cols-2-rows-3，纵向流动）
 *    - 每一列渲染一个完整的组件预览集合：
 *        按钮（主要 / 次要 / 文字）、卡片、输入框（默认/成功/错误）、开关
 *    - 所有组件形状、配色精确跟随当前主题
 *    - 通过 React.memo + useMemo + useCallback 保证 60FPS 无延迟刷新
 *
 * 【被调用位置】
 *    - src/components/App.tsx → <ComponentGrid themes={themes} template={template} gridCols={gridClass} />
 *
 * 【依赖的数据流向】
 *    App.themes (不可变数组)
 *        → props.themes 传入
 *        → 每列 ThemeColumn 通过 React.memo 浅比较跳过未变更的列
 *        → 列内组件 useMemo 计算 style，仅当 colors/template 引用改变时重算
 *
 * 【内部组件层级】
 *    ComponentGrid（memo）
 *       └─ ThemeColumn (memo) × N 列
 *            ├─ ThemedButton × 3 变体
 *            ├─ ThemedCard
 *            ├─ ThemedInput × 3 状态
 *            └─ ThemedToggle
 *
 * 【导出功能关联】
 *    ExportButton 通过 id="component-grid" 获取本组件 DOM 节点进行 html2canvas 截图
 * ============================================================
 */
import { memo, useState, useMemo, useCallback } from 'react'
import type { ThemeScheme, ComponentTemplate, ThemeColors } from '../types'

interface ComponentGridProps {
  themes: ThemeScheme[]
  template: ComponentTemplate
  gridCols: string
}

/* ========== 颜色工具函数（纯函数，便于编译器内联） ========== */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt)
  const B = Math.max(0, (num & 0x0000ff) - amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

/* ========== 按钮组件 ========== */
interface ThemedButtonProps {
  colors: ThemeColors
  variant: 'primary' | 'secondary' | 'text'
  template: ComponentTemplate
  children: React.ReactNode
}

const ThemedButton = memo(function ThemedButton({
  colors,
  variant,
  template,
  children,
}: ThemedButtonProps) {
  const baseStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 500,
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      border: 'none',
    }

    if (template === 'material') {
      base.borderRadius = '4px'
      base.textTransform = 'uppercase'
      base.fontSize = '13px'
      base.letterSpacing = '0.5px'
      base.padding = variant === 'text' ? '6px 14px' : '8px 20px'
    } else {
      base.borderRadius = '6px'
      base.fontSize = '14px'
      base.padding = variant === 'text' ? '6px 14px' : '8px 18px'
    }

    if (variant === 'primary') {
      base.backgroundColor = colors.primary
      base.color = '#ffffff'
    } else if (variant === 'secondary') {
      base.backgroundColor = 'transparent'
      base.color = colors.primary
      base.border = `2px solid ${colors.primary}`
    } else {
      base.backgroundColor = 'transparent'
      base.color = colors.primary
    }

    return base
  }, [colors, variant, template])

  const [isHovered, setIsHovered] = useState(false)

  const hoverStyle = useMemo<React.CSSProperties>(() => {
    if (!isHovered) return {}
    if (variant === 'primary') {
      return { backgroundColor: darkenColor(colors.primary, 10) }
    }
    return { backgroundColor: hexToRgba(colors.primary, 0.08) }
  }, [isHovered, colors.primary, variant])

  const handleEnter = useCallback(() => setIsHovered(true), [])
  const handleLeave = useCallback(() => setIsHovered(false), [])

  return (
    <button
      className="themed-button"
      style={{ ...baseStyle, ...hoverStyle }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {isHovered && <span className="button-shimmer" />}
      {children}
    </button>
  )
})

/* ========== 卡片组件 ========== */
interface ThemedCardProps {
  colors: ThemeColors
  template: ComponentTemplate
}

const ThemedCard = memo(function ThemedCard({ colors, template }: ThemedCardProps) {
  const cardStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      backgroundColor: colors.background,
      color: colors.text,
      overflow: 'hidden',
    }

    if (template === 'material') {
      base.borderRadius = '8px'
      base.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
    } else {
      base.borderRadius = '12px'
      base.border = `1px solid ${hexToRgba(colors.text, 0.12)}`
    }

    return base
  }, [colors, template])

  const titleStyle = useMemo(() => ({ color: colors.text }), [colors.text])
  const descStyle = useMemo(
    () => ({ color: hexToRgba(colors.text, 0.7) }),
    [colors.text]
  )

  return (
    <div className="themed-card" style={cardStyle}>
      <div className="card-image" style={{ backgroundColor: colors.secondary }}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ width: '48px', height: '48px', color: hexToRgba('#ffffff', 0.6) }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <div className="card-content">
        <h3 className="card-title" style={titleStyle}>
          组件卡片标题
        </h3>
        <p className="card-description" style={descStyle}>
          这是一段描述文字，展示卡片组件在当前主题配色下的效果。
        </p>
      </div>
    </div>
  )
})

/* ========== 输入框组件 ========== */
interface ThemedInputProps {
  colors: ThemeColors
  template: ComponentTemplate
  state: 'default' | 'success' | 'error'
}

const ThemedInput = memo(function ThemedInput({
  colors,
  template,
  state,
}: ThemedInputProps) {
  const inputStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      width: '100%',
      fontSize: '14px',
      color: colors.text,
      backgroundColor: colors.background,
      boxSizing: 'border-box',
    }

    let borderColor = hexToRgba(colors.text, 0.3)
    if (state === 'success') borderColor = '#4caf50'
    if (state === 'error') borderColor = '#f44336'

    if (template === 'material') {
      base.border = 'none'
      base.borderBottom = `2px solid ${borderColor}`
      base.padding = '6px 0'
      base.borderRadius = '0'
    } else {
      base.border = `1px solid ${borderColor}`
      base.padding = '8px 12px'
      base.borderRadius = '6px'
    }

    return base
  }, [colors, template, state])

  const labelText = state === 'default' ? '标签文字' : state === 'success' ? '输入成功' : '输入错误'
  const helperText =
    state === 'default' ? '请输入内容...' : state === 'success' ? '验证通过' : '请检查输入内容'
  const helperColor =
    state === 'success' ? '#4caf50' : state === 'error' ? '#f44336' : hexToRgba(colors.text, 0.5)

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
        readOnly
      />
      <span className="input-helper" style={{ color: helperColor }}>
        {helperText}
      </span>
    </div>
  )
})

/* ========== 开关组件 ========== */
interface ThemedToggleProps {
  colors: ThemeColors
  template: ComponentTemplate
}

const ThemedToggle = memo(function ThemedToggle({
  colors,
  template,
}: ThemedToggleProps) {
  const [checked, setChecked] = useState(false)
  const toggle = useCallback(() => setChecked(v => !v), [])

  const trackStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: template === 'material' ? '36px' : '44px',
      height: template === 'material' ? '14px' : '22px',
      borderRadius: template === 'material' ? '7px' : '11px',
      backgroundColor: checked
        ? hexToRgba(colors.primary, 0.5)
        : hexToRgba(colors.text, 0.3),
      position: 'relative',
      cursor: 'pointer',
      display: 'inline-block',
    }
  }, [checked, colors.primary, colors.text, template])

  const thumbStyle = useMemo<React.CSSProperties>(() => {
    const size = template === 'material' ? 20 : 18
    const travel = template === 'material' ? 16 : 26
    return {
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: checked ? colors.primary : '#ffffff',
      position: 'absolute',
      top: '50%',
      transform: `translateY(-50%) translateX(${checked ? travel : 2}px)`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      transition: 'transform 0.2s ease, background-color 0.2s ease',
    }
  }, [checked, colors.primary, template])

  return (
    <div className="themed-toggle" style={trackStyle} onClick={toggle}>
      <div style={thumbStyle} />
    </div>
  )
})

/* ========== 单列主题预览 ========== */
interface ThemeColumnProps {
  theme: ThemeScheme
  template: ComponentTemplate
}

const ThemeColumn = memo(function ThemeColumn({ theme, template }: ThemeColumnProps) {
  const columnStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: theme.colors.background,
      borderRadius: '12px',
      padding: '20px',
      minHeight: '100%',
    }),
    [theme.colors.background]
  )

  const titleStyle = useMemo(
    () => ({ color: theme.colors.text }),
    [theme.colors.text]
  )

  return (
    <div className="theme-column" style={columnStyle}>
      <div className="theme-column-header">
        <h3 className="theme-column-title" style={titleStyle}>
          {theme.name}
        </h3>
      </div>

      <div className="component-row">
        <div className="component-group">
          <h4 className="component-group-title" style={titleStyle}>
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
          <h4 className="component-group-title" style={titleStyle}>
            卡片 Card
          </h4>
          <ThemedCard colors={theme.colors} template={template} />
        </div>
      </div>

      <div className="component-row">
        <div className="component-group">
          <h4 className="component-group-title" style={titleStyle}>
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
          <h4 className="component-group-title" style={titleStyle}>
            开关 Toggle
          </h4>
          <div className="toggle-wrapper">
            <ThemedToggle colors={theme.colors} template={template} />
            <span className="toggle-label" style={titleStyle}>
              启用功能
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

/* ========== 看板主组件 ========== */
function ComponentGrid({ themes, template, gridCols }: ComponentGridProps) {
  return (
    <div className="component-grid-wrapper" id="component-grid">
      <div className={`component-grid ${gridCols}`}>
        {themes.map(theme => (
          <ThemeColumn key={theme.id} theme={theme} template={template} />
        ))}
      </div>
    </div>
  )
}

export default memo(ComponentGrid)
