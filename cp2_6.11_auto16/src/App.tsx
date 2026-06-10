import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import CanvasArea from './components/CanvasArea'
import TimeLine from './components/TimeLine'
import { analyzeEmotion, type EmotionAnalysisResult } from './utils/emotionAnalyzer'

interface MoodRecord {
  id: string
  userId: string
  date: string
  text: string
  emotionResult: EmotionAnalysisResult
  drawings: DrawingLine[]
  createdAt: number
  shareId?: string
}

interface DrawingLine {
  id: string
  points: { x: number; y: number }[]
  color: string
  width: number
}

interface User {
  id: string
  username: string
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<MoodRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<MoodRecord | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [dailyRemaining, setDailyRemaining] = useState(3)
  const [isViewingShared, setIsViewingShared] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isRegister, setIsRegister] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/art/')) {
      const shortId = path.replace('/art/', '')
      fetchSharedArt(shortId)
    }
  }, [])

  const fetchSharedArt = async (shortId: string) => {
    try {
      const response = await fetch(`/api/share/${shortId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedRecord(data.record)
        setIsViewingShared(true)
        setShowLogin(false)
      }
    } catch (err) {
      console.error('Failed to fetch shared art:', err)
    }
  }

  const loadRecords = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/moods?userId=${userId}&limit=30`)
      if (response.ok) {
        const data = await response.json()
        setRecords(data)
        if (data.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0]
          const todayRecord = data.find((r: MoodRecord) => r.date === todayStr)
          setSelectedRecord(todayRecord || data[0])
          if (todayRecord) {
            setCurrentDate(todayRecord.date)
            setInputText(todayRecord.text)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load records:', err)
    }
  }, [])

  const loadDailyStats = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/user/stats?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setDailyRemaining(data.dailyRemaining)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }, [])

  const handleLogin = async () => {
    setLoginError('')
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser({ id: data.userId, username: data.username })
        setShowLogin(false)
        loadRecords(data.userId)
        loadDailyStats(data.userId)
      } else {
        const err = await response.json()
        setLoginError(err.error || '登录失败')
      }
    } catch (err) {
      setLoginError('网络错误，请稍后重试')
    }
  }

  const handleGenerate = async () => {
    if (!inputText.trim() || !user || dailyRemaining <= 0 || isGenerating) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, userId: user.id }),
      })

      if (response.ok) {
        const record: MoodRecord = await response.json()
        setSelectedRecord(record)
        setDailyRemaining((prev) => Math.max(0, prev - 1))
        setRecords((prev) => {
          const existingIndex = prev.findIndex((r) => r.id === record.id)
          if (existingIndex >= 0) {
            const newRecords = [...prev]
            newRecords[existingIndex] = record
            return newRecords
          }
          return [record, ...prev]
        })
      } else if (response.status === 429) {
        setDailyRemaining(0)
      }
    } catch (err) {
      console.error('Failed to generate:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    const ripple = document.createElement('span')
    ripple.className = 'ripple-effect'
    ripple.style.position = 'absolute'
    ripple.style.borderRadius = '50%'
    ripple.style.background = 'rgba(255, 255, 255, 0.4)'
    ripple.style.left = `${x - 10}px`
    ripple.style.top = `${y - 10}px`
    ripple.style.width = '20px'
    ripple.style.height = '20px'
    ripple.style.transform = 'scale(0)'
    ripple.style.animation = 'ripple 400ms ease-out forwards'
    ripple.style.pointerEvents = 'none'
    button.appendChild(ripple)

    setTimeout(() => {
      ripple.remove()
    }, 400)

    handleGenerate()
  }

  const handleDateSelect = (date: string) => {
    setCurrentDate(date)
    const record = records.find((r) => r.date === date)
    if (record) {
      setSelectedRecord(record)
      setInputText(record.text)
    } else {
      setSelectedRecord(null)
      setInputText('')
    }
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleSaveDrawings = async (drawings: DrawingLine[]) => {
    if (!selectedRecord) return
    try {
      await fetch(`/api/moods/${selectedRecord.id}/drawings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawings }),
      })
      setRecords((prev) =>
        prev.map((r) => (r.id === selectedRecord.id ? { ...r, drawings } : r))
      )
    } catch (err) {
      console.error('Failed to save drawings:', err)
    }
  }

  const handleShare = async () => {
    if (!selectedRecord) return
    try {
      const response = await fetch(`/api/share/${selectedRecord.id}`, {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        const shareUrl = `${window.location.origin}${data.shareUrl}`
        navigator.clipboard.writeText(shareUrl)
        alert('分享链接已复制到剪贴板！')
      }
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  const loadMoreDays = async (direction: 'before' | 'after') => {
    if (!user) return
    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date))
    if (sortedRecords.length === 0) return

    const referenceDate = direction === 'before' 
      ? sortedRecords[0].date 
      : sortedRecords[sortedRecords.length - 1].date
    
    const date = new Date(referenceDate)
    date.setDate(date.getDate() + (direction === 'before' ? -8 : 8))
    const targetDate = date.toISOString().split('T')[0]

    const newRecords: MoodRecord[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(targetDate)
      d.setDate(d.getDate() + (direction === 'before' ? i : -i))
      const dateStr = d.toISOString().split('T')[0]
      const existing = records.find((r) => r.date === dateStr)
      if (!existing && dateStr !== new Date().toISOString().split('T')[0]) {
        const sampleTexts = [
          '平静的一天，没什么特别的事情发生。',
          '今天感觉还不错，生活很充实。',
          '有点小郁闷，希望明天会更好。',
          '工作很忙，但很有成就感。',
          '和家人一起度过了美好的时光。',
        ]
        const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)]
        const result = analyzeEmotion(text, d.getTime())
        newRecords.push({
          id: `demo-${dateStr}`,
          userId: user.id,
          date: dateStr,
          text,
          emotionResult: result,
          drawings: [],
          createdAt: d.getTime(),
        })
      }
    }

    setRecords((prev) => {
      const combined = [...prev, ...newRecords]
      return combined.sort((a, b) => b.date.localeCompare(a.date))
    })
  }

  if (showLogin && !isViewingShared) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>情绪调色盘</h1>
          <p style={styles.loginSubtitle}>用色彩记录你的每一天</p>
          
          {loginError && <div style={styles.loginError}>{loginError}</div>}
          
          <input
            type="text"
            placeholder="用户名"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            style={styles.loginInput}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <input
            type="password"
            placeholder="密码"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            style={styles.loginInput}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          
          <button style={styles.loginButton} onClick={handleLogin}>
            {isRegister ? '注册' : '登录'}
          </button>
          
          <p style={styles.switchText}>
            {isRegister ? '已有账号？' : '没有账号？'}
            <span
              style={styles.switchLink}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? '去登录' : '去注册'}
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.appContainer}>
      {isMobile && (
        <button
          style={styles.hamburgerButton}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
      )}

      <div
        style={{
          ...styles.sidebarWrapper,
          width: isMobile ? '100%' : 280,
          flexShrink: 0,
          ...(isMobile
            ? {
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 'auto',
                maxHeight: '70%',
                zIndex: 50,
                transform: sidebarOpen ? 'translateY(0)' : 'translateY(calc(100% - 120px))',
                transition: 'transform 0.3s ease-in-out',
              }
            : {
                position: 'relative',
                zIndex: 10,
              }),
        }}
      >
        <Sidebar
          records={records}
          currentDate={currentDate}
          onDateSelect={handleDateSelect}
          isMobile={isMobile}
          user={user}
        />
      </div>

      <div style={{ ...styles.mainContent, flex: 1, minWidth: 0 }}>
        {!isViewingShared && (
          <div style={styles.inputSection}>
            <input
              type="text"
              placeholder="今天，你的心情像什么颜色？"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={styles.inputField}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={dailyRemaining <= 0}
            />
            <button
              style={{
                ...styles.generateButton,
                ...(dailyRemaining <= 0 || !inputText.trim() || isGenerating
                  ? styles.generateButtonDisabled
                  : {}),
              }}
              onClick={handleGenerateClick}
              onMouseEnter={(e) => {
                if (!(dailyRemaining <= 0 || !inputText.trim() || isGenerating)) {
                  e.currentTarget.style.filter = 'brightness(1.2)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)'
              }}
              disabled={dailyRemaining <= 0 || !inputText.trim() || isGenerating}
            >
              {isGenerating
                ? '生成中...'
                : dailyRemaining <= 0
                ? '今日配额已用完'
                : '生成'}
            </button>
            {selectedRecord && !isViewingShared && (
              <button style={styles.shareButton} onClick={handleShare}>
                分享
              </button>
            )}
          </div>
        )}

        <div style={styles.canvasWrapper}>
          <CanvasArea
            record={selectedRecord}
            isViewingShared={isViewingShared}
            onSaveDrawings={handleSaveDrawings}
          />
        </div>

        {!isViewingShared && (
          <TimeLine
            records={records}
            currentDate={currentDate}
            onDateSelect={handleDateSelect}
            onLoadMore={loadMoreDays}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
  },
  sidebarWrapper: {
    width: 280,
    minWidth: 280,
    maxWidth: 280,
    flexShrink: 0,
    position: 'relative',
    zIndex: 10,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
    gap: '16px',
    minWidth: 0,
  },
  inputSection: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
  },
  inputField: {
    width: '100%',
    maxWidth: 400,
    padding: '12px 20px',
    borderRadius: 25,
    border: 'none',
    fontSize: '15px',
    background: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    outline: 'none',
    transition: 'box-shadow 0.3s ease',
  },
  generateButton: {
    padding: '12px 32px',
    borderRadius: 25,
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #4B6CB7 0%, #B57EDC 100%)',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(75, 108, 183, 0.4)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  generateButtonDisabled: {
    background: '#999',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  shareButton: {
    padding: '10px 20px',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    fontSize: '14px',
    color: 'white',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  canvasWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  hamburgerButton: {
    position: 'fixed',
    top: 15,
    left: 15,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 12,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    fontSize: 24,
    cursor: 'pointer',
  },
  loginContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
  },
  loginBox: {
    width: '100%',
    maxWidth: 380,
    padding: '40px 32px',
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  loginInput: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: 16,
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  loginButton: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    fontSize: 16,
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #4B6CB7 0%, #B57EDC 100%)',
    cursor: 'pointer',
    marginTop: 8,
  },
  loginError: {
    padding: '10px',
    marginBottom: 16,
    borderRadius: 8,
    background: 'rgba(255, 107, 107, 0.2)',
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  switchText: {
    marginTop: 20,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  switchLink: {
    color: '#B57EDC',
    cursor: 'pointer',
    marginLeft: 4,
    fontWeight: 500,
  },
}
