import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSchedule, getVotes, submitVote, fetchMovies } from '@/utils/api'
import type { Schedule, Movie, VoteResult } from '@/types'
import BarChart from '@/components/BarChart'

const VOTER_ID_KEY = 'movie_voter_id'

function generateVoterId(): string {
  return `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getOrCreateVoterId(): string {
  let voterId = localStorage.getItem(VOTER_ID_KEY)
  if (!voterId) {
    voterId = generateVoterId()
    localStorage.setItem(VOTER_ID_KEY, voterId)
  }
  return voterId
}

export default function VotePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [movies, setMovies] = useState<Movie[]>([])
  const [votes, setVotes] = useState<VoteResult[]>([])
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voterId] = useState<string>(() => getOrCreateVoterId())
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const showMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [scheduleData, votesData, moviesData] = await Promise.all([
        getSchedule(id),
        getVotes(id),
        fetchMovies(),
      ])
      setSchedule(scheduleData)
      setVotes(votesData)
      setMovies(moviesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const movieMap = useMemo(() => {
    const map = new Map<string, Movie>()
    movies.forEach((m) => map.set(m.id, m))
    return map
  }, [movies])

  const scheduleMovies = useMemo(() => {
    if (!schedule) return []
    return schedule.items
      .sort((a, b) => a.order - b.order)
      .map((item) => movieMap.get(item.movieId))
      .filter(Boolean) as Movie[]
  }, [schedule, movieMap])

  const sortedByVotes = useMemo(() => {
    if (!schedule) return []
    const itemsWithVotes = schedule.items.map((item) => {
      const voteResult = votes.find((v) => v.movieId === item.movieId)
      return { ...item, count: voteResult?.count || 0 }
    })
    return itemsWithVotes.sort((a, b) => b.count - a.count)
  }, [schedule, votes])

  const topThreeIds = useMemo(() => {
    return new Set(sortedByVotes.slice(0, 3).map((item) => item.movieId))
  }, [sortedByVotes])

  const handleToggleVote = (movieId: string) => {
    if (schedule?.isClosed) return

    const isSelected = selectedMovieIds.includes(movieId)
    if (isSelected) {
      setSelectedMovieIds((prev) => prev.filter((id) => id !== movieId))
    } else {
      if (selectedMovieIds.length >= 3) {
        showMessage('最多只能选择3部电影')
        return
      }
      setSelectedMovieIds((prev) => [...prev, movieId])
    }
  }

  const handleSubmitVote = async () => {
    if (!id || selectedMovieIds.length === 0 || schedule?.isClosed) return

    try {
      setSubmitting(true)
      await submitVote(id, voterId, selectedMovieIds)
      showMessage('投票成功！')
      loadData()
    } catch (error) {
      console.error('Failed to submit vote:', error)
      showMessage('投票失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: '#c084fc', fontSize: '18px' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {showToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'rgba(30, 27, 75, 0.95)',
            border: '1px solid rgba(192, 132, 252, 0.3)',
            color: '#fff',
            fontSize: '14px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {toastMessage}
        </div>
      )}

      <div className="nav-bar">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
          为你喜欢的电影投票
        </h1>
        <div style={{ width: '40px' }} />
      </div>

      <div className="main-content" style={{ maxWidth: '800px' }}>
        {schedule?.isClosed && (
          <div
            className="glass-card"
            style={{
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              background: 'rgba(245, 158, 11, 0.1)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
            <h2
              style={{
                color: '#f59e0b',
                fontSize: '20px',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              投票已截止
            </h2>
            <p style={{ color: '#fcd34d', fontSize: '14px' }}>
              感谢参与！以下是最终投票结果
            </p>
          </div>
        )}

        {!schedule?.isClosed && (
          <div
            className="glass-card"
            style={{ padding: '20px', marginBottom: '24px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎬</div>
            <p style={{ color: '#ddd6fe', fontSize: '14px' }}>
              选出你最想看的电影，每人最多可投 3 票
            </p>
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: selectedMovieIds.length > 0 ? '#c084fc' : '#a78bfa',
                }}
              >
                {selectedMovieIds.length}
              </span>
              <span style={{ color: '#a78bfa', fontSize: '14px' }}>/ 3</span>
            </div>
          </div>
        )}

        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
            {schedule?.isClosed ? '🏆 最终排名' : '📋 候选电影'}
          </h3>

          {scheduleMovies.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#a78bfa',
              }}
            >
              暂无候选电影
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheduleMovies.map((movie, index) => {
                const isSelected = selectedMovieIds.includes(movie.id)
                const isTopThree = schedule?.isClosed && topThreeIds.has(movie.id)
                const voteCount = votes.find((v) => v.movieId === movie.id)?.count || 0
                const rank = sortedByVotes.findIndex((item) => item.movieId === movie.id)
                const rankEmojis = ['🥇', '🥈', '🥉']

                return (
                  <div
                    key={movie.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: isTopThree
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isTopThree
                        ? '2px solid rgba(245, 158, 11, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      animation: isTopThree ? 'goldGlow 1s ease-in-out infinite' : undefined,
                      boxShadow: isTopThree
                        ? '0 0 20px rgba(245, 158, 11, 0.4)'
                        : undefined,
                      transition: 'all 0.2s ease',
                      cursor: schedule?.isClosed ? 'default' : 'pointer',
                    }}
                    onClick={() => !schedule?.isClosed && handleToggleVote(movie.id)}
                    onMouseEnter={(e) => {
                      if (!schedule?.isClosed) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!schedule?.isClosed) {
                        e.currentTarget.style.background = isTopThree
                          ? 'rgba(245, 158, 11, 0.1)'
                          : 'rgba(255, 255, 255, 0.03)'
                      }
                    }}
                  >
                    {schedule?.isClosed && (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                        }}
                      >
                        {rank < 3 ? rankEmojis[rank] : rank + 1}
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleVote(movie.id)
                      }}
                      disabled={schedule?.isClosed}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid #c084fc'
                          : '2px solid rgba(139, 92, 246, 0.5)',
                        background: isSelected ? '#c084fc' : 'rgba(139, 92, 246, 0.1)',
                        color: isSelected ? '#fff' : '#8b5cf6',
                        fontSize: '20px',
                        cursor: schedule?.isClosed ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected
                          ? 'inset 0 0 0 2px #fff, 0 0 10px rgba(255,255,255,0.3)'
                          : undefined,
                        opacity: schedule?.isClosed ? 0.5 : 1,
                      }}
                    >
                      {isSelected ? '✓' : ''}
                    </button>

                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        background: movie.posterColor,
                        flexShrink: 0,
                      }}
                    >
                      {movie.posterEmoji}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 600,
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {movie.title}
                      </div>
                      <div style={{ color: '#a78bfa', fontSize: '13px' }}>
                        {movie.duration} 分钟 · {movie.genre}
                      </div>
                    </div>

                    {schedule?.isClosed && (
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            color: isTopThree ? '#f59e0b' : '#c084fc',
                            fontSize: '22px',
                            fontWeight: 700,
                          }}
                        >
                          {voteCount}
                        </div>
                        <div style={{ color: '#a78bfa', fontSize: '12px' }}>票</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {!schedule?.isClosed && (
          <button
            onClick={handleSubmitVote}
            disabled={selectedMovieIds.length === 0 || submitting}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '12px',
              background:
                selectedMovieIds.length > 0 && !submitting
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                  : 'rgba(139, 92, 246, 0.3)',
              color: selectedMovieIds.length > 0 && !submitting ? '#fff' : '#a78bfa',
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              cursor:
                selectedMovieIds.length > 0 && !submitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              marginBottom: '24px',
            }}
            onMouseEnter={(e) => {
              if (selectedMovieIds.length > 0 && !submitting) {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {submitting ? '提交中...' : `提交投票 (${selectedMovieIds.length}/3)`}
          </button>
        )}

        <BarChart data={votes} movies={movies} isClosed={schedule?.isClosed} />
      </div>
    </div>
  )
}
