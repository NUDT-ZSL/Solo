import type { DesignToken } from '../types'
import './PreviewCanvas.css'

interface PreviewCanvasProps {
  baseToken: DesignToken
  userToken: DesignToken
}

interface ComponentStyle {
  borderRadius: string
  boxShadow: string
  backgroundColor: string
  transition: string
}

function buildStyle(token: DesignToken): ComponentStyle {
  return {
    borderRadius: `${token.borderRadius}px`,
    boxShadow: `${token.shadowOffsetX}px ${token.shadowOffsetY}px 8px rgba(0, 0, 0, 0.12)`,
    backgroundColor: token.backgroundColor,
    transition: `all 0.3s ease-out`
  }
}

function ButtonComponent({ style, labelColor }: { style: ComponentStyle; labelColor?: string }) {
  return (
    <button
      className="preview-btn"
      style={{
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        backgroundColor: labelColor ?? '#1976D2',
        transition: style.transition
      }}
    >
      按钮
    </button>
  )
}

function CardComponent({ style }: { style: ComponentStyle }) {
  return (
    <div
      className="preview-card"
      style={{
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
        transition: style.transition
      }}
    >
      <div className="card-title">卡片标题</div>
      <div className="card-desc">这是一段卡片描述文字，用于展示卡片组件的效果。</div>
    </div>
  )
}

function InputComponent({ style }: { style: ComponentStyle }) {
  return (
    <div
      className="preview-input-wrap"
      style={{
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
        transition: style.transition
      }}
    >
      <input
        className="preview-input"
        type="text"
        placeholder="请输入内容"
      />
    </div>
  )
}

function SwitchComponent({ style }: { style: ComponentStyle }) {
  return (
    <div
      className="preview-switch-wrap"
      style={{
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
        transition: style.transition
      }}
    >
      <span className="switch-label">开关选项</span>
      <div className="switch-track">
        <div className="switch-thumb" />
      </div>
    </div>
  )
}

function ComponentColumn({
  title,
  subtitle,
  token,
  isBase
}: {
  title: string
  subtitle: string
  token: DesignToken
  isBase: boolean
}) {
  const style = buildStyle(token)
  const btnColor = isBase ? '#9E9E9E' : undefined

  return (
    <div className="column">
      <div className="column-header">
        <div className="column-title">{title}</div>
        <div className="column-subtitle">{subtitle}</div>
      </div>
      <div className="component-list">
        <div className="component-wrap">
          <ButtonComponent style={style} labelColor={btnColor} />
        </div>
        <div className="component-wrap">
          <CardComponent style={style} />
        </div>
        <div className="component-wrap">
          <InputComponent style={style} />
        </div>
        <div className="component-wrap">
          <SwitchComponent style={style} />
        </div>
      </div>
    </div>
  )
}

export default function PreviewCanvas({ baseToken, userToken }: PreviewCanvasProps) {
  return (
    <div className="preview-canvas">
      <ComponentColumn
        title="调整前"
        subtitle="灰色主题 #E0E0E0"
        token={baseToken}
        isBase={true}
      />
      <div className="divider" />
      <ComponentColumn
        title="调整后"
        subtitle="用户自定义主题"
        token={userToken}
        isBase={false}
      />
    </div>
  )
}
