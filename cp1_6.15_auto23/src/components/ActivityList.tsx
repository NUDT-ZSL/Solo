import { useState, useMemo, useRef, useCallback } from 'react'
import { Activity } from '../types'

interface ActivityListProps {
  activities: Activity[]
  selectedActivityId: string | null
  onSelect: (id: string) => void
}

function getProgressColor(ratio: number): string {
  if (ratio < 0.5) return '#4CAF50'
  if (ratio <= 0.8) return '#FFC107'
  return '#F44336'
}

export default function ActivityList({ activities, selectedActivityId, onSelect }: ActivityListProps) {
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
    }, 200)
  }, [])

  const filteredActivities = useMemo(() => {
    if (!search.trim()) return activities
    const keyword = search.trim().toLowerCase()
    return activities.filter((a) => a.name.toLowerCase().includes(keyword))
  }, [activities, search])

  return (
    <div className="activity-list">
      <div className="search-box">
        <input
          type="text"
          placeholder="搜索活动..."
          className="search-input"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <div className="activity-cards">
        {filteredActivities.map((activity) => {
          const isSelected = activity.id === selectedActivityId
          return (
            <div
              key={activity.id}
              className={`activity-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(activity.id)}
            >
              <div className="card-header">
                <h3 className="card-title">{activity.name}</h3>
                <span className="card-date">{activity.date}</span>
              </div>
              <div className="card-count">
                <span className={`count-badge ${activity.signupCount >= activity.maxParticipants ? 'full' : ''}`}>
                  {activity.signupCount}/{activity.maxParticipants}
                </span>
                <span className="count-label">报名人数</span>
              </div>
              <div className="card-supplies">
                {activity.supplies.map((supply) => {
                  const ratio = supply.total > 0 ? supply.allocated / supply.total : 0
                  const color = getProgressColor(ratio)
                  return (
                    <div key={supply.name} className="supply-item">
                      <div className="supply-header">
                        <span className="supply-name">{supply.name}</span>
                        <span className="supply-count" style={{ color }}>
                          {supply.allocated}/{supply.total}
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${ratio * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
