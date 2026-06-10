import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import {
  Echo,
  User,
  EchoNotification,
  registerUser,
  getEchoes,
  getUserEchoes,
  deleteEcho as apiDeleteEcho,
  updateEcho as apiUpdateEcho,
  scanNearby,
  getEchoSummary,
  getInitials,
  generateMockEchoes,
  formatTime
} from './utils'
import { BubbleEchoCard, ProfileEchoCard } from './EchoCard'

declare const L: any

const DEFAULT_LAT = 31.2304
const DEFAULT_LNG = 121.4737
const STORAGE_KEY = 'echo-memo-user'

function Navbar({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <nav className="navbar">
      <div className="logo">
        <div className="logo-icon">🌊</div>
        <span>回声备忘录</span>
      </div>
      <div className="nav-links">
        <NavLink to="/map" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          🗺️ 地图
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          👤 我的回声
        </NavLink>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="user-badge">
          <div className="user-avatar">{getInitials(user.username)}</div>
          <span>{user.username}</span>
        </div>
        <button className="icon-btn" title="退出登录" onClick={onLogout}>🚪</button>
      </div>
    </nav>
  )
}

function NotificationBanner({
  notification,
  onClose,
  onClick
}: {
  notification: EchoNotification
  onClose: () => void
  onClick: () => void
}) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 3600)
    const t2 = setTimeout(onClose, 4000)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
    }
  }, [onClose])

  return (
    <div
      className={'notification-banner' + (leaving ? ' leaving' : '')}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('notif-close')) return
        onClick()
      }}
    >
      <div className="notif-content">
        <div className="notif-icon">🔔</div>
        <div className="notif-text">
          <div className="notif-title">{notification.title}</div>
          <div className="notif-sub">
            距离你约 {Math.round(notification.distance)} 米 · {formatTime(notification.timestamp)}
          </div>
        </div>
      </div>
      <button className="notif-close" onClick={(e) => { e.stopPropagation(); onClose() }}>×</button>
    </div>
  )
}

