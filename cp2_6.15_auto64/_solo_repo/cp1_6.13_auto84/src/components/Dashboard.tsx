import React, { useState, useMemo, useEffect } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { usePetContext } from '../context/PetContext'
import { Task } from '../api'
import TaskModal from './TaskModal'
import AddTaskModal from './AddTaskModal'
import WeeklyReport from './WeeklyReport'

const categoryConfig: Record<string, { color: string; svg: React.ReactNode }> = {
  feeding: {
    color: '#f97316',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C13.1046 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 10.8954 2 12 2Z" fill="white"/>
        <path d="M5 11C5 8.79086 6.79086 7 9 7H15C17.2091 7 19 8.79086 19 11V17C19 19.2091 17.2091 21 15 21H9C6.79086 21 5 19.2091 5 17V11Z" fill="white"/>
        <path d="M12 7V21M12 11H5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  walking: {
    color: '#22c55e',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="13" cy="4" r="2.5" fill="white"/>
        <path d="M9 20L10 14L7 17L4 19L5 20L7 19.5L9 20Z" fill="white"/>
        <path d="M13 6C11 7 10 9 10 12L12 13L14 18L17 17L16 12L18 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  medication: {
    color: '#a855f7',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="10" width="18" height="8" rx="4" transform="rotate(-45 3 10)" fill="white"/>
        <path d="M9.5 14.5L14.5 9.5" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  vet: {
    color: '#ef4444',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.5 8.5L21 9L16 14L17.5 21L12 17.5L6.5 21L8 14L3 9L9.5 8.5L12 2Z" fill="white"/>
        <path d="M12 10V15M9.5 12.5H14.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
}

const weekDaysNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const Dashboard: React.FC = () => {
  const { pets, currentPetId, getCurrentPetTasks, notificationSettings } = usePetContext()
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showReport, setShowReport] = useState(false)
  const [mounted, setMounted] = useState(false)

  const currentPet = pets.find((p) => p._id === currentPetId)
  const petTasks = getCurrentPetTasks()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (notificationSettings?.weeklyReportEnabled && mounted) {
      const today = new Date()
      const dayOfWeek = today.getDay()
      if (dayOfWeek === 1) {
        const stored = localStorage.getItem('lastReportDate')
        const todayStr = format(today, 'yyyy-MM-dd')
        if (stored !== todayStr) {
          setTimeout(() => {
            setShowReport(true)
          }, 1000)
          localStorage.setItem('lastReportDate', todayStr)
        }
      }
    }
  }, [notificationSettings, mounted])

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    })
  }, [currentWeekStart])

  const goToPrevWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1))
  const goToNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1))
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return petTasks
      .filter((t) => t.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time))
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleAddTask = (dateStr: string) => {
    setSelectedDate(dateStr)
    setShowAddTaskModal(true)
  }

  const weekStats = useMemo(() => {
    let feedingCount = 0
    let walkingMinutes = 0
    let medicationCount = 0
    let vetCount = 0
    const weekStart = currentWeekStart
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

    petTasks.forEach((t) => {
      const taskDate = parseISO(t.date)
      if (taskDate >= weekStart && taskDate <= weekEnd) {
        switch (t.category) {
          case 'feeding':
            feedingCount++
            break
          case 'walking':
            walkingMinutes += 30
            break
          case 'medication':
            medicationCount++
            break
          case 'vet':
            vetCount++
            break
        }
      }
    })
    return { feedingCount, walkingMinutes, medicationCount, vetCount }
  }, [petTasks, currentWeekStart])

  if (!currentPet) {
    return (
      <div style={emptyContainerStyle}>
        <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>🐾</div>
        <h2 style={{ color: '#64748b', margin: '0 0 8px 0', animation: 'fadeInUp 0.4s ease-out 0.15s both' }}>
          欢迎使用 PetCarePlanner
        </h2>
        <p style={{ color: '#94a3b8', margin: 0, animation: 'fadeInUp 0.4s ease-out 0.2s both' }}>
          请先在左侧添加您的毛孩子档案开始使用
        </p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>当前宠物</div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: 700 }}>
              {currentPet.name} 的日常计划
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowReport(true)}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            📊 周报
          </button>
          <button
            onClick={() => setShowAddTaskModal(true)}
            style={primaryButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#d97706')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f59e0b')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            + 新建任务
          </button>
        </div>
      </header>

      <div style={statsContainerStyle}>
        {[
          { emoji: '🍽️', label: '本周喂食', value: weekStats.feedingCount, unit: '次', color: '#f97316', delay: 0.05 },
          { emoji: '🐕', label: '遛弯时长', value: weekStats.walkingMinutes, unit: '分钟', color: '#22c55e', delay: 0.1 },
          { emoji: '💊', label: '用药次数', value: weekStats.medicationCount, unit: '次', color: '#a855f7', delay: 0.15 },
          { emoji: '🏥', label: '就诊预约', value: weekStats.vetCount, unit: '次', color: '#ef4444', delay: 0.2 },
        ].map((stat) => (
          <div key={stat.label} style={{ ...statCardStyle, animation: `fadeInUp 0.4s ease-out ${stat.delay}s both` }}>
            <div style={{ fontSize: '28px' }}>{stat.emoji}</div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stat.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>
                {stat.value} {stat.unit}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...weekNavStyle, animation: 'fadeInUp 0.4s ease-out 0.25s both' }}>
        <button
          onClick={goToPrevWeek}
          style={navButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ←
        </button>
        <button
          onClick={goToToday}
          style={{
            ...navButtonStyle,
            background: '#fef3c7',
            color: '#d97706',
            fontWeight: 600,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#fde68a')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fef3c7')}
        >
          今天
        </button>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 12px' }}>
          {format(weekDays[0], 'yyyy年M月d日', { locale: zhCN })} - {format(weekDays[6], 'M月d日', { locale: zhCN })}
        </div>
        <button
          onClick={goToNextWeek}
          style={navButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          →
        </button>
      </div>

      <div style={calendarContainerStyle} className="calendar-container">
        {weekDays.map((day, dayIndex) => {
          const dayTasks = getTasksForDate(day)
          const dateStr = format(day, 'yyyy-MM-dd')
          const isTodayCard = isToday(day)
          const completedCount = dayTasks.filter((t) => t.completed).length

          return (
            <div
              key={dateStr}
              style={{
                ...dayCardStyle,
                width: '200px',
                minWidth: '200px',
                maxWidth: '200px',
                height: '280px',
                minHeight: '280px',
                maxHeight: '280px',
                borderTop: isTodayCard ? '4px solid #f59e0b' : '4px solid transparent',
                paddingTop: isTodayCard ? '12px' : '16px',
                animation: `fadeInUp 0.4s ease-out ${0.3 + dayIndex * 0.06}s both`,
                boxSizing: 'border-box',
              }}
              className="day-card"
            >
              <div
                style={{
                  textAlign: 'center',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                >
                  {weekDaysNames[day.getDay()]}
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: isTodayCard ? '#f59e0b' : '#1e293b',
                    lineHeight: 1,
                  }}
                >
                  {format(day, 'd')}
                </div>
                {dayTasks.length > 0 && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      color: completedCount === dayTasks.length ? '#16a34a' : '#64748b',
                      fontWeight: 500,
                    }}
                  >
                    {completedCount}/{dayTasks.length} 完成
                  </div>
                )}
              </div>

              <div style={{ flex: '1 1 auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', height: 0 }}>
                {dayTasks.map((task, taskIndex) => {
                  const config = categoryConfig[task.category] || categoryConfig.feeding
                  return (
                    <div
                      key={task._id}
                      onClick={() => handleTaskClick(task)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                        animation: `fadeInUp 0.3s ease-out ${0.45 + taskIndex * 0.05}s both`,
                        opacity: task.completed ? 0.5 : 1,
                      }}
                      className="task-item"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9'
                        e.currentTarget.style.transform = 'translateX(2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          borderRadius: '8px',
                          background: config.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {config.svg}
                      </div>
                      <div style={{ flex: 1, marginLeft: '10px', overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textDecoration: task.completed ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          ⏰ {task.time}
                        </div>
                      </div>
                      {task.completed && (
                        <div style={{ color: '#16a34a', fontSize: '14px', marginLeft: '4px' }}>✓</div>
                      )}
                    </div>
                  )
                })}

                {dayTasks.length === 0 && (
                  <div
                    onClick={() => handleAddTask(dateStr)}
                    style={{
                      textAlign: 'center',
                      padding: '16px 8px',
                      color: '#cbd5e1',
                      fontSize: '12px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      border: '1px dashed #e2e8f0',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fff7ed'
                      e.currentTarget.style.color = '#f59e0b'
                      e.currentTarget.style.borderColor = '#f59e0b'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#cbd5e1'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                    + 添加任务
                  </div>
                )}
              </div>

              {dayTasks.length > 0 && (
                <button
                  onClick={() => handleAddTask(dateStr)}
                  style={addTaskBtnStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff7ed'
                    e.currentTarget.style.color = '#f59e0b'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.color = '#64748b'
                  }}
                >
                  + 添加
                </button>
              )}
            </div>
          )
        })}
      </div>

      <TaskModal task={selectedTask} open={showTaskModal} onClose={() => setShowTaskModal(false)} />
      <AddTaskModal
        open={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        defaultDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
        petId={currentPetId || ''}
      />
      <WeeklyReport open={showReport} onClose={() => setShowReport(false)} />
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  flex: '1 1 auto',
  padding: '24px 28px',
  background: '#fff7ed',
  overflowY: 'auto',
  minHeight: '100vh',
  boxSizing: 'border-box',
}

const emptyContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff7ed',
  minHeight: '100vh',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  animation: 'fadeInUp 0.4s ease-out both',
}

const primaryButtonStyle: React.CSSProperties = {
  background: '#f59e0b',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
}

const secondaryButtonStyle: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#475569',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
}

const statsContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  marginBottom: '20px',
}

const statCardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '16px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}

const weekNavStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
  gap: '8px',
}

const navButtonStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#475569',
  fontSize: '18px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
}

const calendarContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 200px)',
  gap: '16px',
  justifyContent: 'flex-start',
  paddingBottom: '40px',
  overflowX: 'auto',
}

const dayCardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '16px 14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}

const addTaskBtnStyle: React.CSSProperties = {
  marginTop: '10px',
  padding: '6px 12px',
  borderRadius: '8px',
  border: 'none',
  background: '#f8fafc',
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
  flexShrink: 0,
}

export default Dashboard
