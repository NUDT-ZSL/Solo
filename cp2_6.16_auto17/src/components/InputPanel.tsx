import { useState, useRef, useEffect } from 'react'
import { Theme } from '../types'
import { createRipple } from '../utils/ripple'

interface InputPanelProps {
  theme: Theme
  isCollapsed: boolean
  onSubmit: (text: string) => void
  onExpand: () => void
}

export function InputPanel({ theme, isCollapsed, onSubmit, onExpand }: InputPanelProps) {
  const [text, setText] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const themeColors = theme === 'dark'
    ? { primary: '#18181b', secondary: '#3f3f46', accent: '#a78bfa', text: '#ffffff' }
    : { primary: '#fef3c7', secondary: '#fde68a', accent: '#f97316', text: '#18181b' }

  useEffect(() => {
    if (!isCollapsed && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isCollapsed])

  const handleSubmit = (e: React.MouseEvent) => {
    createRipple(e, themeColors.accent + '40')
    if (text.trim().length >= 10 && text.trim().length <= 50) {
      setIsAnimating(true)
      setTimeout(() => {
        onSubmit(text.trim())
        setIsAnimating(false)
      }, 500)
    }
  }

  const handleExpand = (e: React.MouseEvent) => {
    createRipple(e, themeColors.accent + '40')
    onExpand()
  }

  const handleTextareaClick = (e: React.MouseEvent<Element>) => {
    createRipple(e, themeColors.accent + '40')
  }

  const isValid = text.trim().length >= 10 && text.trim().length <= 50

  if (isCollapsed) {
    return (
      <div
        onClick={handleExpand}
        style={{
          position: 'fixed',
          left: '24px',
          bottom: '24px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: `rgba(255, 255, 255, 0.15)`,
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.5s ease-in-out',
          zIndex: 100
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={themeColors.text}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: '24px',
        bottom: '24px',
        width: '360px',
        height: isAnimating ? '44px' : '220px',
        borderRadius: isAnimating ? '50%' : '20px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: isAnimating ? '0' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.5s ease-in-out',
        overflow: 'hidden',
        zIndex: 100,
        opacity: isAnimating ? 0 : 1,
        transform: isAnimating ? 'scale(0.2)' : 'scale(1)',
        transformOrigin: 'bottom left'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            color: themeColors.text,
            fontSize: '14px',
            fontWeight: 500,
            opacity: 0.9
          }}
        >
          描述你的冥想意图
        </label>
        <span
          style={{
            color: themeColors.text,
            fontSize: '12px',
            opacity: 0.6
          }}
        >
          例如：我想放松身心，感受海边的宁静
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onClick={handleTextareaClick}
        placeholder="输入10-50字的冥想意图..."
        maxLength={50}
        style={{
          flex: 1,
          background: 'rgba(0, 0, 0, 0.2)',
          border: `1px solid ${isValid ? themeColors.accent : 'rgba(255, 255, 255, 0.2)'}`,
          borderRadius: '12px',
          padding: '12px',
          color: themeColors.text,
          fontSize: '14px',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.3s ease',
          cursor: 'text'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            color: isValid ? themeColors.accent : themeColors.text,
            fontSize: '12px',
            opacity: isValid ? 1 : 0.6
          }}
        >
          {text.length}/50 字
        </span>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          style={{
            padding: '10px 24px',
            background: isValid ? themeColors.accent : 'rgba(255, 255, 255, 0.1)',
            color: isValid ? '#ffffff' : themeColors.text,
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isValid ? 'pointer' : 'not-allowed',
            opacity: isValid ? 1 : 0.5,
            transition: 'all 0.3s ease'
          }}
        >
          开始冥想
        </button>
      </div>
    </div>
  )
}
