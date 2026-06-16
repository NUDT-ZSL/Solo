import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSchedule, getVotes, updateSchedule, closeSchedule, fetchMovies } from '@/utils/api'
import type { Schedule, Movie, VoteResult, ScheduleItem } from '@/types'
import BarChart from '@/components/BarChart'

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [movies, setMovies] = useState<Movie[]>([])
  const [votes, setVotes] = useState<VoteResult[]>([])
  const [loading, setLoading] = useState(true)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

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

  const sortedItems = useMemo(() => {
    if (!schedule) return []
    return [...schedule.items].sort((a, b) => a.order - b.order)
  }, [schedule])

  const totalDuration = useMemo(() => {
    return sortedItems.reduce((sum, item) => {
      const movie = movieMap.get(item.movieId)
      return sum + (movie?.duration || 0)
    }, 0)
  }, [sortedItems, movieMap])

  const scheduleTimes = useMemo(() => {
    const times: { item: ScheduleItem; date: string; startTime: string; endTime: string }[] = []
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() + 1)
    baseDate.setHours(19, 0, 0, 0)

    let currentTime = new Date(baseDate)
    sortedItems.forEach((item) => {
      const movie = movieMap.get(item.movieId)
      const duration = movie?.duration || 0
      const startTime = currentTime.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
      currentTime = new Date(currentTime.getTime() + duration * 60000)
      const endTime = currentTime.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
      times.push({
        item,
        date: baseDate.toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
        startTime,
        endTime,
      })
    })
    return times
  }, [sortedItems, movieMap])

  const sortedByVotes = useMemo(() => {
    if (!schedule) return []
    const itemsWithVotes = sortedItems.map((item) => {
      const voteResult = votes.find((v) => v.movieId === item.movieId)
      return { ...item, count: voteResult?.count || 0 }
    })
    return itemsWithVotes.sort((a, b) => b.count - a.count)
  }, [sortedItems, votes, schedule])

  const topThreeIds = useMemo(() => {
    return new Set(sortedByVotes.slice(0, 3).map((item) => item.movieId))
  }, [sortedByVotes])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const newItems = [...sortedItems]
    const [removed] = newItems.splice(dragIndex, 1)
    newItems.splice(targetIndex, 0, removed)
    const updatedItems = newItems.map((item, index) => ({ ...item, order: index }))

    setDragIndex(null)
    setDragOverIndex(null)

    if (id) {
      try {
        const updated = await updateSchedule(id, updatedItems)
        setSchedule(updated)
      } catch (error) {
        console.error('Failed to update schedule:', error)
      }
    }
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleRemoveItem = async (movieId: string) => {
    if (!id || !schedule) return
    const newItems = sortedItems
      .filter((item) => item.movieId !== movieId)
      .map((item, index) => ({ ...item, order: index }))
    try {
      const updated = await updateSchedule(id, newItems)
      setSchedule(updated)
    } catch (error) {
      console.error('Failed to update schedule:', error)
    }
  }

  const handleCloseSchedule = async () => {
    if (!id) return
    try {
      const updated = await closeSchedule(id)
      setSchedule(updated)
      loadData()
    } catch (error) {
      console.error('Failed to close schedule:', error)
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/schedule/${id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>排片管理</h1>
        <button
          onClick={handleCopyLink}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? '#34d399' : '#c084fc',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
          }}
          title="复制共享链接"
        >
          {copied ? '✓' : '🔗'}
        </button>
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
              最终结果已出炉，恭喜获奖影片！
            </p>
          </div>
        )}

        {schedule?.isClosed && (
          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              🏆 最终排名
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedByVotes.map((item, index) => {
                const movie = movieMap.get(item.movieId)
                const isTopThree = topThreeIds.has(item.movieId)
                const rankEmojis = ['🥇', '🥈', '🥉']

                return (
                  <div
                    key={item.movieId}
                    className="schedule-list-item"
                    style={{
                      cursor: 'default',
                      padding: '16px',
                      animation: isTopThree ? 'goldGlow 1s ease-in-out infinite' : undefined,
                      boxShadow: isTopThree
                        ? '0 0 20px rgba(245, 158, 11, 0.6), inset 0 0 0 2px rgba(245, 158, 11, 0.3)'
                        : undefined,
                      border: isTopThree
                        ? '2px solid rgba(245, 158, 11, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isTopThree
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: isTopThree ? '#f59e0b' : '#a78bfa',
                      }}
                    >
                      {index < 3 ? rankEmojis[index] : index + 1}
                    </div>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        background: movie?.posterColor || '#4c1d95',
                      }}
                    >
                      {movie?.posterEmoji || '🎬'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                      >
                        {movie?.title || '未知电影'}
                      </div>
                      <div style={{ color: '#a78bfa', fontSize: '13px' }}>
                        {movie?.duration || 0} 分钟
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                      }}
                    >
                      <div
                        style={{
                          color: isTopThree ? '#f59e0b' : '#c084fc',
                          fontSize: '24px',
                          fontWeight: 700,
                        }}
                      >
                        {item.count}
                      </div>
                      <div style={{ color: '#a78bfa', fontSize: '12px' }}>票</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!schedule?.isClosed && (
          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
                📋 排片列表
              </h3>
              <div style={{ color: '#a78bfa', fontSize: '13px' }}>
                共 {sortedItems.length} 部 · 拖拽排序
              </div>
            </div>

            {sortedItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#a78bfa',
                }}
              >
                暂无排片
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortedItems.map((item, index) => {
                  const movie = movieMap.get(item.movieId)
                  const isDragging = dragIndex === index
                  const isDragOver = dragOverIndex === index && dragIndex !== index

                  return (
                    <div
                      key={item.movieId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`schedule-list-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                      style={{
                        padding: '12px',
                        border: isDragOver
                          ? '2px dashed #c084fc'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: 'rgba(192, 132, 252, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#c084fc',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          background: movie?.posterColor || '#4c1d95',
                        }}
                      >
                        {movie?.posterEmoji || '🎬'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 600,
                            marginBottom: '2px',
                          }}
                        >
                          {movie?.title || '未知电影'}
                        </div>
                        <div style={{ color: '#a78bfa', fontSize: '12px' }}>
                          {movie?.duration || 0} 分钟
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.movieId)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          fontSize: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ color: '#a78bfa', fontSize: '14px' }}>
                总时长：
                <span style={{ color: '#c084fc', fontWeight: 600 }}>
                  {totalDuration} 分钟
                </span>
              </div>
              <div style={{ color: '#a78bfa', fontSize: '14px' }}>
                约 {Math.floor(totalDuration / 60)} 小时 {totalDuration % 60} 分钟
              </div>
            </div>
          </div>
        )}

        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            🕐 放映时间安排
          </h3>
          {scheduleTimes.length > 0 && (
            <div style={{ color: '#a78bfa', fontSize: '14px', marginBottom: '16px' }}>
              📅 {scheduleTimes[0].date}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scheduleTimes.map(({ item, startTime, endTime }) => {
              const movie = movieMap.get(item.movieId)
              const isTopVoted =
                schedule?.isClosed &&
                sortedByVotes[0]?.movieId === item.movieId

              return (
                <div
                  key={item.movieId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: isTopVoted
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isTopVoted
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      minWidth: '100px',
                      color: isTopVoted ? '#f59e0b' : '#c084fc',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {startTime} - {endTime}
                  </div>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      background: movie?.posterColor || '#4c1d95',
                    }}
                  >
                    {movie?.posterEmoji || '🎬'}
                  </div>
                  <div style={{ flex: 1, color: '#fff', fontSize: '14px' }}>
                    {movie?.title || '未知电影'}
                    {isTopVoted && (
                      <span
                        style={{
                          marginLeft: '8px',
                          color: '#f59e0b',
                          fontSize: '12px',
                        }}
                      >
                        ⭐ 人气最高
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {schedule?.isClosed && <BarChart data={votes} movies={movies} isClosed={true} />}

        {!schedule?.isClosed && (
          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
              🔗 共享链接
            </h3>
            <div
              onClick={handleCopyLink}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(192, 132, 252, 0.1)',
                border: '1px solid rgba(192, 132, 252, 0.3)',
                color: '#c084fc',
                fontSize: '14px',
                cursor: 'pointer',
                wordBreak: 'break-all',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(192, 132, 252, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(192, 132, 252, 0.1)'
              }}
            >
              {window.location.origin}/schedule/{id}
              <span style={{ float: 'right', color: '#a78bfa' }}>
                {copied ? '已复制 ✓' : '点击复制'}
              </span>
            </div>
          </div>
        )}

        {!schedule?.isClosed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleCloseSchedule}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              ⏹ 截止投票
            </button>

            <Link
              to={`/vote/${id}`}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '14px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              🗳 去投票页
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