function ViewEchoBubble({
  echo,
  onClose
}: {
  echo: Echo
  onClose: () => void
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlay = () => {
    if (echo.contentType !== 'audio') return
    if (!audioRef.current) {
      audioRef.current = new Audio(echo.content)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  return (
    <div className="bubble-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
          {getInitials(echo.username)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{echo.username}</div>
          <div style={{ fontSize: 11, color: 'var(--glass-text-muted)' }}>
            {formatTime(echo.createdAt)} · 📍 {echo.locationName}
          </div>
        </div>
      </div>

      {echo.contentType === 'audio' ? (
        <div className="echo-card-audio" style={{ marginBottom: 14 }}>
          <button className="play-btn" onClick={handlePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="static-waveform">
            {(echo.waveformData?.length ? echo.waveformData : Array(32).fill(0.4)).map((h, i) => (
              <div
                key={i}
                className="static-bar"
                style={{ height: `${Math.max(3, h * 36)}px`, opacity: 0.7 + h * 0.3 }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="echo-text-preview" style={{ fontSize: 15 }}>{echo.content}</div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}

function MapPage({
  user,
  notifications,
  dismissNotification,
  jumpToEcho,
  allEchoes,
  reloadEchoes
}: {
  user: User
  notifications: EchoNotification[]
  dismissNotification: (id: string) => void
  jumpToEcho: (echo: Echo) => void
  allEchoes: Echo[]
  reloadEchoes: () => void
}) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const bubblePopupRef = useRef<any>(null)

  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number }>({
    lat: user.currentLat || DEFAULT_LAT,
    lng: user.currentLng || DEFAULT_LNG
  })
  const [bubbleState, setBubbleState] = useState<{
    mode: 'create' | 'view' | 'record-create'
    lat: number
    lng: number
    echo?: Echo
    audioData?: { base64: string; duration: number; waveform: number[] } | null
    contentType?: 'audio' | 'text'
  } | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const recordStateRef = useRef<{
    mediaRecorder: MediaRecorder | null
    audioContext: AudioContext | null
    analyser: AnalyserNode | null
    stream: MediaStream | null
    startTime: number
    chunks: BlobPart[]
    animationId: number
  }>({
    mediaRecorder: null, audioContext: null, analyser: null, stream: null,
    startTime: 0, chunks: [], animationId: 0
  })

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: [currentPos.lat, currentPos.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map)
    mapRef.current = map

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#40E0D0,#FFA500);border:3px solid #fff;box-shadow:0 0 12px rgba(64,224,208,0.8);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
    L.marker([currentPos.lat, currentPos.lng], { icon: userIcon }).addTo(map)

    map.on('click', (e: any) => {
      if (bubblePopupRef.current) {
        mapRef.current.removeLayer(bubblePopupRef.current)
        bubblePopupRef.current = null
      }
      setBubbleState({
        mode: 'create',
        lat: e.latlng.lat,
        lng: e.latlng.lng
      })
    })

    reloadEchoes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderMarkers = useCallback((echoes: Echo[]) => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => mapRef.current.removeLayer(m))
    markersRef.current.clear()

    echoes.forEach(echo => {
      const summary = getEchoSummary(echo)
      const icon = L.divIcon({
        className: '',
        html: `<div class="echo-marker"><span class="tooltip">${summary.replace(/"/g, '&quot;')}</span></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
      })
      const marker = L.marker([echo.latitude, echo.longitude], { icon }).addTo(mapRef.current)
      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e)
        if (bubblePopupRef.current) {
          mapRef.current.removeLayer(bubblePopupRef.current)
          bubblePopupRef.current = null
        }
        setBubbleState({ mode: 'view', lat: echo.latitude, lng: echo.longitude, echo })
      })
      markersRef.current.set(echo.id, marker)
    })
  }, [])

  useEffect(() => {
    renderMarkers(allEchoes)
  }, [allEchoes, renderMarkers])

  useEffect(() => {
    if (!bubbleState || !mapRef.current) return
    const { lat, lng, mode, echo, audioData, contentType } = bubbleState

    if (bubblePopupRef.current) {
      mapRef.current.removeLayer(bubblePopupRef.current)
      bubblePopupRef.current = null
    }

    const container = document.createElement('div')
    container.style.padding = '4px'
    const root = ReactDOM.createRoot(container)
    root.render(
      mode === 'view' && echo ? (
        <ViewEchoBubble echo={echo} onClose={() => {
          if (bubblePopupRef.current) {
            mapRef.current.removeLayer(bubblePopupRef.current)
            bubblePopupRef.current = null
          }
          setBubbleState(null)
        }} />
      ) : (
        <BubbleEchoCard
          latitude={lat}
          longitude={lng}
          currentUserId={user.id}
          currentUsername={user.username}
          initialContentType={contentType || 'text'}
          initialAudioData={audioData || null}
          onSave={async (saved) => {
            if (bubblePopupRef.current) {
              mapRef.current.removeLayer(bubblePopupRef.current)
              bubblePopupRef.current = null
            }
            setBubbleState(null)
            reloadEchoes()
          }}
          onCancel={() => {
            if (bubblePopupRef.current) {
              mapRef.current.removeLayer(bubblePopupRef.current)
              bubblePopupRef.current = null
            }
            setBubbleState(null)
          }}
        />
      )
    )

    const offset = L.point(0, -56)
    const popup = L.popup({
      closeButton: false,
      className: 'leaflet-popup-transparent',
      maxWidth: 360,
      minWidth: 320,
      offset
    })
      .setLatLng([lat, lng])
      .setContent(container)
      .openOn(mapRef.current)
    bubblePopupRef.current = popup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbleState])

  useEffect(() => {
    if (!jumpToEcho || !mapRef.current) return
  }, [])

  const handleRecordBtn = async () => {
    const rs = recordStateRef.current
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        rs.stream = stream
        const actx = new AudioContext()
        rs.audioContext = actx
        const source = actx.createMediaStreamSource(stream)
        const analyser = actx.createAnalyser()
        analyser.fftSize = 128
        source.connect(analyser)
        rs.analyser = analyser
        const mr = new MediaRecorder(stream)
        rs.chunks = []
        rs.mediaRecorder = mr
        mr.ondataavailable = (e) => { if (e.data.size > 0) rs.chunks.push(e.data) }
        mr.onstop = () => {
          const blob = new Blob(rs.chunks, { type: 'audio/webm' })
          const reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onloadend = () => {
            const base64 = reader.result as string
            const duration = Math.max(1, Math.floor((Date.now() - rs.startTime) / 1000))
            const waveform = Array.from({ length: 32 }, () => 0.3 + Math.random() * 0.7)
            if (bubblePopupRef.current && mapRef.current) {
              mapRef.current.removeLayer(bubblePopupRef.current)
              bubblePopupRef.current = null
            }
            setBubbleState({
              mode: 'record-create',
              lat: currentPos.lat,
              lng: currentPos.lng,
              audioData: { base64, duration, waveform },
              contentType: 'audio'
            })
            mapRef.current?.panTo([currentPos.lat, currentPos.lng])
          }
          stream.getTracks().forEach(t => t.stop())
          actx.close()
        }
        rs.startTime = Date.now()
        mr.start()
        setIsRecording(true)
      } catch (err) {
        console.error(err)
        alert('无法访问麦克风')
      }
    } else {
      if (rs.mediaRecorder && rs.mediaRecorder.state !== 'inactive') {
        rs.mediaRecorder.stop()
      }
      setIsRecording(false)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <div className="map-overlay" />
      <div className="map-vignette" />

      <div style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 102 }}>
        <button
          className={'record-btn' + (isRecording ? ' recording' : '')}
          onClick={handleRecordBtn}
          title={isRecording ? '停止录音' : '在当前位置录制语音回声'}
        >
          <div className="icon" />
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 32, left: 32, zIndex: 102, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          padding: '10px 16px', borderRadius: 12,
          background: 'rgba(15, 26, 46, 0.8)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--glass-border)',
          fontSize: 12, color: 'var(--glass-text-muted)',
          maxWidth: 280, lineHeight: 1.5
        }}>
          💡 点击地图任意位置标记回声<br />
          🔘 点击右下角按钮在此录音
        </div>
      </div>

      {notifications.map(n => (
        <NotificationBanner
          key={n.id}
          notification={n}
          onClose={() => dismissNotification(n.id)}
          onClick={() => {
            dismissNotification(n.id)
            if (mapRef.current) {
              mapRef.current.flyTo([n.echo.latitude, n.echo.longitude], 17, { duration: 1 })
              setBubbleState({ mode: 'view', lat: n.echo.latitude, lng: n.echo.longitude, echo: n.echo })
            }
          }}
        />
      ))}
    </div>
  )
}

function ProfilePage({
  user,
  myEchoes,
  reloadMyEchoes
}: {
  user: User
  myEchoes: Echo[]
  reloadMyEchoes: () => void
}) {
  const [filter, setFilter] = useState<'all' | 'text' | 'audio'>('all')

  const filtered = myEchoes.filter(e => filter === 'all' ? true : e.contentType === filter)
  const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">🗂️ 我的回声</h1>
            <p className="page-subtitle">共 {myEchoes.length} 条回声 · {myEchoes.filter(e => e.contentType === 'audio').length} 条语音 · {myEchoes.filter(e => e.contentType === 'text').length} 条文字</p>
          </div>
          <div className="tab-bar" style={{ minWidth: 240 }}>
            <div className={'tab-item' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>全部</div>
            <div className={'tab-item' + (filter === 'text' ? ' active' : '')} onClick={() => setFilter('text')}>文字</div>
            <div className={'tab-item' + (filter === 'audio' ? ' active' : '')} onClick={() => setFilter('audio')}>语音</div>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌊</div>
          <h3>还没有回声</h3>
          <p>去地图上留下你的第一条回声吧～</p>
        </div>
      ) : (
        <div className="waterfall-container">
          {sorted.map((echo, idx) => (
            <ProfileEchoCard
              key={echo.id}
              echo={echo}
              animationDelay={idx * 60}
              isOwner={echo.userId === user.id}
              onEdit={() => reloadMyEchoes()}
              onDelete={async (e) => {
                try {
                  await apiDeleteEcho(e.id)
                  reloadMyEchoes()
                } catch (err) {
                  alert('删除失败')
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RegisterPage({ onRegistered }: { onRegistered: (u: User) => void }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    try {
      const res = await registerUser(username.trim())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user))
      onRegistered(res.user)
      navigate('/map', { replace: true })
    } catch (err) {
      console.error(err)
      alert('注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <form className="register-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-amber))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, boxShadow: '0 8px 32px rgba(64, 224, 208, 0.3)'
          }}>🌊</div>
        </div>
        <h2>欢迎来到回声备忘录</h2>
        <p className="subtitle">在每个角落留下你的声音，等待下一个旅人发现</p>
        <div className="input-group">
          <label>用户名</label>
          <input
            className="glass-input"
            placeholder="给自己取个名字吧..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={16}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !username.trim()}>
          {loading ? '正在进入...' : '🚀 开始探索'}
        </button>
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--glass-text-muted)', lineHeight: 1.7 }}>
          💡 点击地图任意位置创建回声<br />
          🎙️ 支持文字和语音两种形式<br />
          🔔 靠近别人的回声会收到推送通知
        </div>
      </form>
    </div>
  )
}

function AppInner() {
  const [user, setUser] = useState<User | null>(null)
  const [allEchoes, setAllEchoes] = useState<Echo[]>([])
  const [myEchoes, setMyEchoes] = useState<Echo[]>([])
  const [notifications, setNotifications] = useState<EchoNotification[]>([])
  const seenNotifIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  const reloadAllEchoes = useCallback(async () => {
    try {
      let list = await getEchoes()
      if (list.length === 0 && user) {
        list = generateMockEchoes(
          user.currentLat || DEFAULT_LAT,
          user.currentLng || DEFAULT_LNG,
          10
        )
      }
      setAllEchoes(list)
    } catch (err) {
      console.error(err)
    }
  }, [user])

  const reloadMyEchoes = useCallback(async () => {
    if (!user) return
    try {
      const list = await getUserEchoes(user.id)
      setMyEchoes(list)
      reloadAllEchoes()
    } catch (err) {
      console.error(err)
    }
  }, [user, reloadAllEchoes])

  useEffect(() => {
    if (user) {
      reloadAllEchoes()
      reloadMyEchoes()
    }
  }, [user])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    const doScan = async () => {
      if (!active) return
      try {
        const lat = user.currentLat || DEFAULT_LAT
        const lng = user.currentLng || DEFAULT_LNG
        const res = await scanNearby(user.id, lat, lng)
        if (!active) return
        const fresh = res.filter(n => !seenNotifIdsRef.current.has(n.id))
        if (fresh.length > 0) {
          fresh.forEach(n => seenNotifIdsRef.current.add(n.id))
          setNotifications(prev => [...prev, ...fresh])
        }
      } catch (e) {
        console.warn('scan error', e)
      }
    }
    doScan()
    const interval = setInterval(doScan, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [user])

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setAllEchoes([])
    setMyEchoes([])
    setNotifications([])
    seenNotifIdsRef.current.clear()
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<RegisterPage onRegistered={setUser} />} />
      </Routes>
    )
  }

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/register" element={<Navigate to="/map" replace />} />
        <Route
          path="/map"
          element={
            <MapPage
              user={user}
              notifications={notifications}
              dismissNotification={dismissNotification}
              jumpToEcho={() => {}}
              allEchoes={allEchoes}
              reloadEchoes={reloadAllEchoes}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              user={user}
              myEchoes={myEchoes}
              reloadMyEchoes={reloadMyEchoes}
            />
          }
        />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

export default App
