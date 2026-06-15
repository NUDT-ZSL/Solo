import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchMovie, submitScore } from '../api'
import { Movie } from '../types'

function AnimatedNumber({ value, decimals = 0, duration = 600 }: { value: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mountedRef.current) return

    const start = prevRef.current
    const end = value
    const startTime = performance.now()

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const animate = (now: number) => {
      if (!mountedRef.current) return
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1 && mountedRef.current) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevRef.current = value
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [value, duration])

  return <span>{display.toFixed(decimals)}</span>
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(7)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    fetchMovie(id)
      .then(data => {
        if (!cancelled) {
          setMovie(data)
          setScore(Math.round(data.averageScore))
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message || '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const handleSubmit = async () => {
    if (!id || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await submitScore(id, score)
      setMovie(updated)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 2000)
    } catch (err: any) {
      setError(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreLabel = (s: number) => {
    if (s >= 9) return '神作'
    if (s >= 8) return '佳作'
    if (s >= 7) return '推荐'
    if (s >= 6) return '还行'
    if (s >= 5) return '一般'
    return '较差'
  }

  const getScoreColor = (s: number) => {
    if (s >= 9) return '#FFD700'
    if (s >= 8) return '#7CFC00'
    if (s >= 7) return '#00CED1'
    if (s >= 6) return '#87CEEB'
    if (s >= 5) return '#FFA500'
    return '#FF6B6B'
  }

  const sliderBg = `linear-gradient(to right, 
    #FFD700 0%, 
    #FFD700 ${((score - 1) / 9) * 100}%, 
    rgba(255,255,255,0.1) ${((score - 1) / 9) * 100}%, 
    rgba(255,255,255,0.1) 100%)`

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>加载电影信息中...</p>
      </div>
    )
  }

  if (error && !movie) {
    return (
      <div style={styles.errorWrap}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorText}>{error}</p>
        <button onClick={() => navigate('/')} style={styles.backBtn}>返回列表</button>
      </div>
    )
  }

  if (!movie) return null

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <Link to="/" style={styles.backLink} className="back-link">← 返回电影列表</Link>

      <div style={styles.headerSection} className="header-section">
        <div style={styles.posterContainer}>
          <img src={movie.poster} alt={movie.title} style={styles.largePoster} />
        </div>

        <div style={styles.headerInfo}>
          <h1 style={styles.title} className="title">{movie.title}</h1>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>📅 {movie.year}</span>
            <span style={styles.metaDot}>·</span>
            <span style={styles.metaItem}>⏱ {movie.duration} 分钟</span>
            <span style={styles.metaDot}>·</span>
            <span style={styles.metaItem}>🎬 {movie.director}</span>
          </div>
          <div style={styles.genreRow}>
            {movie.genre.map(g => (
              <span key={g} style={styles.genreChip}>{g}</span>
            ))}
          </div>

          <div style={styles.statsCard} className="stats-card">
            <div style={styles.statItem}>
              <div style={{ fontSize: '12px', color: '#8888aa', marginBottom: '4px' }}>当前评分</div>
              <div style={{
                fontSize: '40px',
                fontWeight: 800,
                color: getScoreColor(movie.averageScore),
                transition: 'all 0.3s ease',
                transform: submitted ? 'scale(1.08)' : 'scale(1)'
              }}>
                ⭐ <AnimatedNumber value={movie.averageScore} decimals={2} />
              </div>
            </div>
            <div style={styles.statDivider} className="stat-divider" />
            <div style={styles.statItem}>
              <div style={{ fontSize: '12px', color: '#8888aa', marginBottom: '4px' }}>投票人数</div>
              <div style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#FFD700',
                transition: 'all 0.3s ease',
                transform: submitted ? 'scale(1.08)' : 'scale(1)'
              }}>
                <AnimatedNumber value={movie.voteCount} />
                <span style={{ fontSize: '16px', color: '#8888aa', marginLeft: '4px' }}>人</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.detailSection} className="detail-section">
        <h2 style={styles.sectionTitle}>📖 剧情简介</h2>
        <p style={styles.synopsis}>{movie.synopsis}</p>
      </div>

      <div style={styles.detailSection} className="detail-section">
        <h2 style={styles.sectionTitle}>🎭 演员阵容</h2>
        <div style={styles.castGrid} className="cast-grid">
          {movie.cast.map(actor => (
            <div key={actor} style={styles.castCard} className="cast-card">
              <div style={styles.castAvatar} className="cast-avatar">
                {actor.charAt(0)}
              </div>
              <span style={styles.castName}>{actor}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.scoreSection}>
        <h2 style={styles.sectionTitle}>⭐ 为电影打分</h2>

        <div style={styles.sliderContainer}>
          <div style={styles.scorePreview} className="score-preview">
            <span style={{
              fontSize: '56px',
              fontWeight: 800,
              color: getScoreColor(score),
              textShadow: `0 0 30px ${getScoreColor(score)}40`
            }}>
              {score}
            </span>
            <span style={{
              fontSize: '20px',
              color: getScoreColor(score),
              marginTop: '-8px',
              marginLeft: '4px'
            }}>
              /10
            </span>
            <span style={{
              marginTop: '8px',
              fontSize: '14px',
              padding: '6px 16px',
              background: `${getScoreColor(score)}20`,
              color: getScoreColor(score),
              borderRadius: '20px',
              fontWeight: 600
            }}>
              {getScoreLabel(score)}
            </span>
          </div>

          <div style={styles.sliderTrackWrap} className="slider-track-wrap">
            <div style={styles.sliderLabels}>
              <span style={styles.sliderLabel}>1</span>
              <span style={styles.sliderLabel}>5</span>
              <span style={styles.sliderLabel}>10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              style={{
                width: '100%',
                background: sliderBg,
                cursor: 'pointer'
              }}
            />
            <div style={styles.sliderLabels}>
              <span style={styles.sliderLabelText}>较差</span>
              <span style={styles.sliderLabelText}>一般</span>
              <span style={styles.sliderLabelText}>推荐</span>
              <span style={styles.sliderLabelText}>神作</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              ...(submitting ? styles.submitBtnDisabled : {})
            }}
            className="submit-btn"
          >
            {submitting ? (
              <>
                <span style={styles.btnSpinner} />
                提交中...
              </>
            ) : submitted ? (
              <>✓ 提交成功！感谢您的评分</>
            ) : (
              <>提交 {score.toFixed(1)} 分</>
            )}
          </button>

          {error && (
            <div style={styles.submitError}>
              ⚠️ {error}
            </div>
          )}

          {submitted && (
            <div style={styles.successTip}>
              💡 您的评分已记录，列表页和排行榜将实时同步更新
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#FFD700',
    fontSize: '14px',
    marginBottom: '24px',
    opacity: 0.85,
    transition: 'all 0.3s ease'
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '120px 0'
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
  errorWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '100px 0'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: '16px',
    marginBottom: '24px'
  },
  backBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600
  },
  headerSection: {
    display: 'flex',
    gap: '40px',
    marginBottom: '40px',
    background: 'linear-gradient(145deg, rgba(30, 30, 60, 0.6), rgba(20, 20, 45, 0.7))',
    padding: '32px',
    borderRadius: '24px',
    border: '1px solid rgba(255, 215, 0, 0.1)',
    backdropFilter: 'blur(10px)'
  },
  posterContainer: {
    flexShrink: 0
  },
  largePoster: {
    width: '320px',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 215, 0, 0.15)'
  },
  headerInfo: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontSize: '36px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ffffff, #e8e8f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '16px'
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '15px',
    color: '#a0a0c0',
    marginBottom: '16px'
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  metaDot: {
    opacity: 0.4
  },
  genreRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '28px'
  },
  genreChip: {
    padding: '6px 16px',
    background: 'rgba(255, 215, 0, 0.1)',
    border: '1px solid rgba(255, 215, 0, 0.25)',
    color: '#FFD700',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500
  },
  statsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px',
    padding: '24px 28px',
    background: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 215, 0, 0.08)'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  statDivider: {
    width: '1px',
    height: '60px',
    background: 'rgba(255, 215, 0, 0.15)'
  },
  detailSection: {
    marginBottom: '36px',
    padding: '28px 32px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 215, 0, 0.06)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f0f0ff',
    marginBottom: '18px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 215, 0, 0.1)'
  },
  synopsis: {
    fontSize: '15px',
    lineHeight: 1.9,
    color: '#c0c0d8'
  },
  castGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  castCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 215, 0, 0.06)',
    minWidth: '100px'
  },
  castAvatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 700,
    color: '#1a1a2e'
  },
  castName: {
    fontSize: '13px',
    color: '#c0c0d8',
    fontWeight: 500,
    textAlign: 'center'
  },
  scoreSection: {
    padding: '32px',
    background: 'linear-gradient(145deg, rgba(255, 215, 0, 0.05), rgba(255, 165, 0, 0.03))',
    borderRadius: '24px',
    border: '1px solid rgba(255, 215, 0, 0.15)'
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '28px'
  },
  scorePreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 40px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 215, 0, 0.1)'
  },
  sliderTrackWrap: {
    width: '100%',
    maxWidth: '600px'
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 10px',
    marginBottom: '8px'
  },
  sliderLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#8888aa'
  },
  sliderLabelText: {
    fontSize: '12px',
    color: '#666688',
    marginTop: '10px'
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF8C00)',
    backgroundSize: '200% 200%',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    boxShadow: '0 8px 30px rgba(255, 165, 0, 0.35)',
    transition: 'all 0.3s ease',
    letterSpacing: '0.5px'
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    transform: 'none !important'
  },
  btnSpinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(26, 26, 46, 0.25)',
    borderTopColor: '#1a1a2e',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite'
  },
  submitError: {
    padding: '12px 20px',
    background: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    color: '#FF6B6B',
    borderRadius: '10px',
    fontSize: '14px'
  },
  successTip: {
    padding: '12px 20px',
    background: 'rgba(124, 252, 0, 0.08)',
    border: '1px solid rgba(124, 252, 0, 0.25)',
    color: '#7CFC00',
    borderRadius: '10px',
    fontSize: '14px'
  }
}
