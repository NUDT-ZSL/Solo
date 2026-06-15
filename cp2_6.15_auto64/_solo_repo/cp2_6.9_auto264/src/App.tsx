import { useState, useEffect, useRef } from 'react'

interface NoteData {
  content: string
  contentType: 'text' | 'image'
}

type View = 'create' | 'reading' | 'burned' | 'notfound'

function App() {
  const [view, setView] = useState<View>('create')
  const [noteId, setNoteId] = useState<string | null>(null)

  useEffect(() => {
    const path = window.location.pathname
    if (path.length > 1 && path.startsWith('/n/')) {
      const id = path.slice(3)
      if (id) {
        setNoteId(id)
        setView('reading')
      }
    }
  }, [])

  if (view === 'create') {
    return <CreateNote />
  }

  if (view === 'reading' && noteId) {
    return <ReadNote noteId={noteId} onBurned={() => setView('burned')} onNotFound={() => setView('notfound')} />
  }

  if (view === 'burned') {
    return <BurnedPage />
  }

  return <NotFoundPage />
}

function CreateNote() {
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [noteLink, setNoteLink] = useState('')
  const [countdown, setCountdown] = useState(10)
  const [error, setError] = useState('')
  const countdownRef = useRef<number | null>(null)

  const handleSubmit = async () => {
    setError('')

    let content = ''
    let contentType: 'text' | 'image' = 'text'

    if (text.trim()) {
      if (text.length > 2000) {
        setError('文本内容不能超过2000字')
        return
      }
      content = text
      contentType = 'text'
    } else if (image) {
      content = image
      contentType = 'image'
    } else {
      setError('请输入文本或上传图片')
      return
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, contentType })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '创建失败')
      }

      const link = `${window.location.origin}/n/${data.id}`
      setNoteLink(link)
      setShowSuccess(true)
      setCountdown(10)

      try {
        await navigator.clipboard.writeText(link)
      } catch {
        console.warn('自动复制失败')
      }

      let remaining = 10
      countdownRef.current = window.setInterval(() => {
        remaining -= 1
        setCountdown(remaining)
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          setShowSuccess(false)
        }
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    }
  }

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImage(ev.target?.result as string)
      setText('')
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const clearImage = () => {
    setImage(null)
  }

  const gradientPercent = ((10 - countdown) / 10) * 100
  const bgColor = countdown >= 10 ? '#00FF88' :
    countdown <= 0 ? '#FF4444' :
      interpolateColor('#00FF88', '#FF4444', gradientPercent / 100)

  return (
    <div className="create-bg">
      <div className="card create-card">
        <h1 className="title">焚笺 · 阅后即焚</h1>
        <p className="subtitle">创建一条只能被阅读一次的秘密</p>

        <textarea
          className="textarea-input"
          placeholder="输入要分享的文字内容（最多2000字）..."
          value={text}
          onChange={(e) => { setText(e.target.value); if (image) setImage(null); setError('') }}
          maxLength={2000}
        />

        <div className="char-count">{text.length} / 2000</div>

        {!text && !image && (
          <div
            className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-input"
            />
            <label htmlFor="file-input" className="drop-label">
              <div className="drop-icon">📷</div>
              <div className="drop-text">拖放图片到此处，或点击选择</div>
              <div className="drop-hint">支持 JPG、PNG、GIF，最大 2MB</div>
            </label>
          </div>
        )}

        {image && (
          <div className="image-preview">
            <img src={image} alt="预览" className="preview-img" />
            <button className="remove-btn" onClick={clearImage}>移除图片</button>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <button className="submit-btn" onClick={handleSubmit}>
          创建焚笺
        </button>
      </div>

      {showSuccess && (
        <div className="success-modal" style={{ backgroundColor: bgColor }}>
          <div className="success-title">✅ 焚笺已创建</div>
          <div className="success-link">{noteLink}</div>
          <div className="success-hint">链接已复制到剪贴板 · {countdown}秒后自动关闭</div>
          <div className="success-bar">
            <div className="success-bar-fill" style={{ width: `${countdown * 10}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function ReadNote({ noteId, onBurned, onNotFound }: { noteId: string, onBurned: () => void, onNotFound: () => void }) {
  const [note, setNote] = useState<NoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(15)
  const [pixelating, setPixelating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const countdownRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await fetch(`/api/notes/${noteId}`)
        if (!res.ok) {
          if (res.status === 404) {
            onNotFound()
            return
          }
          const data = await res.json()
          throw new Error(data.error || '获取失败')
        }
        const data: NoteData = await res.json()
        setNote(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取失败')
      } finally {
        setLoading(false)
      }
    }
    fetchNote()
  }, [noteId, onNotFound])

  useEffect(() => {
    if (loading || !note || pixelating) return

    let remaining = 15
    countdownRef.current = window.setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        setPixelating(true)
        setTimeout(() => {
          onBurned()
        }, 2000)
      }
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [loading, note, pixelating, onBurned])

  useEffect(() => {
    if (!pixelating) return

    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    canvas.width = container.offsetWidth
    canvas.height = container.offsetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const contentEl = container.querySelector('.note-content-inner') as HTMLElement
    if (!contentEl) return

    const startTime = Date.now()
    const duration = 2000

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const blurLevel = progress * 20

      contentEl.style.filter = `blur(${blurLevel}px)`
      contentEl.style.transform = `scale(${1 + progress * 0.1})`
      contentEl.style.opacity = `${1 - progress * 0.8}`

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [pixelating])

  if (loading) {
    return <div className="read-bg"><div className="loading-text">正在解密焚笺...</div></div>
  }

  if (error || !note) {
    return <NotFoundPage />
  }

  return (
    <div className="read-bg">
      <div className="countdown-badge">
        {countdown}s 后自动焚毁
      </div>

      <div className="note-container" ref={canvasRef}>
        <div className={`note-content-inner ${pixelating ? 'pixelating' : ''}`}>
          {note.contentType === 'text' ? (
            <pre className="note-text">{note.content}</pre>
          ) : (
            <img src={note.content} alt="焚笺图片" className="note-image" />
          )}
        </div>
      </div>
    </div>
  )
}

function BurnedPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      rotation: number
      rotSpeed: number
    }

    const particles: Particle[] = []
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * (0.3 + Math.random() * 0.5),
        vx: -0.5 + Math.random(),
        vy: -0.5 - Math.random() * 0.8,
        size: 4 + Math.random() * 4,
        opacity: 0.5 + Math.random() * 0.4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed

        if (p.y < -20) {
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
        }
        if (p.x < -20) p.x = canvas.width + 10
        if (p.x > canvas.width + 20) p.x = -10

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = '#4A4A4A'
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      })

      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="burned-bg">
      <canvas ref={canvasRef} className="ash-canvas" />
      <div className="burned-content">
        <div className="burned-icon">🔥</div>
        <h1 className="burned-title">此笺已焚</h1>
        <p className="burned-subtitle">内容已永久销毁，不可恢复</p>
        <button className="home-btn" onClick={() => window.location.href = '/'}>
          返回首页
        </button>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="burned-bg">
      <div className="burned-content">
        <div className="burned-icon">💨</div>
        <h1 className="burned-title">已焚毁</h1>
        <p className="burned-subtitle">此焚笺不存在或已被销毁</p>
        <button className="home-btn" onClick={() => window.location.href = '/'}>
          返回首页
        </button>
      </div>
    </div>
  )
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex = (s: string) => parseInt(s, 16)
  const r1 = hex(color1.slice(1, 3)), g1 = hex(color1.slice(3, 5)), b1 = hex(color1.slice(5, 7))
  const r2 = hex(color2.slice(1, 3)), g2 = hex(color2.slice(3, 5)), b2 = hex(color2.slice(5, 7))
  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)
  return `rgb(${r}, ${g}, ${b})`
}

export default App
