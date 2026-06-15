import { useState, useEffect, useRef } from 'react'
import type { Work } from './data'

interface WorkCardProps {
  works: Work[]
}

export default function WorkCard({ works }: WorkCardProps) {
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set())
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set())
  const prevWorksRef = useRef<Work[]>([])

  useEffect(() => {
    const ids = works.map((w) => w.id)
    if (prevWorksRef.current.map((w) => w.id).join(',') !== ids.join(',')) {
      setVisibleCards(new Set())
      prevWorksRef.current = works
    }
  }, [works])

  useEffect(() => {
    if (visibleCards.size >= works.length) return
    const timer = setInterval(() => {
      setVisibleCards((prev) => {
        const next = new Set(prev)
        const notYetVisible = works.filter((w) => !next.has(w.id))
        if (notYetVisible.length === 0) {
          clearInterval(timer)
          return prev
        }
        next.add(notYetVisible[0].id)
        return next
      })
    }, 100)
    return () => clearInterval(timer)
  }, [works, visibleCards.size])

  const handleFlip = (id: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (works.length === 0) {
    return (
      <div className="work-grid__empty">
        <div className="work-grid__empty-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="28" r="12" stroke="#8B4513" strokeWidth="2" />
            <path d="M20 52c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="20" x2="32" y2="36" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="28" x2="40" y2="28" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="work-grid__empty-text">暂无相关作品</p>
      </div>
    )
  }

  return (
    <div className="work-grid">
      {works.map((work) => {
        const isFlipped = flippedIds.has(work.id)
        const isVisible = visibleCards.has(work.id)
        return (
          <div
            key={work.id}
            className={`work-card ${isFlipped ? 'work-card--flipped' : ''} ${isVisible ? 'work-card--visible' : ''}`}
            onClick={() => handleFlip(work.id)}
          >
            <div className="work-card__inner">
              <div className="work-card__front">
                <div className="work-card__thumb" />
                <div className="work-card__info">
                  <h3 className="work-card__title">{work.title}</h3>
                  <div className="work-card__tags">
                    {work.tags.map((tag) => (
                      <span key={tag} className="work-card__tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="work-card__back">
                <h3 className="work-card__back-title">{work.title}</h3>
                <p className="work-card__desc">{work.description}</p>
                <div className="work-card__details">
                  <div className="work-card__detail">
                    <span className="work-card__detail-label">尺寸</span>
                    <span className="work-card__detail-value">{work.dimensions}</span>
                  </div>
                  <div className="work-card__detail">
                    <span className="work-card__detail-label">材质</span>
                    <span className="work-card__detail-value">{work.material}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
