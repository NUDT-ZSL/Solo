import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchRanking } from '../api'
import { RankedMovie } from '../types'

export default function RankList() {
  const navigate = useNavigate()
  const [ranking, setRanking] = useState<RankedMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(5)
  const prevRanksRef = useRef<Map<string, number>>(new Map())
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set())
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set())
  const flashVersionRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    let cancelled = false

    const loadRanking = async (isInitial = false) => {
      try {
        const data = await fetchRanking()
        if (cancelled) return

        const prev = prevRanksRef.current
        const changed: Set<string> = new Set()
        const flash: Set<string> = new Set()

        data.forEach(m => {
          const prevRank = prev.get(m.id)
          if (prevRank !== undefined && prevRank !== m.rank) {
            changed.add(m.id)
            flash.add(m.id)
          }
          prev.set(m.id, m.rank)
        })

        prevRanksRef.current = prev

        if (!isInitial && changed.size > 0) {
          changed.forEach(id => {
            const current = flashVersionRef.current.get(id) || 0
            flashVersionRef.current.set(id, current + 1)
          })
          setChangedIds(new Set(changed))
          setFlashingIds(new Set(changed))
          setTimeout(() => {
            setFlashingIds(new Set())
          }, 1500)
          setTimeout(() => {
            setChangedIds(new Set())
          }, 3000)
        }

        setRanking(data)
        setLastUpdated(new Date())
        setCountdown(5)
      } catch (err) {
        console.error('Failed to load ranking:', err)
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    loadRanking(true)

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
        loadRanking(false)
          return 5
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      cancelled = true
      clearInterval(countdownInterval)
    }
  }, [])

  const getMedalStyle = (rank: number): React.CSSProperties => {
    switch (rank) {
      case 1:
        return {
          background: 'linear-gradient(135deg, #FFD700, #FFA500)',
          boxShadow: '0 4px 20px rgba(255, 215, 0, 0.5)',
          color: '#1a1a2e'
        }
      case 2:
        return {
          background: 'linear-gradient(135deg, #E8E8E8, #B8B8C8)',
          boxShadow: '0 4px 20px rgba(232, 232, 232, 0.4)',
          color: '#1a1a2e'
        }
      case 3:
        return {
          background: 'linear-gradient(135deg, #CD7F32, #B87333)',
          boxShadow: '0 4px 20px rgba(205, 127, 50, 0.4)',
          color: '#ffffff'
        }
      default:
        return {
          background: 'rgba(255, 255, 255, 0.06)',
          color: '#8888aa',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }
    }
  }

  const getRowBgStyle = (rank: number, id: string): React.CSSProperties => {
    const isFlashing = flashingIds.has(id)
    const base: React.CSSProperties = {
      transition: 'all 0.5s ease'
    }

    let bgStyle: React.CSSProperties

    if (rank === 1) {
      bgStyle = {
        background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.12), rgba(255, 215, 0, 0.02)',
        border: '1px solid rgba(255, 215, 0, 0.25)'
      }
    } else if (rank === 2) {
      bgStyle = {
        background: 'linear-gradient(90deg, rgba(232, 232, 232, 0.08), rgba(232, 232, 232, 0.02)',
        border: '1px solid rgba(232, 232, 232, 0.2)'
      }
    } else if (rank === 3) {
      bgStyle = {
        background: 'linear-gradient(90deg, rgba(205, 127, 50, 0.08), rgba(205, 127, 50, 0.02)',
        border: '1px solid rgba(205, 127, 50, 0.2)'
      }
    } else {
      bgStyle = {
        background: changedIds.has(id)
          ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.04), transparent)'
          : 'rgba(255, 255, 255, 0.02)',
        border: changedIds.has(id)
          ? '1px solid rgba(255, 215, 0, 0.15)'
          : '1px solid rgba(255, 255, 255, 0.05)'
      }
    }

    if (isFlashing) {
      return {
        ...base,
        ...bgStyle,
        animation: 'rankFlash 1.5s ease-in-out, rankFlashGlow 0.8s ease-in-out 2'
      }
    }

    return { ...base, ...bgStyle }
  }

  const getTrendIndicator = (id: string) => {
    const current = ranking.find(r => r.id === id)
    if (!current) return null
    const prev = prevRanksRef.current
    const prevRank = prev.get(id)
    if (prevRank === undefined) return null
    const diff = prevRank - current.rank
    if (diff === 0) {
      return <span style={styles.trendNeutral}>—</span>
    }
    if (diff > 0) {
      return <span style={styles.trendUp}>↑ {diff}</span>
    }
    return <span style={styles.trendDown}>↓ {Math.abs(diff)}</span>
  }

  return (
    <div>
      <div style={styles.header} className="header">
        <div>
          <h1 style={styles.title}>🏆 实时排行榜</h1>
          <p style={styles.subtitle}>根据所有用户评分实时排序，每5秒自动刷新</p>
        </div>
        <div style={styles.statusCard} className="status-card">
          <div style={styles.countdownWrap}>
            <span style={styles.countdownLabel}>下一次刷新</span>
            <span style={styles.countdownValue} className="countdown-value">{countdown}s</span>
          </div>
          <div style={styles.statusDivider} />
          <div style={styles.updatedWrap}>
            <span style={styles.updatedDot} />
            <span style={styles.updatedLabel}>
              {lastUpdated ? `更新于 ${lastUpdated.toLocaleTimeString()}` : '加载中...'}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>加载排行榜中...</p>
        </div>
      ) : (
        <div style={styles.rankContainer}>
          <div style={styles.rankHeader} className="rank-header">
            <div style={{ width: '80px' }}>排名</div>
            <div style={{ flex: 1 }}>电影</div>
            <div style={{ width: '120px', textAlign: 'center' }}>评分</div>
            <div style={{ width: '100px', textAlign: 'center' }}>投票</div>
            <div style={{ width: '80px', textAlign: 'center' }}>趋势</div>
          </div>

          <div style={styles.rankList}>
            {ranking.map((movie) => {
              const flashVersion = flashVersionRef.current.get(movie.id) || 0
              return (
                <div
                  key={`${movie.id}-${flashVersion}`}
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  style={{
                    ...styles.rankRow,
                    ...getRowBgStyle(movie.rank, movie.id)
                  }}
                  className="rank-row"
                >
                <div style={{ width: '80px' }}>
                  <div style={{
                    ...styles.rankBadge,
                    ...getMedalStyle(movie.rank)
                  }} className="rank-badge">
                    {movie.rank <= 3 ? ['🥇', '🥈', '🥉'][movie.rank - 1] : movie.rank}
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    style={styles.thumbnail}
                    className="thumbnail"
                    loading="lazy"
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.movieTitle} className="movie-title">{movie.title}</div>
                    <div style={styles.movieMeta}>
                      <span>{movie.year}</span>
                      <span style={styles.metaDot}>·</span>
                      <span>{movie.genre.slice(0, 2).join(' / ')}</span>
                    </div>
                  </div>
                </div>

                <div style={{ width: '120px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: movie.averageScore >= 9 ? '#FFD700' :
                           movie.averageScore >= 8 ? '#7CFC00' :
                           movie.averageScore >= 7 ? '#00CED1' : '#a0a0c0'
                  }}>
                    ⭐ {movie.averageScore.toFixed(2)}
                  </span>
                </div>

                <div style={{ width: '100px', textAlign: 'center' }}>
                  <span style={styles.voteCount}>{movie.voteCount}</span>
                </div>

                <div style={{ width: '80px', textAlign: 'center' }}>
                  {getTrendIndicator(movie.id)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF8C00)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#8888aa'
  },
  statusCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '14px 24px',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 215, 0, 0.1)'
  },
  countdownWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  countdownLabel: {
    fontSize: '11px',
    color: '#8888aa',
    marginBottom: '2px'
  },
  countdownValue: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#FFD700',
    fontVariantNumeric: 'tabular-nums'
  },
  statusDivider: {
    width: '1px',
    height: '36px',
    background: 'rgba(255, 255, 255, 0.1)'
  },
  updatedWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  updatedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#7CFC00',
    boxShadow: '0 0 10px #7CFC00',
    animation: 'pulse 2s infinite'
  },
  updatedLabel: {
    fontSize: '13px',
    color: '#a0a0c0'
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 0'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid rgba(255, 215, 0, 0.15)',
    borderTopColor: '#FFD700',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    color: '#8888aa',
    fontSize: '15px'
  },
  rankContainer: {
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 215, 0, 0.08)'
  },
  rankHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'rgba(0, 0, 0, 0.25)',
    borderBottom: '1px solid rgba(255, 215, 0, 0.1)',
    fontSize: '13px',
    fontWeight: 600,
    color: '#8888aa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  rankList: {
    display: 'flex',
    flexDirection: 'column'
  },
  rankRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    cursor: 'pointer',
    borderRadius: '0'
  },
  rankBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '16px'
  },
  thumbnail: {
    width: '56px',
    height: '42px',
    objectFit: 'cover',
    borderRadius: '8px',
    flexShrink: 0,
    border: '1px solid rgba(255, 215, 0, 0.15)'
  },
  movieTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f0f0ff',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  movieMeta: {
    fontSize: '12px',
    color: '#8888aa',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  metaDot: {
    opacity: 0.5
  },
  voteCount: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#a0a0c0',
    fontVariantNumeric: 'tabular-nums'
  },
  trendUp: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    background: 'rgba(124, 252, 0, 0.12)',
    color: '#7CFC00',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700
  },
  trendDown: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    background: 'rgba(255, 107, 107, 0.12)',
    color: '#FF6B6B',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700
  },
  trendNeutral: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    background: 'rgba(136, 136, 170, 0.12)',
    color: '#8888aa',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700
  }
}
