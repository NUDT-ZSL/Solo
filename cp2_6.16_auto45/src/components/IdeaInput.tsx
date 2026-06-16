import React, { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface IdeaInputProps {
  onSubmit: (content: string) => Promise<void>
}

const IdeaInput: React.FC<IdeaInputProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '120px'
    }
  }, [])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '120px'
      }
      textareaRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>💡</span>
        <span style={styles.headerTitle}>灵感捕捉</span>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="记录你的灵感碎片..."
        style={{
          ...styles.textarea,
          border: isFocused ? '2px solid #6c63ff' : '2px solid #4a4a5e',
        }}
      />
      <div style={styles.buttonRow}>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          style={{
            ...styles.submitBtn,
            opacity: !content.trim() || isSubmitting ? 0.5 : 1,
            cursor: !content.trim() || isSubmitting ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (content.trim() && !isSubmitting) {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 16px #6c63ff66'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <Send size={16} style={{ marginRight: 6 }} />
          提交
        </button>
        <span style={styles.hint}>Ctrl+Enter</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 380,
    background: '#1e1e2e',
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flexShrink: 0,
    height: 'fit-content',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e0e0e0',
    letterSpacing: 1,
  },
  textarea: {
    width: '100%',
    height: 120,
    minHeight: 120,
    background: '#2a2a3e',
    border: '2px solid #4a4a5e',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 1.6,
    padding: 14,
    resize: 'none',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  submitBtn: {
    width: 100,
    height: 40,
    borderRadius: 20,
    background: '#6c63ff',
    color: '#ffffff',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
  },
  hint: {
    color: '#6a6a8e',
    fontSize: 12,
  },
}

export default IdeaInput
