import { useState, useEffect } from 'react'
import type { Stats } from '../types'
import { getStats } from '../api'

const cards = [
  { key: 'totalBooks', label: '总图书数', color: '#1e40af', icon: 'books' },
  { key: 'totalReviews', label: '总书评数', color: '#7c3aed', icon: 'reviews' },
  { key: 'availableBooks', label: '当前在馆', color: '#16a34a', icon: 'check' },
  { key: 'borrowedBooks', label: '当前借出', color: '#dc2626', icon: 'borrow' },
] as const

function CardIcon({ type, color }: { type: string; color: string }) {
  if (type === 'books') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill={color}>
        <path d="M4 5h6a3 3 0 013 3v12a2 2 0 00-2-2H4V5zM20 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7V5z" />
      </svg>
    )
  }
  if (type === 'reviews') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    )
  }
  if (type === 'check') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill={color}>
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    )
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={color}>
      <path d="M19 7h-4v10h4V7zm-9 0H6v10h4V7zM14 2h-4v20h4V2zM2 6h3v12H2V6zm17 0h3v12h-3V6z" />
    </svg>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getStats().then((data) => {
      setStats(data)
      setTimeout(() => setLoaded(true), 50)
    })
  }, [])

  return (
    <div
      style={{
        backgroundColor: '#f5f5f4',
        padding: '32px',
        borderRadius: '20px',
        minHeight: 'calc(100vh - 150px)',
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#78350f', marginBottom: '24px' }}>
        数据仪表板
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          maxWidth: '520px',
        }}
        className="stats-grid"
      >
        {cards.map((card, i) => (
          <div
            key={card.key}
            style={{
              width: '220px',
              height: '120px',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity 0.5s ease-out ${i * 0.1}s, transform 0.5s ease-out ${i * 0.1}s`,
            }}
          >
            <CardIcon type={card.icon} color={card.color} />
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: card.color }}>
              {stats ? stats[card.key] : '-'}
            </div>
            <div style={{ fontSize: '13px', color: '#78716c' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}
