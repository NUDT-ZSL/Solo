import React, { useState } from 'react'

interface RecordFormProps {
  onSubmit: (text: string) => Promise<void>
  onExport: () => void
}

const RecordForm: React.FC<RecordFormProps> = ({ onSubmit, onExport }) => {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入内容')
      return
    }
    if (text.length > 500) {
      setError('内容不能超过500字')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit(text.trim())
      setText('')
    } catch (err) {
      setError('提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit()
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.icon}>✨</span>
        <h1 style={styles.title}>回忆星图</h1>
      </div>

      <div style={styles.formGroup}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="写下此刻的心情、见闻或回忆..."
          maxLength={500}
          style={{
            ...styles.textarea,
            ...(error ? styles.textareaError : {})
          }}
        />
        <div style={styles.charCount}>{text.length}/500</div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          ...styles.button,
          ...styles.primaryButton,
          ...(loading ? styles.buttonDisabled : {})
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        onMouseDown={(e) => {
          if (!loading) e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => {
          if (!loading) e.currentTarget.style.transform = 'scale(1.05)'
        }}
      >
        {loading ? '记录中...' : '✦ 记录'}
      </button>

      <button
        onClick={onExport}
        style={{
          ...styles.button,
          ...styles.secondaryButton
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
      >
        ⬇ 导出星图
      </button>

      <div style={styles.hint}>
        <p style={styles.hintText}>💡 拖拽画布 · 滚轮缩放 · 点击星星查看详情</p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: 240,
    height: '100vh',
    padding: '24px 20px',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    zIndex: 100,
    overflowY: 'auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  icon: {
    fontSize: 28,
    filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.6))'
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: 1
  },
  formGroup: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    padding: '12px 14px',
    paddingBottom: 28,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    lineHeight: 1.6,
    resize: 'vertical',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  textareaError: {
    borderColor: 'rgba(255,100,100,0.6)'
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)'
  },
  error: {
    fontSize: 12,
    color: '#ff6b6b',
    padding: '6px 10px',
    background: 'rgba(255,100,100,0.1)',
    borderRadius: 6
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    letterSpacing: 0.5
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #FF8C00 0%, #FF4500 100%)',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(255,69,0,0.3)'
  },
  secondaryButton: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  hint: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  hintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 1.6,
    textAlign: 'center'
  }
}

export default RecordForm
