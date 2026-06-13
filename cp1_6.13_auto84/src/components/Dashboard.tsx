import React, { useState, useMemo, useEffect } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
  subDays,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { usePetContext } from '../context/PetContext'
import { Task } from '../api'
import TaskModal from './TaskModal'
import AddTaskModal from './AddTaskModal'
import WeeklyReport from './WeeklyReport'

const categoryConfig: Record<string, { color: string; icon: string }> = {
  feeding: { color: '#f97316', icon: '🍽️' },
  walking: { color: '#22c55e', icon: '🐕' },
  medication: { color: '#a855f7', icon: '💊' },
  vet: { color: '#ef4444', icon: '🏥' },
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

  const currentPet = pets.find((p) => p._id === currentPetId)
  const petTasks = getCurrentPetTasks()

  useEffect(() => {
    if (notificationSettings?.weeklyReportEnabled) {
      const today = new Date()
      const dayOfWeek = today.getDay()
      if (dayOfWeek === 1) {
        const stored = localStorage.getItem('lastReportDate')
        const todayStr = format(today, 'yyyy-MM-dd')
        if (stored !== todayStr) {
          setShowReport(true)
          localStorage.setItem('lastReportDate', todayStr)
        }
      }
    }
  }, [notificationSettings])

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
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🐾</div>
        <h2 style={{ color: '#64748b', margin: '0 0 8px 0' }}>欢迎使用 PetCarePlanner</h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>请先在左侧添加您的毛孩子档案开始使用</p>
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
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px' }}>🍽️</div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>本周喂食</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f97316' }}>{weekStats.feedingCount} 次</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px' }}>🐕</div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>遛弯时长</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#22c55e' }}>{weekStats.walkingMinutes} 分钟</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px' }}>💊</div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>用药次数</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#a855f7' }}>{weekStats.medicationCount} 次</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px' }}>🏥</div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>就诊预约</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444' }}>{weekStats.vetCount} 次</div>
          </div>
        </div>
      </div>

      <div style={weekNavStyle}>
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
                borderTop: isTodayCard ? '4px solid #f59e0b' : '4px solid transparent',
                paddingTop: isTodayCard ? '12px' : '16px',
                animation: `fadeInUp 0.4s ease-out ${dayIndex * 0.06}s both`,
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

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dayTasks.map((task, taskIndex) => {
                  const config = categoryConfig[task.category] || categoryConfig.feeding
                  return (
                    <div
                      key={task._id}
                      onClick={() => handleTaskClick(task)}
                      style={{
                        ...taskItemStyle,
                        animation: `fadeInUp 0.3s ease-out ${0.1 + taskIndex * 0.05}s both`,
                        opacity: task.completed ? 0.5 : 1,
                      }}
                      className="task-item"
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
                          fontSize: '16px',
                        }}
                      >
                        {config.icon}
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
  flex: 1,
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
  animation: 'fadeInUp 0.4s ease-out 0.05s both',
}

const weekNavStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
  gap: '8px',
  animation: 'fadeInUp 0.4s ease-out 0.1s both',
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
}

const calendarContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 200px)',
  gap: '16px',
  justifyContent: 'center',
}

const dayCardStyle: React.CSSProperties = {
  width: '200px',
  height: '280px',
  background: '#ffffff',
  borderRadius: '12px',
  padding: '16px 14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}

const taskItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px',
  borderRadius: '10px',
  background: '#f8fafc',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
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
}

export default Dashboard
