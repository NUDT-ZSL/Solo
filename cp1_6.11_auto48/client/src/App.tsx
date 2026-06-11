import { useState, useEffect, useRef, useCallback } from 'react'
import AdaptiveCard from './components/AdaptiveCard'
import './App.css'

interface CardBehavior {
  id: string
  clicks: number
  hoverSeconds: number
}

interface CardLayout {
  id: string
  score: number
  gridWeight: number
  backgroundColor: string
  textColor: string
  glowColor: string
  scoreLevel: 'high' | 'medium' | 'low'
}

const DEFAULT_CARDS = [
  { id: 'card-1', title: '产品概览', description: '探索我们最新的产品系列和创新解决方案', icon: '📊' },
  { id: 'card-2', title: '用户案例', description: '了解客户如何使用我们的平台创造价值', icon: '💡' },
  { id: 'card-3', title: '技术文档', description: '深入了解产品架构和开发最佳实践', icon: '📚' },
  { id: 'card-4', title: '社区动态', description: '加入我们活跃的开发者社区与论坛', icon: '🌟' },
]

function App() {
  const [layouts, setLayouts] = useState<CardLayout[]>(
    DEFAULT_CARDS.map((card) => ({
      id: card.id,
      score: 0,
      gridWeight: 1,
      backgroundColor: '#add8e6',
      textColor: '#333333',
      glowColor: 'rgba(173, 216, 230, 0.6)',
      scoreLevel: 'medium' as const,
    }))
  )

  const behaviorRef = useRef<Record<string, { clicks: number; hoverStart: number | null; totalHover: number }>>(
    DEFAULT_CARDS.reduce((acc, card) => {
      acc[card.id] = { clicks: 0, hoverStart: null, totalHover: 0 }
      return acc
    }, {} as Record<string, { clicks: number; hoverStart: number | null; totalHover: number }>)
  )

  const scrollDepthRef = useRef(0)
  const [clickAnimations, setClickAnimations] = useState<{ id: string; key: number }[]>([])
  const animationKeyRef = useRef(0)
  const [pulseCards, setPulseCards] = useState<Set<string>>(new Set())

  const handleCardClick = useCallback((cardId: string) => {
    if (behaviorRef.current[cardId]) {
      behaviorRef.current[cardId].clicks += 1
    }
    const key = animationKeyRef.current++
    setClickAnimations((prev) => [...prev, { id: cardId, key }])
    setTimeout(() => {
      setClickAnimations((prev) => prev.filter((a) => a.key !== key))
    }, 1500)
  }, [])

  const handleCardHoverStart = useCallback((cardId: string) => {
    if (behaviorRef.current[cardId] && behaviorRef.current[cardId].hoverStart === null) {
      behaviorRef.current[cardId].hoverStart = Date.now()
    }
  }, [])

  const handleCardHoverEnd = useCallback((cardId: string) => {
    const card = behaviorRef.current[cardId]
    if (card && card.hoverStart !== null) {
      card.totalHover += (Date.now() - card.hoverStart) / 1000
      card.hoverStart = null
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      scrollDepthRef.current = scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const sendBehaviorData = async () => {
      const cards: CardBehavior[] = DEFAULT_CARDS.map((card) => {
        const b = behaviorRef.current[card.id]
        let hoverSeconds = b.totalHover
        if (b.hoverStart !== null) {
          hoverSeconds += (Date.now() - b.hoverStart) / 1000
        }
        return {
          id: card.id,
          clicks: b.clicks,
          hoverSeconds: Math.round(hoverSeconds * 10) / 10,
        }
      })

      try {
        const response = await fetch('/api/behavior', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cards,
            scrollDepth: Math.round(scrollDepthRef.current * 10) / 10,
            sessionId: 'demo-session',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const newLayouts = data.cards as CardLayout[]

          const changedCards = new Set<string>()
          newLayouts.forEach((newLayout, index) => {
            const oldLayout = layouts[index]
            if (!oldLayout || Math.abs(newLayout.score - oldLayout.score) > 0.1) {
              changedCards.add(newLayout.id)
            }
          })

          if (changedCards.size > 0) {
            setPulseCards(changedCards)
            setTimeout(() => setPulseCards(new Set()), 500)
          }

          setLayouts(newLayouts)
        }
      } catch (error) {
        console.error('Failed to send behavior data:', error)
      }
    }

    const interval = setInterval(sendBehaviorData, 5000)
    return () => clearInterval(interval)
  }, [layouts])

  const getScoreDotColor = (scoreLevel: 'high' | 'medium' | 'low') => {
    switch (scoreLevel) {
      case 'high':
        return '#4caf50'
      case 'medium':
        return '#ffc107'
      case 'low':
        return '#f44336'
    }
  }

  const gridTemplateColumns = layouts.map((l) => `${l.gridWeight}fr`).join(' ')

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>流动界面</h1>
        <p className="subtitle">自适应体验原型 · 基于用户行为动态调整</p>
      </header>

      <main className="card-grid" style={{ gridTemplateColumns }}>
        {DEFAULT_CARDS.map((card, index) => {
          const layout = layouts[index] || layouts[0]
          const hasClickAnimation = clickAnimations.filter((a) => a.id === card.id)
          const isPulsing = pulseCards.has(card.id)

          return (
            <AdaptiveCard
              key={card.id}
              id={card.id}
              title={card.title}
              description={card.description}
              icon={card.icon}
              layout={layout}
              onClick={() => handleCardClick(card.id)}
              onHoverStart={() => handleCardHoverStart(card.id)}
              onHoverEnd={() => handleCardHoverEnd(card.id)}
              isPulsing={isPulsing}
              clickAnimations={hasClickAnimation}
              gridArea={card.id.replace('card-', 'card')}
            />
          )
        })}
      </main>

      <footer className="dashboard">
        <span className="dashboard-label">参与度矩阵</span>
        <div className="score-dots">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              className="score-dot"
              style={{ backgroundColor: getScoreDotColor(layout.scoreLevel) }}
              title={`${layout.score.toFixed(1)} 分`}
            />
          ))}
        </div>
      </footer>
    </div>
  )
}

export default App
