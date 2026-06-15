import React, { useState, useCallback } from 'react'
import BubbleCanvas from './components/BubbleCanvas'
import { analyzeTextToSegments, type EmotionResult } from './utils/emotionAnalysis'

const App: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [emotionResults, setEmotionResults] = useState<EmotionResult[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [quote, setQuote] = useState('')
  const [showQuote, setShowQuote] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleGenerate = useCallback(() => {
    if (!inputText.trim()) return
    setIsAnimating(true)
    const results = analyzeTextToSegments(inputText)
    setEmotionResults(results)
    setHasGenerated(true)
    setTimeout(() => setIsAnimating(false), 800)
  }, [inputText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }, [handleGenerate])

  const handleQuoteShow = useCallback((q: string) => {
    setQuote(q)
    setShowQuote(true)
    setTimeout(() => setShowQuote(false), 3500)
  }, [])

  const handleReset = useCallback(() => {
    setEmotionResults([])
    setHasGenerated(false)
    setInputText('')
    setShowQuote(false)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {emotionResults.length > 0 && (
        <BubbleCanvas bubbles={emotionResults} onQuoteShow={handleQuoteShow} />
      )}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: emotionResults.length > 0 ? 2 : 10,
          pointerEvents: emotionResults.length > 0 ? 'none' : 'auto',
          transition: 'z-index 0.5s ease',
        }}
      >
        <div
          className="glass animate-fade-in-up"
          style={{
            width: '90%',
            maxWidth: 520,
            padding: '40px 36px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #F5A623, #5EC4A0, #8B7EC8)',
              borderRadius: '20px 20px 0 0',
            }}
          />

          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6a7b8e, #8B7EC8, #5EC4A0, #F5A623)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 8,
              letterSpacing: '2px',
            }}
          >
            🫧 气泡密语
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#8a96a8',
              marginBottom: 28,
              lineHeight: 1.6,
            }}
          >
            写下此刻的心情，让文字化为飘浮的气泡
          </p>

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在这里写下你的心情…"
            style={{
              width: '100%',
              height: 120,
              padding: '14px 18px',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
              color: '#3a4a5c',
              fontSize: 15,
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(139, 126, 200, 0.4)'
              e.target.style.boxShadow = '0 0 0 3px rgba(139, 126, 200, 0.1)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.4)'
              e.target.style.boxShadow = 'none'
            }}
          />

          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={handleGenerate}
              disabled={!inputText.trim() || isAnimating}
              style={{
                padding: '12px 36px',
                border: 'none',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #8B7EC8, #6C5FB5)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                opacity: inputText.trim() ? 1 : 0.5,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(139, 126, 200, 0.3)',
                letterSpacing: '1px',
              }}
              onMouseEnter={e => {
                if (inputText.trim()) {
                  (e.target as HTMLElement).style.transform = 'translateY(-2px)'
                  (e.target as HTMLElement).style.boxShadow = '0 6px 24px rgba(139, 126, 200, 0.4)'
                }
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.transform = 'translateY(0)'
                (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(139, 126, 200, 0.3)'
              }}
            >
              {isAnimating ? '生成中…' : '✨ 生成气泡'}
            </button>
          </div>

          <p
            style={{
              fontSize: 12,
              color: '#a0aab8',
              marginTop: 16,
            }}
          >
            按 Enter 快速生成 · 气泡可点击互动
          </p>
        </div>
      </div>

      {hasGenerated && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            animation: 'fadeIn 0.6s ease-out forwards',
          }}
        >
          <div
            className="glass"
            style={{
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: '#6a7b8e',
                whiteSpace: 'nowrap',
              }}
            >
              🫧 悬停查看 · 点击爆散
            </span>
            <button
              onClick={handleReset}
              style={{
                padding: '6px 16px',
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.3)',
                color: '#6a7b8e',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.5)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.3)'
              }}
            >
              重新输入
            </button>
          </div>
        </div>
      )}

      {showQuote && (
        <div
          style={{
            position: 'fixed',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            animation: 'floatUp 3.5s ease-out forwards',
            maxWidth: '90%',
          }}
        >
          <div
            className="glass-strong"
            style={{
              padding: '16px 28px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 16,
                color: '#4a5a6c',
                lineHeight: 1.8,
                fontWeight: 500,
              }}
            >
              {quote}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
