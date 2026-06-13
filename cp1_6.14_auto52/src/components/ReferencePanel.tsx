import { useMemo, useState } from 'react'
import { SHADE_LABELS } from '../utils/colorUtils'
import './ReferencePanel.css'

interface ReferencePanelProps {
  primary: string[]
  secondary: string[]
  neutral: string[]
  success: string[]
  warning: string[]
  error: string[]
}

interface VariableItem {
  name: string
  value: string
}

export function ReferencePanel({
  primary,
  secondary,
  neutral,
  success,
  warning,
  error,
}: ReferencePanelProps) {
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  const variables = useMemo<VariableItem[]>(() => {
    const vars: VariableItem[] = []
    const addVars = (prefix: string, shades: string[]) => {
      SHADE_LABELS.forEach((label, i) => {
        vars.push({
          name: `--color-${prefix}-${label}`,
          value: shades[i],
        })
      })
    }
    addVars('primary', primary)
    addVars('secondary', secondary)
    addVars('neutral', neutral)
    addVars('success', success)
    addVars('warning', warning)
    addVars('error', error)
    return vars
  }, [primary, secondary, neutral, success, warning, error])

  const handleCopy = (name: string, value: string) => {
    navigator.clipboard.writeText(name).catch(() => {})
    setCopiedVar(name)
    setTimeout(() => setCopiedVar(null), 1000)
  }

  return (
    <div className="reference-panel">
      <div className="reference-panel-header">
        <span className="reference-panel-title">CSS 变量</span>
        <span className="reference-panel-hint">点击复制</span>
      </div>
      <div className="reference-panel-grid">
        {variables.slice(0, 12).map(v => (
          <div
            key={v.name}
            className={`reference-var-item ${copiedVar === v.name ? 'copied' : ''}`}
            onClick={() => handleCopy(v.name, v.value)}
            title={`${v.name}: ${v.value}`}
          >
            <div
              className="reference-var-swatch"
              style={{ backgroundColor: v.value }}
            />
            <span className="reference-var-name">{v.name}</span>
          </div>
        ))}
      </div>
      <div className="reference-panel-more">
        共 {variables.length} 个变量 · 点击导出查看全部
      </div>
    </div>
  )
}
