import React, { useState, useEffect, useCallback, useRef } from 'react'
import DreamCard, { EMOTION_COLORS, Dream } from './components/DreamCard'
import DreamCanvas from './components/DreamCanvas'

const EMOTIONS = ['恐惧', '喜悦', '困惑', '忧伤', '宁静', '惊奇'] as const

type Page = { type: 'home' } | { type: 'detail'; id: string } | { type: 'create' }

const API = '/api/dreams'

async function fetchDreams(emotion?: string, order?: string): Promise<Dream[]> {
  const params = new URLSearchParams()
  if (emotion) params.set('emotion', emotion)
  if (order) params.set('order', order)
  const res = await fetch(`${API}?${params.toString()}`)
  return res.json()
}

async function createDream(data: { title: string; description: string; emotion: string }): Promise<Dream> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

async function deleteDream(id: string): Promise<void> {
  await fetch(`${API}/${id}`, { method: 'DELETE' })
}

function WaterfallLayout({ dreams, onCardClick, fadingIds }: {
  dreams: Dream[]
  onCardClick: (id: string) => void
  fadingIds: Set<string>
}) {
  const [columns, setColumns] = useState<Dream[][]>([[], [], []])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cols: Dream[][] = [[], [], []]
    const heights = [0, 0, 0]
    for (const d of dreams) {
      const minIdx = heights.indexOf(Math.min(...heights))
      cols[minIdx].push(d)
      heights[minIdx] += 240 + Math.random() * 20
    }
    setColumns(cols)
  }, [dreams])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
        padding: '0 24px 40px',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {dreams.map((dream, index) => (
        <div
          key={dream.id}
          style={{
            opacity: fadingIds.has(dream.id) ? 0 : 1,
            transform: fadingIds.has(dream.id) ? 'scale(0.85)' : 'scale(1)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            animation: `fadeSlideIn 0.5s ${index * 0.05}s both cubic-bezier(0.34,1.56,0.64,1)`,
          }}
        >
          <DreamCard dream={dream} onClick={() => onCardClick(dream.id)} />
        </div>
      ))}
    </div>
  )
}

