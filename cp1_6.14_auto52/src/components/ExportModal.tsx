import { useState, useMemo, useEffect } from 'react'
import { formatCSSVariables, formatTailwindConfig } from '../utils/colorUtils'
import './ExportModal.css'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  primary: string[]
  secondary: string[]
  neutral: string[]
  success: string[]
  warning: string[]
  error: string[]
}

type TabType = 'css' | 'tailwind'

export function ExportModal({
  isOpen,
  onClose,
  primary,
  secondary,
  neutral,
  success,
  warning,
  error,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('css')
  const [copied, setCopied] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const cssContent = useMemo(
    () => formatCSSVariables(primary, secondary, neutral, success, warning, error),
    [primary, secondary, neutral, success, warning, error]
  )

  const tailwindContent = useMemo(
    () => formatTailwindConfig(primary, secondary, neutral, success, warning, error),
    [primary, secondary, neutral, success, warning, error]
  )

  const content = activeTab === 'css' ? cssContent : tailwindContent

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }).catch(() => {})
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isVisible && !isOpen) return null

  return (
    <div
      className={`export-modal-overlay ${isOpen ? 'visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`export-modal ${isOpen ? 'entering' : 'leaving'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="export-modal-header">
          <h3 className="export-modal-title">导出配置</h3>
          <button className="export-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="export-modal-tabs">
          <button
            className={`export-tab ${activeTab === 'css' ? 'active' : ''}`}
            onClick={() => setActiveTab('css')}
          >
            CSS 变量
          </button>
          <button
            className={`export-tab ${activeTab === 'tailwind' ? 'active' : ''}`}
            onClick={() => setActiveTab('tailwind')}
          >
            Tailwind 配置
          </button>
        </div>

        <div className="export-modal-content">
          <div
            className={`export-code-pane ${activeTab === 'css' ? 'active' : ''}`}
          >
            <pre className="export-code">{cssContent}</pre>
          </div>
          <div
            className={`export-code-pane ${activeTab === 'tailwind' ? 'active' : ''}`}
          >
            <pre className="export-code">{tailwindContent}</pre>
          </div>
        </div>

        <button
          className={`export-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ 已复制' : '复制代码'}
        </button>
      </div>
    </div>
  )
}
