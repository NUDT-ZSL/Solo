import { useState, useCallback } from 'react'
import MusicVisualizer from './MusicVisualizer'

type StyleType = 'dreamy' | 'tense' | 'healing' | 'epic'

interface VisualParams {
  particles: {
    count: number
    colors: string[]
    sizes: number[]
    speeds: number[]
  }
  keywords: Array<{
    word: string
    color: string
    position: { x: number; y: number }
    emotionWeight: number
  }>
  emotionPolarity: number
  bpm: number
  chordProgression: string[][]
  style: StyleType
}

const styles: { id: StyleType; label: string; color: string }[] = [
  { id: 'dreamy', label: '梦幻', color: '#FFB6C1' },
  { id: 'tense', label: '紧张', color: '#FF4500' },
  { id: 'healing', label: '治愈', color: '#98FB98' },
  { id: 'epic', label: '史诗', color: '#DAA520' },
]

export default function App() {
  const [text, setText] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('healing')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visualParams, setVisualParams] = useState<VisualParams | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (text.trim().length < 50) {
      setError('请输入至少50字的文字描述')
      return
    }
    if (text.trim().length > 300) {
      setError('文字描述不能超过300字')
      return
    }

    setIsLoading(true)
    setError(null)
    setVisualParams(null)
    setIsPlaying(false)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style: selectedStyle }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('生成失败，请重试')
      }

      const data = await response.json()
      setVisualParams(data.visualParams)
      setIsPlaying(true)
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('请求超时，请检查网络后重试')
      } else {
        setError((err as Error).message || '生成失败，请重试')
      }
    } finally {
      setIsLoading(false)
      clearTimeout(timeoutId)
    }
  }, [text, selectedStyle])

  const handleRetry = useCallback(() => {
    setError(null)
    handleGenerate()
  }, [handleGenerate])

  return (
    <div style={stylesContainer}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>余音织梦</h1>
        <p style={subtitleStyle}>AI音乐可视化短片生成器</p>
      </header>

      <main style={mainStyle}>
        <div style={inputSectionStyle}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入50-300字的文字描述，让AI将文字情感编织成流动的音乐可视化梦境..."
            style={{
              ...textareaStyle,
              borderColor: error ? '#FF4444' : '#444',
            }}
            maxLength={300}
          />
          <div style={charCountStyle}>
            <span style={{ color: text.length > 300 ? '#FF4444' : '#888' }}>
              {text.length}/300
            </span>
          </div>
        </div>

        <div style={styleSelectorStyle}>
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              style={{
                ...styleButtonStyle,
                backgroundColor: selectedStyle === s.id ? s.color : 'transparent',
                color: selectedStyle === s.id ? '#1A1A2E' : s.color,
                borderColor: s.color,
                boxShadow: selectedStyle === s.id ? `0 0 20px ${s.color}55` : 'none',
              }}
              onMouseEnter={(e) => {
                if (selectedStyle !== s.id) {
                  e.currentTarget.style.transform = 'scale(1.05)'
                }
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
              {s.label}
            </button>
          ))}
        </div>

        <div style={actionButtonsStyle}>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            style={{
              ...generateButtonStyle,
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? '生成中...' : '生成预览'}
          </button>
        </div>

        {error && (
          <div style={errorBannerStyle}>
            <span>{error}</span>
            <button onClick={handleRetry} style={retryButtonStyle}>
              重试
            </button>
          </div>
        )}

        {isLoading && (
          <div style={loadingContainerStyle}>
            <div style={loadingSpinnerStyle}></div>
            <p style={loadingTextStyle}>正在编织你的梦境...</p>
          </div>
        )}

        {!isLoading && visualParams && (
          <div style={visualizerContainerStyle}>
            <MusicVisualizer
              params={visualParams}
              isPlaying={isPlaying}
              onStop={() => setIsPlaying(false)}
            />
          </div>
        )}

        {!isLoading && !visualParams && !error && (
          <div style={placeholderStyle}>
            <p style={placeholderTextStyle}>输入文字，选择风格，开启你的梦境之旅 ✨</p>
          </div>
        )}
      </main>
    </div>
  )
}

const stylesContainer: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0A0A1A 0%, #1A1A2E 100%)',
  padding: '40px 20px',
}

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '40px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '48px',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #7B68EE 0%, #FF69B4 50%, #FFD700 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: '4px',
  marginBottom: '8px',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#888',
  letterSpacing: '2px',
}

const mainStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
}

const inputSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '24px',
  position: 'relative',
}

const textareaStyle: React.CSSProperties = {
  width: '60%',
  minHeight: '120px',
  padding: '16px 20px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid #444',
  borderRadius: '12px',
  color: '#FFFFFF',
  fontSize: '15px',
  lineHeight: '1.6',
  resize: 'vertical',
  outline: 'none',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  transition: 'border-color 0.3s, box-shadow 0.3s',
  fontFamily: 'inherit',
}

const charCountStyle: React.CSSProperties = {
  position: 'absolute',
  right: '21%',
  bottom: '-22px',
  fontSize: '12px',
}

const styleSelectorStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '16px',
  marginTop: '36px',
  flexWrap: 'wrap',
}

const styleButtonStyle: React.CSSProperties = {
  padding: '10px 28px',
  border: '1px solid',
  borderRadius: '999px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.25s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  background: 'transparent',
  letterSpacing: '1px',
}

const actionButtonsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: '28px',
  gap: '16px',
}

const generateButtonStyle: React.CSSProperties = {
  padding: '14px 48px',
  background: 'linear-gradient(135deg, #7B68EE 0%, #9370DB 100%)',
  border: 'none',
  borderRadius: '999px',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(123, 104, 238, 0.4)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  letterSpacing: '2px',
}

const errorBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  maxWidth: '70%',
  margin: '20px auto 0',
  padding: '12px 20px',
  backgroundColor: 'rgba(255, 68, 68, 0.15)',
  border: '1px solid #FF4444',
  borderRadius: '8px',
  color: '#FF4444',
  fontSize: '14px',
}

const retryButtonStyle: React.CSSProperties = {
  padding: '6px 16px',
  backgroundColor: '#FF4444',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
  fontWeight: 500,
}

const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 0',
}

const loadingSpinnerStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  border: '3px solid rgba(123, 104, 238, 0.2)',
  borderTopColor: '#7B68EE',
  animation: 'spin 1s linear infinite',
}

const loadingTextStyle: React.CSSProperties = {
  marginTop: '16px',
  color: '#888',
  fontSize: '14px',
}

const visualizerContainerStyle: React.CSSProperties = {
  marginTop: '30px',
  padding: '30px',
}

const placeholderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '300px',
  marginTop: '40px',
}

const placeholderTextStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '16px',
  letterSpacing: '1px',
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    textarea { width: 90% !important; }
    .style-selector { flex-direction: column; align-items: center; }
    .style-selector button { width: 200px; }
    canvas { height: 400px !important; }
  }
`
document.head.appendChild(styleSheet)