function DetailPage({ dreamId, onBack, onDelete }: {
  dreamId: string
  onBack: () => void
  onDelete: () => void
}) {
  const [dream, setDream] = useState<Dream | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`${API}/${dreamId}`).then(r => r.json()).then(setDream)
  }, [dreamId])

  const handleDelete = async () => {
    setDeleting(true)
    await deleteDream(dreamId)
    setTimeout(() => onDelete(), 500)
  }

  if (!dream) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'rgba(180,130,255,0.5)', fontSize: 18 }}>加载中...</div>
      </div>
    )
  }

  const emotionColor = EMOTION_COLORS[dream.emotion] || '#666'

  return (
    <div
      style={{
        opacity: deleting ? 0 : 1,
        transform: deleting ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'fadeIn 0.6s ease',
      }}
    >
      <div style={{ width: '100%', maxWidth: 800, position: 'relative' }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(180,130,255,0.2)',
            borderRadius: 24,
            padding: '8px 20px',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: "'Noto Serif SC', serif",
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(180,130,255,0.15)'
            e.currentTarget.style.boxShadow = '0 0 12px rgba(180,130,255,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          ← 返回
        </button>

        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', marginTop: 60 }}>
          <DreamCanvas emotion={dream.emotion} width={800} height={450} animated={true} />
        </div>

        <div
          style={{
            padding: '28px 24px 40px',
            animation: 'fadeSlideUp 0.6s 0.2s both ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: emotionColor,
                boxShadow: `0 0 10px ${emotionColor}`,
              }}
            />
            <span style={{ fontSize: 14, color: emotionColor, opacity: 0.8 }}>{dream.emotion}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
              {new Date(dream.created_at).toLocaleString('zh-CN')}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: 28,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            {dream.title}
          </h1>

          <p
            style={{
              fontSize: 15,
              lineHeight: 1.8,
              color: 'rgba(255,255,255,0.55)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {dream.description}
          </p>
        </div>

        <button
          onClick={handleDelete}
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            background: 'rgba(180,50,50,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,80,80,0.25)',
            borderRadius: 28,
            padding: '10px 24px',
            color: 'rgba(255,120,120,0.8)',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: "'Noto Serif SC', serif",
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(180,50,50,0.3)'
            e.currentTarget.style.boxShadow = '0 0 16px rgba(255,80,80,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(180,50,50,0.15)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          删除此梦境
        </button>
      </div>
    </div>
  )
}

function CreatePage({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emotion, setEmotion] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !emotion) return
    setSubmitting(true)
    const dream = await createDream({ title: title.trim(), description: description.trim(), emotion })
    onCreated(dream.id)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '60px 20px 40px',
        animation: 'fadeIn 0.6s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 20,
          border: '1px solid rgba(180,130,255,0.15)',
          boxShadow: '0 0 40px rgba(180,130,255,0.08), 0 8px 32px rgba(0,0,0,0.3)',
          padding: 36,
          animation: 'fadeSlideUp 0.6s 0.1s both ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,130,255,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100,180,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(180,130,255,0.2)',
            borderRadius: 24,
            padding: '6px 18px',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: "'Noto Serif SC', serif",
            marginBottom: 24,
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(180,130,255,0.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          }}
        >
          ← 返回
        </button>

        <h2
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 24,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.75)',
            marginBottom: 28,
          }}
        >
          记录一个梦境
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
              标题
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="给这个梦境起个名字..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(180,130,255,0.15)',
                borderRadius: 12,
                color: 'rgba(255,255,255,0.8)',
                fontSize: 15,
                fontFamily: "'Noto Serif SC', serif",
                outline: 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(180,130,255,0.4)'
                e.currentTarget.style.boxShadow = '0 0 12px rgba(180,130,255,0.1)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(180,130,255,0.15)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="描述你的梦境..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(180,130,255,0.15)',
                borderRadius: 12,
                color: 'rgba(255,255,255,0.8)',
                fontSize: 14,
                fontFamily: "'Noto Serif SC', serif",
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(180,130,255,0.4)'
                e.currentTarget.style.boxShadow = '0 0 12px rgba(180,130,255,0.1)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(180,130,255,0.15)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
              情绪
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {EMOTIONS.map(e => {
                const color = EMOTION_COLORS[e]
                const selected = emotion === e
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmotion(e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: selected ? `${color}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selected ? color + '55' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 20,
                      padding: '6px 14px',
                      color: selected ? color : 'rgba(255,255,255,0.45)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: "'Noto Serif SC', serif",
                      transition: 'all 0.3s ease',
                      boxShadow: selected ? `0 0 12px ${color}22` : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: color,
                        boxShadow: selected ? `0 0 6px ${color}` : 'none',
                        transition: 'box-shadow 0.3s ease',
                      }}
                    />
                    {e}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim() || !emotion}
            style={{
              width: '100%',
              padding: '14px 0',
              background: submitting
                ? 'rgba(180,130,255,0.15)'
                : 'linear-gradient(135deg, rgba(180,130,255,0.3), rgba(140,100,220,0.3))',
              border: '1px solid rgba(180,130,255,0.3)',
              borderRadius: 14,
              color: 'rgba(255,255,255,0.8)',
              fontSize: 16,
              fontFamily: "'Noto Serif SC', serif",
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: !title.trim() || !description.trim() || !emotion ? 0.4 : 1,
            }}
            onMouseEnter={e => {
              if (!submitting && title.trim() && description.trim() && emotion) {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(180,130,255,0.25)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {submitting ? '记录中...' : '记录这个梦境'}
          </button>
        </form>
      </div>
    </div>
  )
}

function HomePage({ dreams, onCardClick, onCreateClick }: {
  dreams: Dream[]
  onCardClick: (id: string) => void
  onCreateClick: () => void
}) {
  const [selectedEmotions, setSelectedEmotions] = useState<Set<string>>(new Set())
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  const toggleEmotion = (e: string) => {
    setSelectedEmotions(prev => {
      const next = new Set(prev)
      if (next.has(e)) next.delete(e)
      else next.add(e)
      return next
    })
  }

  const filteredDreams = dreams
    .filter(d => selectedEmotions.size === 0 || selectedEmotions.has(d.emotion))
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return order === 'desc' ? tb - ta : ta - tb
    })

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          padding: '32px 24px 0',
          maxWidth: 1100,
          margin: '0 auto',
          animation: 'fadeIn 0.6s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: 28,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 2,
            }}
          >
            梦境速写
          </h1>
          <button
            onClick={onCreateClick}
            style={{
              background: 'linear-gradient(135deg, rgba(180,130,255,0.2), rgba(140,100,220,0.2))',
              border: '1px solid rgba(180,130,255,0.25)',
              borderRadius: 24,
              padding: '10px 24px',
              color: 'rgba(255,255,255,0.75)',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: "'Noto Serif SC', serif",
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 16px rgba(180,130,255,0.2)'
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(180,130,255,0.35), rgba(140,100,220,0.35))'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(180,130,255,0.2), rgba(140,100,220,0.2))'
            }}
          >
            + 记录梦境
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}
        >
          {EMOTIONS.map(e => {
            const color = EMOTION_COLORS[e]
            const active = selectedEmotions.has(e)
            return (
              <button
                key={e}
                onClick={() => toggleEmotion(e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: active ? `${color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? color + '44' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 16,
                  padding: '5px 12px',
                  color: active ? color : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: "'Noto Serif SC', serif",
                  transition: 'all 0.3s ease',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: color,
                    boxShadow: active ? `0 0 4px ${color}` : 'none',
                  }}
                />
                {e}
              </button>
            )
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>时间</span>
            <button
              onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(180,130,255,0.15)',
                borderRadius: 12,
                padding: '4px 12px',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: "'Noto Serif SC', serif",
                transition: 'all 0.3s ease',
              }}
            >
              {order === 'desc' ? '最新 ↓' : '最早 ↑'}
            </button>
          </div>
        </div>
      </header>

      {filteredDreams.length === 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '40vh',
            color: 'rgba(180,130,255,0.3)',
            fontSize: 16,
            fontFamily: "'Noto Serif SC', serif",
          }}
        >
          {dreams.length === 0 ? '还没有梦境记录，点击右上角开始吧' : '没有匹配的梦境'}
        </div>
      ) : (
        <WaterfallLayout dreams={filteredDreams} onCardClick={onCardClick} fadingIds={fadingIds} />
      )}
    </div>
  )
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>({ type: 'home' })
  const [dreams, setDreams] = useState<Dream[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadDreams = useCallback(async () => {
    const data = await fetchDreams()
    setDreams(data)
    setLoaded(true)
  }, [])

  useEffect(() => {
    loadDreams()
  }, [loadDreams])

  useEffect(() => {
    const handlePopState = () => {
      setPage({ type: 'home' })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateTo = (newPage: Page) => {
    setPage(newPage)
    if (newPage.type !== 'home') {
      window.history.pushState({}, '')
    }
  }

  const handleCreated = (id: string) => {
    loadDreams().then(() => navigateTo({ type: 'detail', id }))
  }

  const handleDeleted = () => {
    loadDreams().then(() => setPage({ type: 'home' }))
  }

  if (!loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'rgba(180,130,255,0.4)', fontSize: 16, fontFamily: "'Noto Serif SC', serif" }}>
          加载中...
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        input::placeholder, textarea::placeholder {
          color: rgba(255,255,255,0.2);
        }
        input:focus, textarea:focus {
          outline: none;
        }
      `}</style>

      {page.type === 'home' && (
        <HomePage
          dreams={dreams}
          onCardClick={(id) => navigateTo({ type: 'detail', id })}
          onCreateClick={() => navigateTo({ type: 'create' })}
        />
      )}
      {page.type === 'detail' && (
        <DetailPage
          dreamId={page.id}
          onBack={() => setPage({ type: 'home' })}
          onDelete={handleDeleted}
        />
      )}
      {page.type === 'create' && (
        <CreatePage
          onBack={() => setPage({ type: 'home' })}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}

export default App
