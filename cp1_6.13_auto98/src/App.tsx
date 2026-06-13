import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter, Routes, Route, useNavigate, useLocation, useParams, Link
} from 'react-router-dom'
import {
  PlantManagerProvider, usePlantManager, PlantCard, GrowthTimeline, Photo,
  getStatusColor, getLocationLabel, getOperationLabel
} from './modules/plantManager/PlantManager'
import {
  Plant, Operation, PlantLocation, OperationType, Reminder
} from './modules/reminderEngine/ReminderEngine'

const globalStyles = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
      'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    background: #f0fdf4;
    color: #334155;
    -webkit-font-smoothing: antialiased;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes slideInLeft {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutLeft {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(-100%); opacity: 0; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  @keyframes bannerSlideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  button {
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  button:hover { filter: brightness(0.95); }
  input, select, textarea {
    font-family: inherit;
  }
  a { text-decoration: none; color: inherit; }
`

const DISMISSED_REMINDERS_KEY = 'garden_care_dismissed_reminders_date'

const getTodayDateString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const checkIfRemindersDismissedToday = (): boolean => {
  try {
    const storedValue = localStorage.getItem(DISMISSED_REMINDERS_KEY)
    if (!storedValue) {
      return false
    }
    const parsed = JSON.parse(storedValue)
    const today = getTodayDateString()
    const isSameDay = parsed.date === today && parsed.dismissed === true
    return isSameDay
  } catch (error) {
    console.warn('读取localStorage提醒状态失败:', error)
    return false
  }
}

const saveRemindersDismissedToday = (): void => {
  try {
    const dataToStore = {
      date: getTodayDateString(),
      dismissed: true,
      timestamp: Date.now()
    }
    localStorage.setItem(DISMISSED_REMINDERS_KEY, JSON.stringify(dataToStore))
  } catch (error) {
    console.warn('写入localStorage提醒状态失败:', error)
  }
}

const SkeletonCard: React.FC = () => (
  <div style={{
    width: 300,
    height: 380,
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden'
  }}>
    <div style={{
      height: 180,
      background: '#e2e8f0',
      animation: 'pulse 1.5s ease-in-out infinite'
    }} />
    <div style={{ padding: 16 }}>
      <div style={{ height: 20, width: '60%', background: '#e2e8f0', borderRadius: 4, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 14, width: '80%', background: '#e2e8f0', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 12, width: '50%', background: '#e2e8f0', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  </div>
)

interface ReminderBannerProps {
  reminders: Reminder[]
}

const ReminderBanner: React.FC<ReminderBannerProps> = ({ reminders }) => {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(areRemindersDismissedToday())

  const waterReminders = reminders.filter(r => r.type === 'water')
  const fertilizeReminders = reminders.filter(r => r.type === 'fertilize')

  useEffect(() => {
    if (reminders.length > 0 && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 300)
      return () => clearTimeout(timer)
    }
  }, [reminders, dismissed])

  const handleClose = () => {
    setVisible(false)
    setDismissed(true)
    setRemindersDismissedToday()
  }

  if (dismissed || reminders.length === 0) return null

  return (
    <div style={{
      animation: visible ? 'bannerSlideDown 0.4s ease forwards' : 'none',
      opacity: visible ? 1 : 0
    }}>
      {waterReminders.length > 0 && (
        <div
          onClick={handleClose}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            borderBottom: '1px solid #fecaca'
          }}
        >
          <span style={{ fontSize: 20 }}>💧</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
            {waterReminders.length === 1
              ? waterReminders[0].message
              : `有 ${waterReminders.length} 棵植物需要浇水`}
          </span>
          <span style={{ fontSize: 11, padding: '4px 10px', background: '#fecaca', borderRadius: 12 }}>点击关闭</span>
        </div>
      )}
      {fertilizeReminders.length > 0 && (
        <div
          onClick={handleClose}
          style={{
            background: '#f3e8ff',
            color: '#9333ea',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            borderBottom: '1px solid #e9d5ff'
          }}
        >
          <span style={{ fontSize: 20 }}>🌿</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
            {fertilizeReminders.length === 1
              ? fertilizeReminders[0].message
              : `有 ${fertilizeReminders.length} 棵植物需要施肥`}
          </span>
          <span style={{ fontSize: 11, padding: '4px 10px', background: '#e9d5ff', borderRadius: 12 }}>点击关闭</span>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: string
  badge?: number
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, badge }) => (
  <div style={{
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative'
  }}>
    <div style={{
      width: 48,
      height: 48,
      borderRadius: 12,
      background: '#dcfce7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{label}</p>
      <p style={{
        margin: '4px 0 0 0',
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#334155',
        lineHeight: 1.1,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {value}
        {badge !== undefined && badge > 0 && (
          <span style={{
            marginLeft: 8,
            fontSize: 12,
            fontWeight: 600,
            background: '#ef4444',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 10,
            verticalAlign: 'middle'
          }}>
            {badge}
          </span>
        )}
      </p>
    </div>
  </div>
)

const EmptyState: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div style={{
    padding: '64px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }}>
    <div style={{ fontSize: 64, marginBottom: 16 }}>{icon}</div>
    <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#334155' }}>{title}</h3>
    <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', maxWidth: 320 }}>{description}</p>
  </div>
)

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { reminders } = usePlantManager()

  const navItems = [
    { path: '/', label: '仪表盘', icon: '🏠' },
    { path: '/plants', label: '我的植物', icon: '🌱' },
    { path: '/calendar', label: '操作日历', icon: '📅' },
    { path: '/add', label: '添加植物', icon: '➕' }
  ]

  return (
    <aside style={{
      width: 220,
      background: 'white',
      borderRight: '1px solid #e2e8f0',
      padding: '24px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }} className="sidebar-desktop">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 8px 24px',
        borderBottom: '1px solid #f1f5f9',
        marginBottom: 8
      }}>
        <span style={{ fontSize: 28 }}>🌿</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>花园日记</span>
      </div>
      {navItems.map(item => {
        const isActive = location.pathname === item.path
        const showBadge = item.path === '/' && reminders.length > 0
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: isActive ? '#f0fdf4' : 'transparent',
              color: isActive ? '#16a34a' : '#64748b',
              border: 'none',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              position: 'relative'
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
            {showBadge && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 11,
                fontWeight: 700,
                background: '#ef4444',
                color: 'white',
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px'
              }}>
                {reminders.length}
              </span>
            )}
          </button>
        )
      })}
    </aside>
  )
}

const MobileTabBar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { reminders } = usePlantManager()

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/plants', label: '植物', icon: '🌱' },
    { path: '/add', label: '添加', icon: '➕' },
    { path: '/calendar', label: '日历', icon: '📅' }
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      padding: '8px 4px',
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
      zIndex: 100
    }} className="tabbar-mobile">
      {navItems.map(item => {
        const isActive = location.pathname === item.path
        const showBadge = item.path === '/' && reminders.length > 0
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '6px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: isActive ? '#16a34a' : '#94a3b8',
              fontSize: 11,
              position: 'relative'
            }}
          >
            <span style={{ fontSize: 22, position: 'relative' }}>
              {item.icon}
              {showBadge && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#ef4444',
                  color: 'white',
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px'
                }}>
                  {reminders.length}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { plants, operations, reminders, loading } = usePlantManager()

  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const opsThisMonth = operations.filter(op => op.date >= monthStart && op.date <= monthEnd)
    return {
      totalPlants: plants.length,
      operationsThisMonth: opsThisMonth.length,
      pendingReminders: reminders.length
    }
  }, [plants, operations, reminders])

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <StatCard label="植物总数" value={stats.totalPlants} icon="🌱" />
        <StatCard label="本月操作" value={stats.operationsThisMonth} icon="✅" />
        <StatCard label="待处理提醒" value={stats.pendingReminders} icon="🔔" badge={stats.pendingReminders} />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#334155' }}>我的植物</h2>
        <button
          onClick={() => navigate('/add')}
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500
          }}
        >
          + 添加植物
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : plants.length === 0 ? (
        <EmptyState
          icon="🪴"
          title="还没有添加植物"
          description="点击上方按钮添加你的第一棵植物，开始记录它的成长历程吧！"
        />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {plants.slice(0, 6).map(plant => (
            <PlantCard key={plant._id} plant={plant} onClick={() => navigate(`/plant/${plant._id}`)} />
          ))}
          {plants.length > 6 && (
            <button
              onClick={() => navigate('/plants')}
              style={{
                width: 300,
                height: 380,
                background: 'white',
                borderRadius: 16,
                border: '2px dashed #cbd5e1',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14
              }}
            >
              <span style={{ fontSize: 32 }}>→</span>
              查看全部 {plants.length} 棵植物
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const PlantsList: React.FC = () => {
  const navigate = useNavigate()
  const { plants, loading } = usePlantManager()
  const [filter, setFilter] = useState<'all' | PlantLocation>('all')

  const filteredPlants = useMemo(() => {
    if (filter === 'all') return plants
    return plants.filter(p => p.location === filter)
  }, [plants, filter])

  const filters: { value: 'all' | PlantLocation; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'indoor', label: '室内' },
    { value: 'balcony', label: '阳台' },
    { value: 'garden', label: '花园' }
  ]

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#334155' }}>我的植物 ({plants.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                background: filter === f.value ? '#22c55e' : 'white',
                color: filter === f.value ? 'white' : '#64748b',
                border: filter === f.value ? 'none' : '1px solid #e2e8f0',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filteredPlants.length === 0 ? (
        <EmptyState icon="🔍" title="没有找到植物" description="换个筛选条件试试，或者添加一棵新的植物吧" />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {filteredPlants.map(plant => (
            <PlantCard key={plant._id} plant={plant} onClick={() => navigate(`/plant/${plant._id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

const CalendarView: React.FC = () => {
  const { operations, plants } = usePlantManager()
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [animDirection, setAnimDirection] = useState<'left' | 'right' | null>(null)
  const [animating, setAnimating] = useState(false)

  const operationColors: Record<OperationType, string> = {
    water: '#3b82f6',
    fertilize: '#a855f7',
    repot: '#f59e0b',
    prune: '#10b981',
    other: '#6b7280'
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (animating) return
    setAnimDirection(direction)
    setAnimating(true)
    setTimeout(() => {
      setCurrentDate(prev => {
        const newDate = new Date(prev)
        if (direction === 'next') newDate.setMonth(prev.getMonth() + 1)
        else newDate.setMonth(prev.getMonth() - 1)
        return newDate
      })
      setTimeout(() => {
        setAnimating(false)
        setAnimDirection(null)
      }, 50)
    }, 250)
  }

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekday = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const weeks: (number | null)[][] = []
    let currentWeek: (number | null)[] = []

    for (let i = 0; i < startWeekday; i++) currentWeek.push(null)

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null)
      weeks.push(currentWeek)
    }

    return { year, month, weeks }
  }, [currentDate])

  const getOperationsForDay = (day: number): Operation[] => {
    const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return operations.filter(op => {
      const opDate = new Date(op.date)
      const opDateStr = `${opDate.getFullYear()}-${String(opDate.getMonth() + 1).padStart(2, '0')}-${String(opDate.getDate()).padStart(2, '0')}`
      return opDateStr === dateStr
    })
  }

  const selectedDateOps = selectedDate
    ? operations.filter(op => {
        const opDate = new Date(op.date)
        const opDateStr = `${opDate.getFullYear()}-${String(opDate.getMonth() + 1).padStart(2, '0')}-${String(opDate.getDate()).padStart(2, '0')}`
        return opDateStr === selectedDate
      })
    : []

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  const animStyle: React.CSSProperties = animDirection ? {
    animation: animating
      ? `${animDirection === 'left' ? 'slideOutLeft' : 'slideOutRight'} 0.25s ease forwards`
      : `${animDirection === 'left' ? 'slideInRight' : 'slideInLeft'} 0.25s ease forwards`
  } : {}

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: 20, color: '#334155' }}>操作日历</h2>

      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: 20,
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <button
            onClick={() => navigateMonth('prev')}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: 36,
              height: 36,
              borderRadius: 8,
              fontSize: 18
            }}
          >
            ‹
          </button>
          <h3 style={{ margin: 0, fontSize: 18, color: '#334155' }}>
            {calendarData.year}年 {monthNames[calendarData.month]}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: 36,
              height: 36,
              borderRadius: 8,
              fontSize: 18
            }}
          >
            ›
          </button>
        </div>

        <div style={animStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {weekdays.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#94a3b8',
                padding: '8px 0',
                fontWeight: 500
              }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calendarData.weeks.flat().map((day, idx) => {
              if (day === null) return <div key={idx} />

              const dayOps = getOperationsForDay(day)
              const dayKey = `${calendarData.year}-${calendarData.month}-${day}`
              const isToday = dayKey === todayStr
              const isSelected = selectedDate === dayKey

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(isSelected ? null : dayKey)}
                  style={{
                    aspectRatio: '1 / 1',
                    background: isSelected ? '#22c55e' : isToday ? '#dcfce7' : '#f8fafc',
                    color: isSelected ? 'white' : isToday ? '#16a34a' : '#334155',
                    border: isToday && !isSelected ? '1px solid #22c55e' : '1px solid transparent',
                    borderRadius: 8,
                    padding: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontSize: 14,
                    fontWeight: isToday ? 600 : 400,
                    minHeight: 56
                  }}
                >
                  <span>{day}</span>
                  {dayOps.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayOps.slice(0, 4).map((op, i) => (
                        <div
                          key={i}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: operationColors[op.type]
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap'
        }}>
          {Object.entries(operationColors).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              {getOperationLabel(type as OperationType)}
            </div>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          padding: 20,
          marginTop: 16,
          animation: 'fadeIn 0.3s ease'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#334155' }}>
            {selectedDate.split('-')[0]}年{parseInt(selectedDate.split('-')[1])}月{parseInt(selectedDate.split('-')[2])}日 的操作记录
          </h4>
          {selectedDateOps.length === 0 ? (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>这一天没有操作记录</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedDateOps.map(op => {
                const plant = plants.find(p => p._id === op.plantId)
                return (
                  <div key={op._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: '#f8fafc',
                    borderRadius: 8
                  }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: operationColors[op.type],
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#334155' }}>
                        {plant?.name || '未知植物'} · {getOperationLabel(op.type)}
                      </p>
                      {op.note && (
                        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>{op.note}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const AddPlantForm: React.FC = () => {
  const navigate = useNavigate()
  const { addPlant } = usePlantManager()
  const [form, setForm] = useState({
    name: '',
    variety: '',
    plantDate: new Date().toISOString().split('T')[0],
    location: 'indoor' as PlantLocation,
    coverPhoto: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm(prev => ({ ...prev, coverPhoto: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.variety.trim()) {
      setError('请填写植物名称和品种')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await addPlant(form)
      navigate('/plants')
    } catch (err: any) {
      setError(err.message || '添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 20, color: '#334155' }}>添加新植物</h2>

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: 500 }}>
            植物照片
          </label>
          <label style={{
            width: '100%',
            height: 180,
            borderRadius: 12,
            border: `2px dashed ${form.coverPhoto ? '#22c55e' : '#cbd5e1'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            background: form.coverPhoto ? 'transparent' : '#f8fafc'
          }}>
            {form.coverPhoto ? (
              <img src={form.coverPhoto} alt="预览" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#94a3b8', fontSize: 14 }}>📷 点击上传照片（可选）</span>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: 500 }}>
            植物名称 *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="给它起个名字吧"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: 500 }}>
            品种 *
          </label>
          <input
            type="text"
            value={form.variety}
            onChange={e => setForm(prev => ({ ...prev, variety: e.target.value }))}
            placeholder="例如：绿萝、多肉、月季..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: 500 }}>
            种植日期
          </label>
          <input
            type="date"
            value={form.plantDate}
            onChange={e => setForm(prev => ({ ...prev, plantDate: e.target.value }))}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: 500 }}>
            位置
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['indoor', 'balcony', 'garden'] as PlantLocation[]).map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, location: loc }))}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: form.location === loc ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  background: form.location === loc ? '#f0fdf4' : 'white',
                  color: form.location === loc ? '#16a34a' : '#64748b',
                  fontSize: 14,
                  fontWeight: form.location === loc ? 600 : 400
                }}
              >
                {getLocationLabel(loc)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#dc2626', background: '#fee2e2', padding: 10, borderRadius: 8 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#64748b',
              fontSize: 15,
              fontWeight: 500
            }}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: '#22c55e',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? '添加中...' : '添加植物'}
          </button>
        </div>
      </form>
    </div>
  )
}

const PlantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { plants, operations, getNextTasksForPlant, addOperation, deletePlant, uploadPhoto, refreshData } = usePlantManager()
  const [showOpForm, setShowOpForm] = useState(false)
  const [opType, setOpType] = useState<OperationType>('water')
  const [opNote, setOpNote] = useState('')
  const [opDate, setOpDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const plant = plants.find(p => p._id === id)
  const plantOps = operations.filter(op => op.plantId === id)
  const tasks = plant ? getNextTasksForPlant(plant) : []

  useEffect(() => {
    refreshData()
  }, [])

  if (!plant) {
    return (
      <EmptyState icon="❓" title="植物不存在" description="可能已被删除，返回植物列表查看其他植物" />
    )
  }

  const handleAddOperation = async () => {
    if (!id) return
    setSubmitting(true)
    try {
      await addOperation({
        plantId: id,
        type: opType,
        note: opNote || undefined,
        date: new Date(opDate).toISOString()
      })
      setShowOpForm(false)
      setOpNote('')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await uploadPhoto(id, reader.result as string)
      } catch {}
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deletePlant(id)
      navigate('/plants')
    } catch {}
  }

  const taskIcons: Record<string, string> = {
    water: '💧',
    fertilize: '🌿',
    prune: '✂️',
    repot: '🪴'
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          fontSize: 14,
          padding: '8px 0',
          marginBottom: 16
        }}
      >
        ← 返回
      </button>

      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        marginBottom: 20,
        borderTop: `4px solid ${getStatusColor(plant.status)}`
      }}>
        <div style={{
          height: 240,
          background: plant.coverPhoto ? `url(${plant.coverPhoto}) center/cover no-repeat` : '#f0fdf4',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          padding: 20
        }}>
          {!plant.coverPhoto && <div style={{ fontSize: 96 }}>🌱</div>}
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, color: '#334155' }}>{plant.name}</h1>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 15 }}>{plant.variety}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  background: 'white',
                  color: '#dc2626',
                  fontSize: 13
                }}
              >
                删除
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>位置</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#334155', fontWeight: 500 }}>{getLocationLabel(plant.location)}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>种植日期</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#334155', fontWeight: 500 }}>
                {new Date(plant.plantDate).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>状态</p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: 14,
                color: getStatusColor(plant.status),
                fontWeight: 600
              }}>
                {plant.status === 'healthy' ? '健康' :
                 plant.status === 'thirsty' ? '缺水' :
                 plant.status === 'hungry' ? '缺肥' : '生病'}
              </p>
            </div>
          </div>

          {tasks.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 12 }}>
              <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>待办事项</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map((task, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    color: task.dueInDays <= 0 ? '#dc2626' : '#334155'
                  }}>
                    <span>{taskIcons[task.type]}</span>
                    <span>{task.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowOpForm(true)}
              style={{
                flex: 1,
                minWidth: 140,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#22c55e',
                color: 'white',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              ✅ 记录操作
            </button>
            <label style={{
              flex: 1,
              minWidth: 140,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #22c55e',
              background: 'white',
              color: '#16a34a',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              📷 上传照片
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {showOpForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: 20,
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => setShowOpForm(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#334155' }}>记录操作</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6 }}>操作类型</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {(['water', 'fertilize', 'repot', 'prune', 'other'] as OperationType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOpType(type)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 8,
                        border: opType === type ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        background: opType === type ? '#f0fdf4' : 'white',
                        color: opType === type ? '#16a34a' : '#64748b',
                        fontSize: 12
                      }}
                    >
                      {getOperationLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6 }}>日期</label>
                <input
                  type="date"
                  value={opDate}
                  onChange={e => setOpDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6 }}>备注（可选）</label>
                <textarea
                  value={opNote}
                  onChange={e => setOpNote(e.target.value)}
                  placeholder="记录一些细节..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowOpForm(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontSize: 14
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddOperation}
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#22c55e',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 500,
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? '保存中...' : '保存记录'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: 20,
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => setShowDeleteConfirm(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 360,
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#334155' }}>确认删除</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 14, color: '#64748b' }}>
              删除「{plant.name}」将同时删除它的所有操作记录和照片，此操作不可撤销。
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  fontSize: 14
                }}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: 20,
        marginBottom: 20
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#334155' }}>成长时间线</h3>
        <GrowthTimeline plantId={plant._id!} />
      </div>

      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: 20
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#334155' }}>
          操作记录 ({plantOps.length})
        </h3>
        {plantOps.length === 0 ? (
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
            还没有操作记录
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plantOps
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(op => (
                <div key={op._id} style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 8
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0
                  }}>
                    {op.type === 'water' ? '💧' :
                     op.type === 'fertilize' ? '🌿' :
                     op.type === 'repot' ? '🪴' :
                     op.type === 'prune' ? '✂️' : '📝'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#334155' }}>
                        {getOperationLabel(op.type)}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
                        {new Date(op.date).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    {op.note && (
                      <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>{op.note}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

const AppLayout: React.FC = () => {
  const { reminders } = usePlantManager()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f0fdf4' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ReminderBanner reminders={reminders} />
        <main style={{
          flex: 1,
          padding: 24,
          paddingBottom: 80,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plants" element={<PlantsList />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/add" element={<AddPlantForm />} />
            <Route path="/plant/:id" element={<PlantDetail />} />
          </Routes>
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}

const ResponsiveStyles: React.FC = () => (
  <style>{`
    .tabbar-mobile { display: none; }
    @media (max-width: 768px) {
      .sidebar-desktop { display: none; }
      .tabbar-mobile { display: flex; }
      main { padding: 16px !important; padding-bottom: 80px !important; }
    }
  `}</style>
)

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <>
        <style>{globalStyles}</style>
        <ResponsiveStyles />
        <PlantManagerProvider>
          <AppLayout />
        </PlantManagerProvider>
      </>
    </BrowserRouter>
  )
}

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(<App />)
}

export default App
