import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '@/components/MovieCard'
import { useMovieStore } from '@/store'
import { createSchedule } from '@/utils/api'
import type { DragEvent } from 'react'

export default function HomePage() {
  const navigate = useNavigate()
  const { movies, scheduleItems, fetchMovies, addMovieToSchedule, removeMovieFromSchedule, reorderSchedule } = useMovieStore()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    fetchMovies()
  }, [fetchMovies])

  const scheduleMovies = useMemo(() => {
    return scheduleItems
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const movie = movies.find((m) => m.id === item.movieId)
        return movie ? { ...item, movie } : null
      })
      .filter(Boolean)
  }, [scheduleItems, movies])

  const totalDuration = useMemo(() => {
    return scheduleMovies.reduce((sum, item) => sum + (item?.movie.duration || 0), 0)
  }, [scheduleMovies])

  const scheduleDates = useMemo(() => {
    const dates: string[] = []
    const today = new Date()
    for (let i = 0; i < scheduleMovies.length; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }))
    }
    return dates
  }, [scheduleMovies.length])

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const movieId = e.dataTransfer.getData('movieId')
    if (movieId) {
      addMovieToSchedule(movieId)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleScheduleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleScheduleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    reorderSchedule(dragIndex, index)
    setDragIndex(index)
  }

  const handleScheduleDragEnd = () => {
    setDragIndex(null)
  }

  const handleGenerateSchedule = async () => {
    if (scheduleItems.length === 0) return
    try {
      const schedule = await createSchedule(scheduleItems)
      navigate(`/schedule/${schedule.id}`)
    } catch (error) {
      console.error('Failed to create schedule:', error)
    }
  }

  return (
    <div className="home-page">
      <nav className="nav-bar">
        <div className="nav-logo">
          <span>🎬</span>
          <span>家庭电影夜</span>
        </div>
        <div className="nav-avatar">👤</div>
      </nav>

      <div className="main-content">
        <div className="home-layout">
          <div className="movie-grid-section">
            <h2 className="section-title">电影库</h2>
            <div className="movie-grid">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  draggable
                  onAddToSchedule={() => addMovieToSchedule(movie.id)}
                />
              ))}
            </div>
          </div>

          <div className="schedule-sidebar">
            <div
              className={`schedule-panel ${isDragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <h2 className="section-title">当前排片</h2>

              {scheduleMovies.length === 0 ? (
                <div className="empty-schedule">
                  <div className="empty-icon">📽️</div>
                  <p>拖拽电影卡片到这里</p>
                  <p className="empty-hint">或点击卡片背面的"加入排片"按钮</p>
                </div>
              ) : (
                <>
                  <div className="schedule-list">
                    {scheduleMovies.map((item, index) => (
                      <div
                        key={item!.movieId}
                        className={`schedule-list-item ${dragIndex === index ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => handleScheduleDragStart(index)}
                        onDragOver={(e) => handleScheduleDragOver(e, index)}
                        onDragEnd={handleScheduleDragEnd}
                      >
                        <span className="schedule-order">{index + 1}</span>
                        <div className="schedule-poster">{item!.movie.posterEmoji}</div>
                        <div className="schedule-info">
                          <div className="schedule-title">{item!.movie.title}</div>
                          <div className="schedule-meta">
                            <span>⏱ {item!.movie.duration} 分钟</span>
                            <span className="schedule-date">📅 {scheduleDates[index]}</span>
                          </div>
                        </div>
                        <button
                          className="remove-btn"
                          onClick={() => removeMovieFromSchedule(item!.movieId)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="schedule-stats">
                    <div className="stat-row">
                      <span>总时长</span>
                      <span className="stat-value">{totalDuration} 分钟</span>
                    </div>
                    <div className="stat-row">
                      <span>电影数量</span>
                      <span className="stat-value">{scheduleMovies.length} 部</span>
                    </div>
                  </div>

                  <button
                    className="generate-btn"
                    onClick={handleGenerateSchedule}
                    disabled={scheduleMovies.length === 0}
                  >
                    生成排片表
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
