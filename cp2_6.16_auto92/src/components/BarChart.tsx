import { useMemo } from 'react'
import type { VoteResult, Movie } from '@/types'

interface BarChartProps {
  data: VoteResult[]
  movies: Movie[]
  isClosed?: boolean
}

export default function BarChart({ data, movies, isClosed = false }: BarChartProps) {
  const sortedData = useMemo(() => {
    if (!isClosed) return data
    return [...data].sort((a, b) => b.count - a.count)
  }, [data, isClosed])

  const maxCount = useMemo(() => {
    if (sortedData.length === 0) return 1
    return Math.max(...sortedData.map((d) => d.count), 1)
  }, [sortedData])

  const topThreeIds = useMemo(() => {
    if (!isClosed) return new Set<string>()
    return new Set(sortedData.slice(0, 3).map((d) => d.movieId))
  }, [sortedData, isClosed])

  const getMovieById = (movieId: string) => {
    return movies.find((m) => m.id === movieId)
  }

  const chartHeight = 280
  const maxBarHeight = chartHeight - 60

  return (
    <div
      className="bar-chart-container glass-card"
      style={{
        padding: '24px',
        borderRadius: '16px',
        width: '100%',
      }}
    >
      <h3
        style={{
          color: '#fff',
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        实时投票结果
      </h3>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '20px',
          height: `${chartHeight}px`,
          paddingBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {sortedData.map((item) => {
          const movie = getMovieById(item.movieId)
          const heightPercentage = maxCount > 0 ? item.count / maxCount : 0
          const barHeight = Math.max(
            heightPercentage * maxBarHeight,
            item.count > 0 ? 20 : 4,
          )
          const isTopThree = topThreeIds.has(item.movieId)

          return (
            <div
              key={item.movieId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: '1 1 0',
                maxWidth: '80px',
                minWidth: '40px',
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  minHeight: '20px',
                }}
              >
                {item.count}
              </div>

              <div
                style={{
                  width: '100%',
                  height: `${barHeight}px`,
                  backgroundColor: isTopThree ? '#f59e0b' : '#c084fc',
                  borderRadius: '8px 8px 4px 4px',
                  transition: 'height 0.3s ease-out',
                  cursor: 'pointer',
                  boxShadow: isTopThree
                    ? '0 0 20px rgba(245, 158, 11, 0.6)'
                    : undefined,
                  animation: isTopThree
                    ? 'goldGlow 1s ease-in-out infinite'
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.2)'
                  e.currentTarget.style.transform = 'scaleY(1.02)'
                  e.currentTarget.style.transformOrigin = 'bottom'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)'
                  e.currentTarget.style.transform = 'scaleY(1)'
                }}
              />

              <div
                style={{
                  marginTop: '8px',
                  fontSize: '20px',
                  color: '#ddd6fe',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {movie?.posterEmoji || '🎬'}
              </div>

              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                  color: '#a78bfa',
                  textAlign: 'center',
                  maxWidth: '80px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={movie?.title}
              >
                {movie?.title || '未知'}
              </div>
            </div>
          )
        })}
      </div>

      {sortedData.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: '#a78bfa',
            padding: '40px 0',
          }}
        >
          暂无投票数据
        </div>
      )}
    </div>
  )
}
