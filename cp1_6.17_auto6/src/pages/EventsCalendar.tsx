import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import type { Event } from '../types'
import { getEvents } from '../api/events'

interface EventsCalendarProps {
  getProgressColor: (current: number, max: number) => string
}

interface EventCardProps {
  event: Event
  onClick: () => void
  getProgressColor: (current: number, max: number) => string
}

function EventCard({ event, onClick, getProgressColor }: EventCardProps) {
  const registeredCount = event.participants.length
  const maxCount = event.maxParticipants
  const percentage = Math.round((registeredCount / maxCount) * 100)
  const progressColor = getProgressColor(registeredCount, maxCount)

  return (
    <div className="event-card" onClick={onClick}>
      <h3 className="event-card-title">{event.title}</h3>
      <p className="event-card-date">📅 {event.date}</p>
      <div className="event-card-progress-container">
        <div className="event-card-progress-info">
          <span>报名人数</span>
          <span className="event-card-progress-count">
            {registeredCount}/{maxCount}
          </span>
        </div>
        <div className="event-card-progress-bar">
          <div
            className="event-card-progress-fill"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: progressColor,
              transition: 'width 0.5s ease-out'
            }}
          />
        </div>
        <span className="event-card-progress-percent" style={{ color: progressColor }}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}

function EventsCalendar({ getProgressColor }: EventsCalendarProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    const result = await getEvents()
    if (result.data) {
      setEvents(result.data)
    }
    setLoading(false)
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    events.forEach(event => {
      const existing = map.get(event.date) || []
      map.set(event.date, [...existing, event])
    })
    return map
  }, [events])

  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  const dayEvents = eventsByDate.get(selectedDateStr) || []

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayEventsList = eventsByDate.get(dateStr)
    if (dayEventsList && dayEventsList.length > 0) {
      return (
        <div className="calendar-event-dot">
          {dayEventsList.length}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <h1 className="page-title">📚 书店活动日历</h1>
        <p className="page-subtitle">浏览并参与精彩的书店活动</p>
      </div>

      <div className="calendar-container">
        <div className="calendar-wrapper">
          <Calendar
            onChange={(date) => setSelectedDate(date as Date)}
            value={selectedDate}
            tileContent={tileContent}
            locale="zh-CN"
            formatDay={(locale, date) => date.getDate().toString()}
          />
        </div>

        <div className="events-list-wrapper">
          <h2 className="events-list-title">
            {selectedDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })} 的活动
          </h2>
          {dayEvents.length > 0 ? (
            <div className="events-list">
              {dayEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => navigate(`/events/${event.id}`)}
                  getProgressColor={getProgressColor}
                />
              ))}
            </div>
          ) : (
            <div className="no-events">
              <p>📭 当天暂无活动</p>
              <p className="no-events-hint">选择其他日期查看更多活动</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventsCalendar
