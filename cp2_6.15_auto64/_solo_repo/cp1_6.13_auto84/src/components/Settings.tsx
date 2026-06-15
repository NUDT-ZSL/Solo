import React, { useState } from 'react'
import { usePetContext } from '../context/PetContext'

const warmReminders = [
  '今天记得多陪陪毛孩子哦',
  '记得给毛孩子换干净的饮用水呀',
  '今天天气不错，带毛孩子出去晒晒太阳吧',
  '毛孩子的小窝需要定期清洁哦',
  '记得检查毛孩子的指甲是否需要修剪',
  '给毛孩子梳梳毛，增进感情的同时还能减少掉毛',
  '别忘了给毛孩子准备小零食作为奖励哦',
]

const Settings: React.FC = () => {
  const { notificationSettings, updateNotificationSettings, pets, getCurrentPetTasks } = usePetContext()
  const [flashField, setFlashField] = useState<string | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  const timeOptions = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      timeOptions.push(time)
    }
  }

  const handleReminderTimeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTime = e.target.value
    await updateNotificationSettings({ defaultReminderTime: newTime })
    setFlashField('reminderTime')
    setTimeout(() => setFlashField(null), 1500)
    scheduleDailyNotification(newTime)
  }

  const handleWeeklyReportToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateNotificationSettings({ weeklyReportEnabled: e.target.checked })
    setFlashField('weeklyReport')
    setTimeout(() => setFlashField(null), 1500)
  }

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('当前浏览器不支持通知功能')
      return
    }
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') {
      scheduleDailyNotification(notificationSettings?.defaultReminderTime || '08:00')
      new Notification('🐾 PetCarePlanner', {
        body: '通知权限已开启！每天会定时提醒你照顾毛孩子~',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E🐾%3C/text%3E%3C/svg%3E',
      })
    }
  }

  const scheduleDailyNotification = (time: string) => {
    if (typeof window === 'undefined') return
    const key = 'petDailyNotifScheduled'
    if (localStorage.getItem(key) === time) return
    localStorage.setItem(key, time)

    const checkAndNotify = () => {
      const now = new Date()
      const [h, m] = time.split(':').map(Number)
      const todayStr = now.toDateString()
      const lastKey = 'petLastNotifDate'

      if (
        now.getHours() === h &&
        now.getMinutes() >= m &&
        now.getMinutes() < m + 5 &&
        localStorage.getItem(lastKey) !== todayStr
      ) {
        localStorage.setItem(lastKey, todayStr)
        sendDailyReminder()
      }
    }

    const sendDailyReminder = () => {
      if (Notification.permission !== 'granted') return
      const today = new Date().toISOString().split('T')[0]
      const tasks = getCurrentPetTasks().filter((t) => t.date === today)

      let title = '🐾 PetCarePlanner 温馨提醒'
      let body = ''
      const petName = pets.find((p) => p._id)?.name || '毛孩子'

      if (tasks.length === 0) {
        body = warmReminders[Math.floor(Math.random() * warmReminders.length)]
        title = `🐾 ${petName}的今日提醒`
      } else {
        const pending = tasks.filter((t) => !t.completed).length
        title = `🐾 今天有${tasks.length}项${petName}的待办任务`
        const previewTasks = tasks.slice(0, 3).map((t) => `• ${t.time} ${t.title}`)
        body = previewTasks.join('\n') + (tasks.length > 3 ? `\n...等${pending}项待完成` : '')
      }

      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E🐾%3C/text%3E%3C/svg%3E',
        tag: 'pet-daily-reminder',
      })
    }

    setInterval(checkAndNotify, 60000)
    setTimeout(checkAndNotify, 2000)
  }

  if (!notificationSettings) return null

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: 700 }}>
            ⚙️ 设置
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            自定义你的宠物管家偏好
          </p>
        </div>
      </header>

      <div style={contentStyle}>
        <section
          style={sectionStyle}
          className="fade-in-up-section"
        >
          <div style={sectionHeaderStyle}>
            <div style={{ fontSize: '22px' }}>🔔</div>
            <div>
              <h2 style={sectionTitleStyle}>通知设置</h2>
              <p style={sectionDescStyle}>配置每日提醒和通知选项</p>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={fieldContainerStyle}>
              <div>
                <div style={fieldLabelStyle}>浏览器通知权限</div>
                <div style={fieldDescStyle}>
                  {notifPermission === 'granted'
                    ? '✅ 通知权限已开启'
                    : notifPermission === 'denied'
                    ? '❌ 通知权限已拒绝，请在浏览器设置中开启'
                    : '⏳ 尚未授权'}
                </div>
              </div>
              {notifPermission !== 'granted' && (
                <button
                  onClick={requestNotificationPermission}
                  style={primaryButtonStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#d97706')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f59e0b')}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  开启通知
                </button>
              )}
            </div>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '16px 0' }} />

            <div style={fieldContainerStyle}>
              <div style={{ flex: 1 }}>
                <div style={fieldLabelStyle}>任务默认提醒时间</div>
                <div style={fieldDescStyle}>每天在此时检查当天任务并推送提醒</div>
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={notificationSettings.defaultReminderTime}
                  onChange={handleReminderTimeChange}
                  style={{
                    ...selectStyle,
                    border: flashField === 'reminderTime' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    boxShadow: flashField === 'reminderTime' ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '16px 0' }} />

            <div style={fieldContainerStyle}>
              <div style={{ flex: 1 }}>
                <div style={fieldLabelStyle}>每周健康报告</div>
                <div style={fieldDescStyle}>每周一早上生成上周健康数据总结卡片</div>
              </div>
              <label style={switchLabelStyle}>
                <input
                  type="checkbox"
                  checked={notificationSettings.weeklyReportEnabled}
                  onChange={handleWeeklyReportToggle}
                  style={checkboxHiddenStyle}
                />
                <div
                  style={{
                    ...switchTrackStyle,
                    background: notificationSettings.weeklyReportEnabled ? '#f59e0b' : '#cbd5e1',
                    border: flashField === 'weeklyReport' ? '2px solid #16a34a' : '2px solid transparent',
                    boxShadow: flashField === 'weeklyReport' ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      ...switchThumbStyle,
                      transform: notificationSettings.weeklyReportEnabled
                        ? 'translateX(24px)'
                        : 'translateX(2px)',
                    }}
                  />
                </div>
              </label>
            </div>
          </div>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.05s' }} className="fade-in-up-section">
          <div style={sectionHeaderStyle}>
            <div style={{ fontSize: '22px' }}>🎨</div>
            <div>
              <h2 style={sectionTitleStyle}>外观主题</h2>
              <p style={sectionDescStyle}>温暖清新的橙黄配色方案</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', padding: '0 20px' }}>
            {[
              { color: '#f59e0b', label: '主色' },
              { color: '#fff7ed', label: '背景' },
              { color: '#f97316', label: '喂食' },
              { color: '#22c55e', label: '遛狗' },
              { color: '#a855f7', label: '用药' },
              { color: '#ef4444', label: '兽医' },
            ].map((item) => (
              <div
                key={item.color}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: item.color,
                    border: item.color === '#fff7ed' ? '1px solid #fed7aa' : 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  }}
                />
                <div style={{ fontSize: '11px', color: '#64748b' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.1s' }} className="fade-in-up-section">
          <div style={sectionHeaderStyle}>
            <div style={{ fontSize: '22px' }}>💡</div>
            <div>
              <h2 style={sectionTitleStyle}>使用提示</h2>
              <p style={sectionDescStyle}>一些实用的小技巧</p>
            </div>
          </div>
          <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              '点击日卡片上的空白区域可以快速添加当天任务',
              '点击任务条可以查看详情、标记完成或删除',
              '使用顶部的"今天"按钮可以快速回到本周',
              '每周报告会在周一自动弹出，也可以手动点击"周报"按钮查看',
            ].map((tip, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  background: '#fef9c3',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#854d0e',
                  border: '1px solid #fde047',
                }}
              >
                💡 {tip}
              </div>
            ))}
          </div>
        </section>
      </div>
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

