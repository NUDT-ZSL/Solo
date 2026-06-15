import { useMemo, memo } from 'react'
import { getContrastText } from '../utils/colorUtils'
import './PreviewPanel.css'

interface PreviewPanelProps {
  primaryShades: string[]
  secondaryShades: string[]
  neutralShades: string[]
  successShades: string[]
  warningShades: string[]
  errorShades: string[]
  darkMode: boolean
  onDarkModeChange: (dark: boolean) => void
}

export const PreviewPanel = memo(function PreviewPanel({
  primaryShades,
  secondaryShades,
  neutralShades,
  successShades,
  warningShades,
  errorShades,
  darkMode,
  onDarkModeChange,
}: PreviewPanelProps) {
  const primary = primaryShades[5]
  const primaryNav = darkMode ? primaryShades[3] : primaryShades[5]
  const secondary = secondaryShades[5]
  const neutral300 = neutralShades[3]
  const neutral700 = neutralShades[7]

  const bgColor = darkMode ? '#1a1a2e' : '#f8f9fa'
  const textColor = darkMode ? '#e2e8f0' : '#1f2937'
  const subTextColor = darkMode ? '#94a3b8' : '#6b7280'
  const cardBg = darkMode ? '#2a2a3e' : '#ffffff'
  const inputBg = darkMode ? '#0f0f1a' : '#ffffff'
  const inputBorder = darkMode ? '#3a3a4e' : neutral300
  const navBg = darkMode ? '#2a2a3e' : '#ffffff'
  const navBorder = darkMode ? '#3a3a4e' : neutral300
  const navTextColor = darkMode ? '#f1f5f9' : '#1f2937'
  const navLinkHover = darkMode ? '#cbd5e1' : '#374151'
  const toggleBg = darkMode ? neutral700 : neutral300

  const primaryText = useMemo(
    () => getContrastText(primary),
    [primary]
  )

  return (
    <div
      className="preview-panel"
      style={{
        backgroundColor: bgColor,
        transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
        color: textColor,
      }}
    >
      <nav
        className="preview-nav"
        style={{
          backgroundColor: navBg,
          borderBottom: `1px solid ${navBorder}`,
          transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out',
        }}
      >
        <div className="preview-nav-brand" style={{ color: primaryNav }}>
          ChromaChord
        </div>
        <div className="preview-nav-links">
          <a
            href="#"
            className="preview-nav-link"
            style={{ color: navTextColor, ['--link-hover' as string]: navLinkHover }}
          >
            首页
          </a>
          <a
            href="#"
            className="preview-nav-link"
            style={{ color: navTextColor, ['--link-hover' as string]: navLinkHover }}
          >
            组件
          </a>
          <a
            href="#"
            className="preview-nav-link"
            style={{ color: navTextColor, ['--link-hover' as string]: navLinkHover }}
          >
            文档
          </a>
          <a
            href="#"
            className="preview-nav-link"
            style={{ color: navTextColor, ['--link-hover' as string]: navLinkHover }}
          >
            关于
          </a>
        </div>
        <div
          className="preview-nav-actions"
          style={{ backgroundColor: primary, color: primaryText }}
        >
          登录
        </div>
      </nav>

      <div className="preview-content">
        <h3 className="preview-section-title">组件预览</h3>

        <div className="preview-row">
          <button
            className="preview-btn-primary"
            style={{
              backgroundColor: primary,
              color: primaryText,
            }}
          >
            主要按钮
          </button>
          <button
            className="preview-btn-outline"
            style={{
              borderColor: primary,
              color: primary,
            }}
          >
            轮廓按钮
          </button>
          <button
            className="preview-btn-success"
            style={{
              backgroundColor: successShades[5],
              color: getContrastText(successShades[5]),
            }}
          >
            成功
          </button>
          <button
            className="preview-btn-warning"
            style={{
              backgroundColor: warningShades[5],
              color: getContrastText(warningShades[5]),
            }}
          >
            警告
          </button>
          <button
            className="preview-btn-error"
            style={{
              backgroundColor: errorShades[5],
              color: getContrastText(errorShades[5]),
            }}
          >
            错误
          </button>
        </div>

        <div className="preview-row">
          <div
            className="preview-card"
            style={{
              backgroundColor: cardBg,
              color: textColor,
              transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
            }}
          >
            <h4 style={{ color: primary, margin: 0 }}>卡片标题</h4>
            <p className="preview-card-desc" style={{ color: subTextColor }}>
              这是一段卡片描述文字，展示颜色在文本上的应用效果。
            </p>
            <div
              className="preview-card-tag"
              style={{
                backgroundColor: primaryShades[1],
                color: primary,
              }}
            >
              标签
            </div>
          </div>

          <div
            className="preview-card"
            style={{
              backgroundColor: cardBg,
              color: textColor,
              transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
            }}
          >
            <h4 style={{ color: secondary, margin: 0 }}>辅色卡片</h4>
            <p className="preview-card-desc" style={{ color: subTextColor }}>
              使用辅助色的卡片标题，呈现不同的视觉层次。
            </p>
            <div
              className="preview-card-tag"
              style={{
                backgroundColor: secondaryShades[1],
                color: secondary,
              }}
            >
              New
            </div>
          </div>

          <div
            className="preview-input-wrapper"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '240px',
            }}
          >
            <label className="preview-input-label" style={{ color: subTextColor }}>
              输入框
            </label>
            <input
              type="text"
              className="preview-input"
              placeholder="请输入内容..."
              style={{
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textColor,
                transition: 'border-color 0.2s ease, background-color 0.3s ease-in-out',
              }}
              onFocus={e => {
                e.target.style.borderColor = primary
              }}
              onBlur={e => {
                e.target.style.borderColor = inputBorder
              }}
            />
          </div>
        </div>

        <div className="preview-row">
          <div className="preview-status-group">
            <div
              className="preview-status-badge"
              style={{
                backgroundColor: successShades[1],
                color: successShades[6],
              }}
            >
              ● 成功状态
            </div>
            <div
              className="preview-status-badge"
              style={{
                backgroundColor: warningShades[1],
                color: warningShades[6],
              }}
            >
              ● 警告状态
            </div>
            <div
              className="preview-status-badge"
              style={{
                backgroundColor: errorShades[1],
                color: errorShades[6],
              }}
            >
              ● 错误状态
            </div>
          </div>
        </div>

        <div className="preview-neutrals">
          <h4 className="preview-section-subtitle" style={{ color: subTextColor }}>
            中性色阶
          </h4>
          <div className="preview-neutral-row">
            {neutralShades.slice(0, 6).map((shade, i) => (
              <div
                key={i}
                className="preview-neutral-swatch"
                style={{
                  backgroundColor: shade,
                  color: getContrastText(shade),
                }}
              >
                {i * 100 + 50}
              </div>
            ))}
          </div>
          <div className="preview-neutral-row">
            {neutralShades.slice(6).map((shade, i) => (
              <div
                key={i + 6}
                className="preview-neutral-swatch"
                style={{
                  backgroundColor: shade,
                  color: getContrastText(shade),
                }}
              >
                {(i + 6) * 100 + (i === 5 ? 350 : 50)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="preview-footer">
        <span className="dark-mode-label" style={{ color: subTextColor }}>
          {darkMode ? '暗色模式' : '亮色模式'}
        </span>
        <button
          className={`dark-mode-toggle ${darkMode ? 'active' : ''}`}
          style={{ backgroundColor: toggleBg }}
          onClick={() => onDarkModeChange(!darkMode)}
          aria-label="切换暗色模式"
        >
          <span className="dark-mode-toggle-slider" />
        </button>
      </div>
    </div>
  )
})
