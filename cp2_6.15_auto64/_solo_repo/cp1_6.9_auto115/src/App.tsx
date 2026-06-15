import React, { useEffect, useRef, useState, useCallback } from 'react'
import StarMap, { MemoryRecord, StarMapHandle } from './StarMap'
import RecordForm from './RecordForm'

interface DetailState {
  record: MemoryRecord
  originX: number
  originY: number
  closing: boolean
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const getSentimentLabel = (score: number): { text: string; color: string } => {
  if (score > 2) return { text: '积极 ✨', color: '#FF8C00' }
  if (score < -2) return { text: '消极 🌙', color: '#8A2BE2' }
  return { text: '中性 💫', color: '#DDA0DD' }
}

const MobilePanel: React.FC<{
  text: string
  setText: (t: string) => void
  onSubmit: () => Promise<void>
  onExport: () => void
  loading: boolean
  error: string | null
}> = ({ text, setText, onSubmit, onExport, loading, error }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 60,
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      zIndex: 100
    }}>
      <span style={{ fontSize: 24, filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.5))' }}>✨</span>
      <h1 style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', marginRight: 8 }}>回忆星图</h1>
      <div style={{ position: 'relative', flex: 1, display: 'flex', gap: 8, minWidth: 0 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
          placeholder="记录此刻..."
          maxLength={500}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 12px',
            borderRadius: 8,
            border: error ? '1px solid rgba(255,100,100,0.6)' : '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 13
          }}
        />
        <button
          onClick={onSubmit}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #FF8C00 0%, #FF4500 100%)',
            color: '#fff',
            transition: 'transform 0.2s ease',
            opacity: loading ? 0.6 : 1,
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.05)' }}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.95)' }}
          onMouseUp={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.05)' }}
        >
          {loading ? '...' : '✦'}
        </button>
        <button
          onClick={onExport}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            transition: 'transform 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        >
          ⬇
        </button>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  const [records, setRecords] = useState<MemoryRecord[]>([])
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileText, setMobileText] = useState('')
  const [mobileLoading, setMobileLoading] = useState(false)
  const [mobileError, setMobileError] = useState<string | null>(null)
  const starMapRef = useRef<StarMapHandle>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 800)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetch('/api/records')
      .then(res => res.json())
      .then((data: MemoryRecord[]) => {
        setRecords(data)
      })
      .catch(err => {
        console.error('加载记录失败:', err)
      })
  }, [])

  const handleSubmit = useCallback(async (text: string) => {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || '提交失败')
    }
    const newRecord = await res.json()
    setRecords(prev => [...prev, newRecord])
  }, [])

  const handleMobileSubmit = useCallback(async () => {
    if (!mobileText.trim()) {
      setMobileError('请输入内容')
      return
    }
    setMobileLoading(true)
    setMobileError(null)
    try {
      await handleSubmit(mobileText.trim())
      setMobileText('')
    } catch (err) {
      setMobileError('提交失败，请重试')
    } finally {
      setMobileLoading(false)
    }
  }, [mobileText, handleSubmit])

  const handleStarClick = useCallback((record: MemoryRecord, _screenX: number, _screenY: number) => {
    setDetail({
      record,
      originX: window.innerWidth / 2,
      originY: window.innerHeight / 2,
      closing: false
    })
  }, [])

  const closeDetail = useCallback(() => {
    setDetail(prev => prev ? { ...prev, closing: true } : prev)
    setTimeout(() => {
      setDetail(null)
    }, 300)
  }, [])

  const handleExport = useCallback(() => {
    if (starMapRef.current) {
      starMapRef.current.exportCanvas()
    }
  }, [])

  const sentiment = detail ? getSentimentLabel(detail.record.sentimentScore) : null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isMobile ? (
        <MobilePanel
          text={mobileText}
          setText={setMobileText}
          onSubmit={handleMobileSubmit}
          onExport={handleExport}
          loading={mobileLoading}
          error={mobileError}
        />
      ) : (
        <RecordForm onSubmit={handleSubmit} onExport={handleExport} />
      )}

      <StarMap
        ref={starMapRef}
        records={records}
        onStarClick={handleStarClick}
      />

      {detail && sentiment && (
        <div
          onClick={closeDetail}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: detail.closing ? 'fadeOut 0.3s ease forwards' : 'fadeIn 0.3s ease'
          }}
        >
          <div
            className={detail.closing ? 'detail-card closing' : 'detail-card'}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? 'calc(100% - 40px)' : 420,
              maxWidth: '90vw',
              maxHeight: '80vh',
              padding: 28,
              borderRadius: 20,
              background: 'rgba(20,25,35,0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, #fff, ${detail.record.color})`,
                  boxShadow: `0 0 20px ${detail.record.color}80`
                }} />
                <div>
                  <div style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 2
                  }}>
                    {formatDate(detail.record.timestamp)}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: `${sentiment.color}30`,
                    color: sentiment.color,
                    border: `1px solid ${sentiment.color}50`
                  }}>
                    {sentiment.text}
                  </div>
                </div>
              </div>
              <button
                onClick={closeDetail}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,100,100,0.2)'
                  e.currentTarget.style.color = '#ff8080'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: 20,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 20,
              maxHeight: 300,
              overflowY: 'auto'
            }}>
              <p style={{
                fontSize: 15,
                lineHeight: 1.8,
                color: 'rgba(255,255,255,0.9)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {detail.record.text}
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: 16,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 4,
                  letterSpacing: 0.5
                }}>情感得分</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: detail.record.sentimentScore >= 0
                    ? (detail.record.sentimentScore === 0 ? '#DDA0DD' : '#FF8C00')
                    : '#8A2BE2'
                }}>
                  {detail.record.sentimentScore > 0 ? '+' : ''}{detail.record.sentimentScore}
                </div>
              </div>
              <div style={{
                width: 1,
                background: 'rgba(255,255,255,0.08)'
              }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 4,
                  letterSpacing: 0.5
                }}>文字字数</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)'
                }}>
                  {detail.record.text.length}
                </div>
              </div>
              <div style={{
                width: 1,
                background: 'rgba(255,255,255,0.08)'
              }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 4,
                  letterSpacing: 0.5
                }}>星光亮度</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)'
                }}>
                  {Math.round(detail.record.brightness * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
