import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { PetProvider } from './context/PetContext'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import { usePetContext } from './context/PetContext'

const warmReminders = [
  '今天记得多陪陪毛孩子哦',
  '记得给毛孩子换干净的饮用水呀',
  '今天天气不错，带毛孩子出去晒晒太阳吧',
  '毛孩子的小窝需要定期清洁哦',
  '记得检查毛孩子的指甲是否需要修剪',
  '给毛孩子梳梳毛，增进感情的同时还能减少掉毛',
  '别忘了给毛孩子准备小零食作为奖励哦',
]

const NotificationManager: React.FC = () => {
  const { pets, getCurrentPetTasks, notificationSettings } = usePetContext()

  useEffect(() => {
    if (typeof Notification === 'undefined' || !notificationSettings) return

    const sendDailyReminder = () => {
      if (Notification.permission !== 'granted') return
      const today = new Date().toISOString().split('T')[0]
      const tasks = getCurrentPetTasks().filter((t) => t.date === today)

      let title = '🐾 PetCarePlanner 温馨提醒'
      let body = ''
      const currentPet = pets.find((p) => p._id)
      const petName = currentPet?.name || '毛孩子'

      if (tasks.length === 0) {
        body = warmReminders[Math.floor(Math.random() * warmReminders.length)]
        title = `🐾 ${petName}的今日提醒`
      } else {
        const pending = tasks.filter((t) => !t.completed).length
        title = `🐾 今天有${tasks.length}项${petName}的待办任务`
        const previewTasks = tasks.slice(0, 3).map((t) => `• ${t.time} ${t.title}`)
        body = previewTasks.join('\n') + (tasks.length > 3 ? `\n...等${pending}项待完成` : '')
      }

      try {
        new Notification(title, {
          body,
          icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E🐾%3C/text%3E%3C/svg%3E',
          tag: 'pet-daily-reminder',
          silent: false,
        })
      } catch {}
    }

    const scheduleKey = 'pet_notif_scheduled_' + notificationSettings.defaultReminderTime
    const lastCheckKey = 'pet_last_notif_date'
    const todayStr = new Date().toDateString()

    if (localStorage.getItem(scheduleKey) === 'true' && localStorage.getItem(lastCheckKey) === todayStr) {
      return
    }

    const checkAndNotify = () => {
      const now = new Date()
      const [targetH, targetM] = (notificationSettings.defaultReminderTime || '08:00').split(':').map(Number)
      const todayKey = now.toDateString()

      if (localStorage.getItem(lastCheckKey) === todayKey) {
        return
      }

      if (
        now.getHours() === targetH &&
        now.getMinutes() >= targetM &&
        now.getMinutes() < targetM + 5
      ) {
        localStorage.setItem(lastCheckKey, todayKey)
        sendDailyReminder()
      }
    }

    localStorage.setItem(scheduleKey, 'true')

    checkAndNotify()
    const interval = setInterval(checkAndNotify, 60000)

    return () => clearInterval(interval)
  }, [notificationSettings?.defaultReminderTime, pets.length])

  return null
}

const TopNav: React.FC = () => {
  const location = useLocation()
  const isSettings = location.pathname === '/settings'

  return (
    <div
      className="top-nav"
      style={{
        display: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#ffffff',
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '24px' }}>🐾</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>PetCarePlanner</span>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <Link
          to="/"
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.15s ease',
            color: isSettings ? '#64748b' : 'white',
            background: isSettings ? 'transparent' : '#f59e0b',
          }}
        >
          🏠 首页
        </Link>
        <Link
          to="/settings"
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.15s ease',
            color: isSettings ? 'white' : '#64748b',
            background: isSettings ? '#f59e0b' : 'transparent',
          }}
        >
          ⚙️ 设置
        </Link>
      </div>
    </div>
  )
}

const DesktopTopNav: React.FC = () => {
  const location = useLocation()
  const isSettings = location.pathname === '/settings'

  return (
    <div
      className="desktop-top-nav"
      style={{
        display: 'flex',
        position: 'absolute',
        top: '12px',
        right: '24px',
        zIndex: 50,
        gap: '6px',
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(8px)',
        padding: '6px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <Link
        to="/"
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.15s ease',
          color: isSettings ? '#64748b' : 'white',
          background: isSettings ? 'transparent' : '#f59e0b',
        }}
        onMouseEnter={(e) => {
          if (isSettings) e.currentTarget.style.background = '#f1f5f9'
        }}
        onMouseLeave={(e) => {
          if (isSettings) e.currentTarget.style.background = 'transparent'
        }}
      >
        🏠 仪表盘
      </Link>
      <Link
        to="/settings"
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.15s ease',
          color: isSettings ? 'white' : '#64748b',
          background: isSettings ? '#f59e0b' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isSettings) e.currentTarget.style.background = '#f1f5f9'
        }}
        onMouseLeave={(e) => {
          if (!isSettings) e.currentTarget.style.background = 'transparent'
        }}
      >
        ⚙️ 设置
      </Link>
    </div>
  )
}

const MainLayout: React.FC = () => {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .top-nav { display: flex !important; }
          .desktop-top-nav { display: none !important; }
        }
        @media (min-width: 769px) {
          .top-nav { display: none !important; }
        }
      `}</style>
      <Sidebar />
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopNav />
        <DesktopTopNav />
        <NotificationManager />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </>
  )
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PetProvider>
        <MainLayout />
      </PetProvider>
    </BrowserRouter>
  )
}

export default App
