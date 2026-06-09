import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Timeline from './components/Timeline'
import Editor from './components/Editor'
import { Diary } from './types'

const STORAGE_KEY = 'emotion_capsule_uuid'

interface RouteState {
  mode: 'home' | 'share'
  uuid: string
}

function parseRoute(): RouteState {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash.startsWith('/capsule/')) {
    const uuid = hash.slice('/capsule/'.length)
    return { mode: 'share', uuid }
  }
  return { mode: 'home', uuid: '' }
}

function App() {
  const [route, setRoute] = useState<RouteState>(parseRoute())
  const [uuid, setUuid] = useState<string>('')
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareLinkCopied, setShareLinkCopied] = useState(false)

  const initOrLoad = useCallback(async (routeState: RouteState) => {
    setLoading(true)
    setError('')

    if (routeState.mode === 'share') {
      try {
        const res = await fetch(`/api/capsule/${routeState.uuid}`)
        const data = await res.json()
        setUuid(data.uuid)
        setDiaries(data.diaries || [])
      } catch (err) {
        console.error(err)
        setError('加载分享内容失败，请检查链接是否正确')
      } finally {
        setLoading(false)
      }
      return
    }

    let localUuid = localStorage.getItem(STORAGE_KEY)
    if (!localUuid) {
      localUuid = uuidv4()
      localStorage.setItem(STORAGE_KEY, localUuid)
    }
    setUuid(localUuid)

    try {
      const res = await fetch(`/api/capsule/${localUuid}`)
      const data = await res.json()
      setDiaries(data.diaries || [])
    } catch (err) {
      console.error('Fetch initial diaries failed:', err)
      setDiaries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initOrLoad(route)

    const onHashChange = () => {
      const newRoute = parseRoute()
      setRoute(newRoute)
      initOrLoad(newRoute)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [route, initOrLoad])

  const handleSave = async (content: string, weather: string, mood: number) => {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid,
        content,
        weather,
        mood,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || '保存失败')
    }
    setDiaries(data.diaries || [])
    setUuid(data.uuid)
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, data.uuid)
    }
  }

  const copyShareLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#/capsule/${uuid}`
    try {
      await navigator.clipboard.writeText(link)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    }
  }

  const goHome = () => {
    window.location.hash = ''
  }

  const readOnly = route.mode === 'share'

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'rgba(168,230,207,0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.5)',
        }}>
          正在穿越时空隧道...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: `
        radial-gradient(ellipse at 20% 0%, rgba(168,230,207,0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, rgba(255,170,165,0.06) 0%, transparent 50%),
        #1a1a2e
      `,
    }}>
      <header style={{
        height: '56px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(26, 26, 46, 0.8)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={goHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'inherit',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #a8e6cf 0%, #ffaaa5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 20px rgba(168,230,207,0.3)',
            }}>
              ✦
            </div>
            <div>
              <div style={{
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}>情绪日记 · 时空胶囊</div>
              <div style={{
                fontSize: '10.5px',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '1px',
              }}>EMOTION CAPSULE DIARY</div>
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {readOnly && (
            <button
              onClick={goHome}
              style={{
                padding: '8px 16px',
                fontSize: '12.5px',
                color: 'rgba(255,255,255,0.75)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
              }}
            >
              🏠 返回我的主页
            </button>
          )}

          {!readOnly && uuid && (
            <button
              onClick={copyShareLink}
              style={{
                padding: '8px 16px',
                fontSize: '12.5px',
                color: shareLinkCopied ? '#2ed573' : 'rgba(255,255,255,0.75)',
                background: shareLinkCopied ? 'rgba(46,213,115,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${shareLinkCopied ? 'rgba(46,213,115,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                if (!shareLinkCopied) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'
                }
              }}
              onMouseLeave={(e) => {
                if (!shareLinkCopied) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                }
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
              }}
            >
              {shareLinkCopied ? '✓ 链接已复制' : '🔗 分享胶囊'}
            </button>
          )}

          <div style={{
            padding: '6px 12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.35)',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.04)',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {uuid.slice(0, 8)}...
          </div>
        </div>
      </header>

      {error && (
        <div style={{
          padding: '14px 24px',
          margin: '16px 28px',
          borderRadius: '10px',
          background: 'rgba(255, 118, 117, 0.12)',
          border: '1px solid rgba(255, 118, 117, 0.3)',
          color: '#ff7675',
          fontSize: '14px',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      <main style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div style={{
          width: '60%',
          height: '100%',
          minWidth: 0,
        }}>
          <Timeline diaries={diaries} />
        </div>

        <div style={{
          width: '40%',
          height: '100%',
          minWidth: '380px',
          flexShrink: 0,
        }}>
          <Editor
            uuid={uuid}
            onSave={handleSave}
            readOnly={readOnly}
          />
        </div>
      </main>
    </div>
  )
}

export default App
