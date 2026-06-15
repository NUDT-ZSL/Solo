import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMovies, fetchYears } from '../api'
import { Movie, MovieFilters } from '../types'

export default function MovieList() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in')
  const [years, setYears] = useState<number[]>([])
  const [filters, setFilters] = useState<MovieFilters>({
    year: 'all',
    minScore: null,
    maxScore: null
  })
  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    fetchYears().then(setYears).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadMovies = async () => {
      setFadeState('out')
      await new Promise(r => setTimeout(r, 300))
      if (cancelled) return

      setLoading(true)
      try {
        const data = await fetchMovies(filtersRef.current)
        if (!cancelled) {
          setMovies(data)
          setFadeState('in')
        }
      } catch (err) {
        console.error('Failed to load movies:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMovies()
    return () => { cancelled = true }
  }, [filters])

  const updateFilter = (key: keyof MovieFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({ year: 'all', minScore: null, maxScore: null })
  }

  return (
    <div>
      <div style={styles.filterBar} className="filter-bar">
        <div style={styles.filterGroup} className="filter-group">
          <label style={styles.filterLabel}>年份</label>
          <select
            value={filters.year === 'all' ? 'all' : String(filters.year)}
            onChange={(e) => updateFilter('year', e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={styles.filterSelect}
            className="filter-select"
          >
            <option value="all">全部年份</option>
            {years.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup} className="filter-group">
          <label style={styles.filterLabel}>最低评分</label>
          <select
            value={filters.minScore ?? 'all'}
            onChange={(e) => updateFilter('minScore', e.target.value === 'all' ? null : Number(e.target.value))}
            style={styles.filterSelect}
            className="filter-select"
          >
            <option value="all">不限</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <option key={n} value={n}>{n}.0+</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup} className="filter-group">
          <label style={styles.filterLabel}>最高评分</label>
          <select
            value={filters.maxScore ?? 'all'}
            onChange={(e) => updateFilter('maxScore', e.target.value === 'all' ? null : Number(e.target.value))}
            style={styles.filterSelect}
            className="filter-select"
          >
            <option value="all">不限</option>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n}.0-</option>
            ))}
          </select>
        </div>

        <button onClick={resetFilters} style={styles.resetBtn} className="reset-btn">
          重置筛选
        </button>

        <div style={styles.resultCount} className="result-count">
          {!loading && <span>共 <strong style={{ color: '#FFD700' }}>{movies.length}</strong> 部电影</span>}
        </div>
      </div>

      <div
        style={{
          ...styles.grid,
          opacity: fadeState === 'in' ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
        className="grid"
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} style={styles.cardSkeleton}>
              <div style={styles.posterSkeleton} />
              <div style={styles.infoSkeleton}>
                <div style={styles.titleLineSkeleton} />
                <div style={styles.metaLineSkeleton} />
              </div>
            </div>
          ))
        ) : movies.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎬</div>
            <p style={styles.emptyText}>没有符合条件的电影</p>
            <button onClick={resetFilters} style={styles.emptyBtn}>清除筛选条件</button>
          </div>
        ) : (
          movies.map(movie => (
            <div
              key={movie.id}
              onClick={() => navigate(`/movie/${movie.id}`)}
              style={styles.card}
              className="movie-card"
            >
              <div style={styles.posterWrapper}>
                <img src={movie.poster} alt={movie.title} style={styles.poster} className="movie-poster" loading="lazy" />
                <div style={styles.posterOverlay} className="poster-overlay" />
                <div style={styles.scoreBadge}>
                  ⭐ {movie.averageScore.toFixed(1)}
                </div>
              </div>
              <div style={styles.cardInfo} className="card-info">
                <h3 style={styles.cardTitle} className="card-title" title={movie.title}>{movie.title}</h3>
                <div style={styles.cardMeta} className="card-meta">
                  <span>{movie.year}</span>
                  <span style={styles.dot}>·</span>
                  <span>{movie.voteCount} 票</span>
                </div>
                <div style={styles.genreTags}>
                  {movie.genre.slice(0, 2).map(g => (
                    <span key={g} style={styles.genreTag}>{g}</span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 215, 0, 0.1)',
    marginBottom: '32px',
    backdropFilter: 'blur(10px)'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '13px',
    color: '#8888aa',
    fontWeight: 500,
    paddingLeft: '4px'
  },
  filterSelect: {
    padding: '10px 16px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    borderRadius: '10px',
    color: '#e8e8f0',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '130px',
    transition: 'all 0.3s ease'
  } as React.CSSProperties,
  resetBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid rgba(255, 215, 0, 0.4)',
    color: '#FFD700',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease',
    height: '42px'
  },
  resultCount: {
    marginLeft: 'auto',
    fontSize: '14px',
    color: '#8888aa',
    paddingBottom: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '24px'
  },
  card: {
    background: 'linear-gradient(145deg, rgba(30, 30, 60, 0.8), rgba(20, 20, 45, 0.9))',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    border: '1px solid rgba(255, 215, 0, 0.08)',
    position: 'relative'
  },
  posterWrapper: {
    position: 'relative',
    overflow: 'hidden',
    aspectRatio: '4 / 3'
  },
  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease'
  },
  posterOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(10, 10, 31, 0.7) 0%, transparent 50%)',
    pointerEvents: 'none'
  },
  scoreBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '6px 12px',
    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 165, 0, 0.95))',
    color: '#1a1a2e',
    borderRadius: '20px',
    fontWeight: 700,
    fontSize: '13px',
    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
  },
  cardInfo: {
    padding: '16px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f0f0ff',
    marginBottom: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#8888aa',
    marginBottom: '10px'
  },
  dot: {
    opacity: 0.5
  },
  genreTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  genreTag: {
    padding: '3px 10px',
    background: 'rgba(255, 215, 0, 0.1)',
    border: '1px solid rgba(255, 215, 0, 0.15)',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#FFD700'
  },
  cardSkeleton: {
    background: 'rgba(30, 30, 60, 0.5)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 215, 0, 0.05)'
  },
  posterSkeleton: {
    aspectRatio: '4 / 3',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,215,0,0.08) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  },
  infoSkeleton: {
    padding: '16px'
  },
  titleLineSkeleton: {
    height: '18px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,215,0,0.08) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
    marginBottom: '10px',
    width: '80%'
  },
  metaLineSkeleton: {
    height: '13px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,215,0,0.08) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
    width: '60%'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '80px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '18px',
    color: '#8888aa',
    marginBottom: '20px'
  },
  emptyBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600
  }
}
