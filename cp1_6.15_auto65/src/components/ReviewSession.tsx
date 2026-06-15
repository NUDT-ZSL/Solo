import { useState, useEffect, useMemo } from 'react'
import { Card, ReviewFeedback, calculateAccuracy } from '../utils/cards'

interface ReviewSessionProps {
  cards: Card[]
  onComplete: (results: { cardId: string; feedback: ReviewFeedback }[]) => void
  onBack: () => void
}

interface ReviewResult {
  cardId: string
  feedback: ReviewFeedback
}

export default function ReviewSession({ cards, onComplete, onBack }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<ReviewResult[]>([])
  const [startTime] = useState(Date.now())
  const [sessionComplete, setSessionComplete] = useState(false)
  const [animatedProgress, setAnimatedProgress] = useState(0)

  const currentCard = cards[currentIndex]

  const stats = useMemo(() => {
    const correct = results.filter(r => r.feedback === 'remembered').length
    const endTime = sessionComplete ? Date.now() : startTime
    return {
      total: results.length,
      correct,
      startTime,
      endTime
    }
  }, [results, sessionComplete, startTime])

  const accuracy = calculateAccuracy(stats)
  const duration = Math.round((stats.endTime - stats.startTime) / 1000)

  useEffect(() => {
    if (sessionComplete) {
      let current = 0
      const target = accuracy
      const duration = 600
      const steps = 30
      const increment = target / steps
      const interval = duration / steps
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          current = target
          clearInterval(timer)
        }
        setAnimatedProgress(Math.round(current))
      }, interval)
      return () => clearInterval(timer)
    }
  }, [sessionComplete, accuracy])

  const handleFeedback = (feedback: ReviewFeedback) => {
    if (!currentCard) return
    const newResults = [...results, { cardId: currentCard.id, feedback }]
    setResults(newResults)
    setShowAnswer(false)

    if (currentIndex + 1 >= cards.length) {
      setSessionComplete(true)
      onComplete(newResults)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleFinish = () => {
    if (results.length > 0 && !sessionComplete) {
      setSessionComplete(true)
      onComplete(results)
    }
  }

  const renderCircularProgress = (progress: number) => {
    const size = 140
    const strokeWidth = 12
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (progress / 100) * circumference

    let color = '#FF4757'
    if (progress >= 80) color = '#2ED573'
    else if (progress >= 60) color = '#FFA502'

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E0E0E0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="32"
        fontWeight="bold"
        fill={color}
      >
        {progress}%
      </text>
    </svg>
    )
  }

  if (cards.length === 0) {
    return (
      <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }}>
        <div style={{
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: 48,
        textAlign: 'center'
      }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>太棒了！</h2>
          <p style={{ color: '#636E72', marginBottom: 24 }}>当前没有待复习的卡片，去创建一些新卡片吧！</p>
          <button className="btn btn-flip" onClick={onBack}>返回卡片管理</button>
        </div>
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }}>
        <div style={{
        width: 600,
        maxWidth: '100%',
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: 40,
        textAlign: 'center'
      }}>
          <h2 style={{ fontSize: 22, marginBottom: 24, color: '#2D3436' }}>本轮复习完成</h2>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            {renderCircularProgress(animatedProgress)}
          </div>

          <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          marginBottom: 32
        }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#5352ED' }} className="count-animate">
                {stats.total}
              </div>
              <div style={{ fontSize: 13, color: '#636E72' }}>复习卡片数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2ED573' }} className="count-animate">
                {stats.correct}
              </div>
              <div style={{ fontSize: 13, color: '#636E72' }}>正确数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#FFA502' }} className="count-animate">
                {duration >= 60 ? `${Math.floor(duration / 60)}分${duration % 60}秒` : `${duration}秒`}
              </div>
              <div style={{ fontSize: 13, color: '#636E72' }}>用时</div>
            </div>
          </div>

          <button className="btn btn-flip" onClick={onBack} style={{ padding: '10px 32px', fontSize: 15 }}>
            返回卡片管理
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'flex-start',
    alignItems: 'center',
    padding: 40,
    overflowY: 'auto'
  }}>
      <div style={{
      width: 600,
      maxWidth: '100%',
      margin: '0 auto'
    }}>
        <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
      }}>
          <button className="btn btn-secondary" onClick={onBack}>← 返回</button>
          <div style={{ fontSize: 14, color: '#636E72' }}>
            第 <span style={{ fontWeight: 600, color: '#2D3436' }}>{currentIndex + 1}</span> / {cards.length}
          </div>
          <button className="btn btn-secondary" onClick={handleFinish} disabled={results.length === 0}>
            结束复习
          </button>
        </div>

        <div style={{
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: 48,
        textAlign: 'center',
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
          {currentCard.tags.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {currentCard.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 12,
                    padding: '3px 10px',
                    background: '#E8F4FD',
                    color: '#1E90FF',
                    borderRadius: 4
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: 36, fontWeight: 600, marginBottom: 24, color: '#2D3436', lineHeight: 1.4 }}>
            {currentCard.source}
          </div>

          {showAnswer ? (
            <div className="slide-up">
              <div style={{ fontSize: 24, color: '#5352ED', marginBottom: 16 }}>
              {currentCard.target}
            </div>
              {currentCard.example && (
                <div style={{ fontSize: 14, color: '#636E72', fontStyle: 'italic', marginBottom: 24 }}>
                  "{currentCard.example}"
                </div>
              )}
              <div style={{ fontSize: 14, color: '#636E72', marginBottom: 24 }}>
                记忆等级：{'★'.repeat(currentCard.level)}{'☆'.repeat(5 - currentCard.level)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleFeedback('forgotten')}
                  style={{ padding: '12px 24px', fontSize: 15 }}
                >
                  忘记了
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() => handleFeedback('fuzzy')}
                  style={{ padding: '12px 24px', fontSize: 15 }}
                >
                  有点模糊
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => handleFeedback('remembered')}
                  style={{ padding: '12px 24px', fontSize: 15 }}
                >
                  记住了
                </button>
              </div>
            </div>
          ) : (
            <div className="slide-up">
              <div style={{ fontSize: 14, color: '#636E72', marginBottom: 24 }}>
                思考一下，再点击下方按钮查看答案
              </div>
              <button
                className="btn btn-flip slide-up"
                onClick={() => setShowAnswer(true)}
                style={{ padding: '12px 32px', fontSize: 15 }}
              >
                显示答案
              </button>
            </div>
          )}
        </div>

        <div style={{
        height: 8,
        background: '#E0E0E0',
        borderRadius: 4,
        marginTop: 20,
        overflow: 'hidden'
      }}>
          <div style={{
          height: '100%',
          width: `${((currentIndex + (showAnswer ? 1 : 0.5)) / cards.length * 100}%`,
          background: '#5352ED',
          borderRadius: 4,
          transition: 'width 0.3s ease'
        }} />
        </div>
      </div>
    </div>
  )
}