const headerStyle: React.CSSProperties = {
  marginBottom: '24px',
  animation: 'fadeInUp 0.4s ease-out both',
}

const contentStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
}

const sectionStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  overflow: 'hidden',
  animation: 'fadeInUp 0.4s ease-out both',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '20px 20px 12px 20px',
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '17px',
  color: '#1e293b',
  fontWeight: 700,
}

const sectionDescStyle: React.CSSProperties = {
  margin: '2px 0 0 0',
  fontSize: '12px',
  color: '#64748b',
}

const cardStyle: React.CSSProperties = {
  padding: '8px 20px 20px 20px',
}

const fieldContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  gap: '16px',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1e293b',
}

const fieldDescStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '3px',
}

const selectStyle: React.CSSProperties = {
  padding: '10px 36px 10px 14px',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  fontFamily: 'inherit',
  background: '#fafafa',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8.5L1.5 4h9z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
}

const switchLabelStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  cursor: 'pointer',
}

const checkboxHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  opacity: 0,
  width: 0,
  height: 0,
}

const switchTrackStyle: React.CSSProperties = {
  width: '52px',
  height: '28px',
  borderRadius: '14px',
  transition: 'all 0.2s ease',
  position: 'relative',
}

const switchThumbStyle: React.CSSProperties = {
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  background: 'white',
  position: 'absolute',
  top: '1px',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
}

const primaryButtonStyle: React.CSSProperties = {
  background: '#f59e0b',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
}

export default Settings
