import type { Book } from '../types'
import StarRating from './StarRating'

interface BookCardProps {
  book: Book
  averageRating: number
  onClick: () => void
}

export default function BookCard({ book, averageRating, onClick }: BookCardProps) {
  const statusColor = book.status === '在馆' ? '#10b981' : '#ef4444'

  return (
    <div
      onClick={onClick}
      style={{
        width: '240px',
        height: '320px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <div
        style={{
          width: '100%',
          height: '140px',
          backgroundColor: '#e5e7eb',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="60" height="60" viewBox="0 0 24 24" fill="#9ca3af">
          <path d="M4 5h6a3 3 0 013 3v12a2 2 0 00-2-2H4V5z" />
          <path d="M20 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7V5z" />
        </svg>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
        <div
          style={{
            fontWeight: '600',
            fontSize: '15px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {book.title}
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>{book.author}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <span
            style={{
              backgroundColor: statusColor,
              color: 'white',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '8px',
            }}
          >
            {book.status}
          </span>
          <StarRating rating={averageRating} size={16} />
        </div>
      </div>
    </div>
  )
}
