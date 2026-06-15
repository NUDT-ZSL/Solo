import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import type { CardData, Particle, PoemDisplay, HistoryItem, CollideResponse, VoteResponse } from './types'
import {
  createCard,
  updateCard,
  resolveCollision,
  getCollisionPoint,
  drawCard,
  createGoldParticles,
  updateParticles,
  drawParticles,
  drawPoemDisplay,
  isPointInCard,
  getPoemBoxBounds
} from './Card'

const CARD_COUNT = 30
const POEM_DURATION = 1500
const USER_ID_KEY = 'floating_dict_user_id'

function getOrCreateUserId(): string {
  let uid = localStorage.getItem(USER_ID_KEY)
  if (!uid) {
    uid = uuidv4()
    localStorage.setItem(USER_ID_KEY, uid)
  }
  return uid
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardsRef = useRef<CardData[]>([])
  const particlesRef = useRef<Particle[]>([])
  const poemDisplaysRef = useRef<PoemDisplay[]>([])
  const historyRef = useRef<HistoryItem[]>([])
  const animationFrameRef = useRef<number>(0)
  const lastCollisionRef = useRef<Map<string, number>>(new Map())
  const userIdRef = useRef<string>(getOrCreateUserId())
  const hoveredCardIdRef = useRef<string | null>(null)
  const draggingCardRef = useRef<CardData | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const initializedRef = useRef(false)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [poemDisplays, setPoemDisplays] = useState<PoemDisplay[]>([])
  const [fps, setFps] = useState(60)
  const [initialized, setInitialized] = useState(false)

  const syncPoemDisplays = useCallback(() => {
    setPoemDisplays([...poemDisplaysRef.current])
  }, [])

  const fetchWords = useCallback(async (): Promise<string[]> => {
    try {
      const res = await axios.get('/api/words')
      if (res.data.success) {
        return res.data.words
      }
    } catch (e) {
      console.warn('获取词汇失败，使用默认词汇')
    }
    return [
      '月光', '潮汐', '星辰', '山川', '溪流', '微风', '云朵', '薄雾', '晚霞', '清泉',
      '黎明', '黄昏', '子夜', '流年', '往昔', '瞬间', '永恒', '刹那', '四季', '朝夕',
      '思念', '追忆', '憧憬', '孤寂', '欢愉', '静谧', '惆怅', '缱绻', '悠然', '清欢'
    ]
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get('/api/history?limit=20')
      if (res.data.success) {
        historyRef.current = res.data.data
        setHistory(res.data.data)
      }
    } catch (e) {
      console.warn('获取历史失败')
    }
  }, [])

  const handleCollide = useCallback(async (cardA: CardData, cardB: CardData) => {
    const pairKey = [cardA.id, cardB.id].sort().join('_')
    const now = Date.now()
    const lastTime = lastCollisionRef.current.get(pairKey) || 0
    if (now - lastTime < 2000) return
    lastCollisionRef.current.set(pairKey, now)

    const point = getCollisionPoint(cardA, cardB)

    try {
      const res = await axios.post<CollideResponse>('/api/collide', {
        word1: cardA.word,
        word2: cardB.word,
        card1Id: cardA.id,
        card2Id: cardB.id,
        collisionPoint: point
      })

      if (res.data.success) {
        const particles = createGoldParticles(point.x, point.y, 50)
        particlesRef.current.push(...particles)

        const display: PoemDisplay = {
          id: uuidv4(),
          poem: res.data.poem,
          poemId: res.data.poemId,
          word1: res.data.word1,
          word2: res.data.word2,
          card1Id: cardA.id,
          card2Id: cardB.id,
          x: point.x,
          y: point.y,
          startTime: now,
          duration: POEM_DURATION,
          scale: 0.5,
          opacity: 0,
          voteButtonVisible: false,
          votes: 0,
          voted: false,
          historyId: res.data.historyId
        }
        poemDisplaysRef.current.push(display)
        syncPoemDisplays()

        await fetchHistory()
      }
    } catch (e) {
      console.error('碰撞请求失败:', e)
    }
  }, [fetchHistory, syncPoemDisplays])

  const handleVote = useCallback(async (display: PoemDisplay) => {
    if (display.voted) return

    try {
      const res = await axios.post<VoteResponse>('/api/vote', {
        poemId: display.poemId,
        card1Id: display.card1Id,
        card2Id: display.card2Id,
        word1: display.word1,
        word2: display.word2,
        poem: display.poem,
        userId: userIdRef.current
      })

      const idx = poemDisplaysRef.current.findIndex(d => d.id === display.id)
      if (idx >= 0) {
        poemDisplaysRef.current[idx].votes = res.data.newVoteCount
        poemDisplaysRef.current[idx].voted = true
        syncPoemDisplays()
      }

      if (res.data.replacement) {
        const { cardId, newWord } = res.data.replacement
        const card = cardsRef.current.find(c => c.id === cardId)
        if (card) {
          card.word = newWord
          const particles = createGoldParticles(card.x, card.y, 30)
          particlesRef.current.push(...particles)
        }
      }

      await fetchHistory()
    } catch (e) {
      console.error('投票失败:', e)
    }
  }, [fetchHistory, syncPoemDisplays])

  const handleHistoryClick = useCallback((item: HistoryItem) => {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2 - 80

    const particles = createGoldParticles(centerX, centerY, 50)
    particlesRef.current.push(...particles)

    const display: PoemDisplay = {
      id: uuidv4(),
      poem: item.poem,
      poemId: item.poemId,
      word1: item.word1,
      word2: item.word2,
      card1Id: 'history',
      card2Id: 'replay',
      x: centerX,
      y: centerY,
      startTime: Date.now(),
      duration: POEM_DURATION,
      scale: 0.5,
      opacity: 0,
      voteButtonVisible: true,
      votes: item.votes,
      voted: true,
      historyId: item.id
    }
    poemDisplaysRef.current.push(display)
    syncPoemDisplays()
  }, [syncPoemDisplays])

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

    const init = async () => {
      const words = await fetchWords()
      const cards: CardData[] = []
      for (let i = 0; i < Math.min(CARD_COUNT, words.length); i++) {
        cards.push(createCard(words[i], canvas.width, canvas.height, cards))
      }
      cardsRef.current = cards
      initializedRef.current = true
      setInitialized(true)
      await fetchHistory()
    }
    init()

    let lastFrame = performance.now()
    let frameCount = 0
    let fpsTimer = 0

    const loop = (now: number) => {
      const dt = now - lastFrame
      lastFrame = now
      frameCount++
      fpsTimer += dt
      if (fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / fpsTimer))
        frameCount = 0
        fpsTimer = 0
      }

      const w = canvas.width
      const h = canvas.height

      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
      bg.addColorStop(0, '#1a0f3d')
      bg.addColorStop(0.5, '#0f0a2e')
      bg.addColorStop(1, '#05031a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i < 80; i++) {
        const sx = ((i * 137.5) % w)
        const sy = ((i * 241.3 + now * 0.005) % (h - 140))
        const sa = 0.15 + Math.sin(now * 0.001 + i) * 0.1
        ctx.fillStyle = `rgba(200, 180, 255, ${sa})`
        ctx.beginPath()
        ctx.arc(sx, sy, 1, 0, Math.PI * 2)
        ctx.fill()
      }

      const cards = cardsRef.current
      const cardsChanged = new Set<number>()

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        if (draggingCardRef.current === card) continue
        card.isHovered = hoveredCardIdRef.current === card.id
        updateCard(card, w, h)
      }

      const computeStart = performance.now()
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          if (cardsChanged.has(i) && cardsChanged.has(j)) continue
          const collided = resolveCollision(cards[i], cards[j])
          if (collided) {
            cardsChanged.add(i)
            cardsChanged.add(j)
            void handleCollide(cards[i], cards[j])
          }
        }
      }
      void computeStart

      for (const card of cards) {
        drawCard(ctx, card)
      }

      particlesRef.current = updateParticles(particlesRef.current)
      drawParticles(ctx, particlesRef.current)

      const nowMs = Date.now()
      let displaysChanged = false

      poemDisplaysRef.current = poemDisplaysRef.current.filter(display => {
        const elapsed = (nowMs - display.startTime) / display.duration
        const extendedElapsed = (nowMs - display.startTime) / (display.duration + 2500)

        if (elapsed < 1) {
          if (elapsed < 0.3) {
            const t = elapsed / 0.3
            display.scale = 0.5 + easeOutBack(t) * 0.7
          } else if (elapsed > 0.85) {
            const t = (elapsed - 0.85) / 0.15
            display.scale = 1.2 - t * 0.2
          } else {
            display.scale = 1.2
          }
          display.opacity = Math.min(1, elapsed / 0.15)
        } else {
          if (extendedElapsed < 1) {
            display.opacity = 1 - easeOutQuad(extendedElapsed)
            display.scale = 1 - extendedElapsed * 0.1
          } else {
            return false
          }
        }

        const voteStart = (nowMs - display.startTime) / 1000
        if (voteStart >= 1 && !display.voteButtonVisible) {
          display.voteButtonVisible = true
          displaysChanged = true
        }

        drawPoemDisplay(ctx, display.poem, display.x, display.y, display.scale, display.opacity, elapsed)
        return true
      })

      if (displaysChanged) {
        syncPoemDisplays()
      }

      animationFrameRef.current = requestAnimationFrame(loop)
    }

    animationFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [fetchWords, fetchHistory, handleCollide, syncPoemDisplays])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e: MouseEvent | Touch) => ({
      x: e.clientX,
      y: e.clientY
    })

    const onMove = (e: MouseEvent) => {
      const pos = getPos(e)
      const cards = cardsRef.current

      if (draggingCardRef.current) {
        draggingCardRef.current.x = pos.x - dragOffsetRef.current.x
        draggingCardRef.current.y = pos.y - dragOffsetRef.current.y
        draggingCardRef.current.vx = 0
        draggingCardRef.current.vy = 0
        return
      }

      let found: string | null = null
      for (let i = cards.length - 1; i >= 0; i--) {
        if (isPointInCard(cards[i], pos.x, pos.y)) {
          found = cards[i].id
          break
        }
      }
      hoveredCardIdRef.current = found
      canvas.style.cursor = found ? 'grab' : 'default'
    }

    const onDown = (e: MouseEvent) => {
      const pos = getPos(e)
      const cards = cardsRef.current
      for (let i = cards.length - 1; i >= 0; i--) {
        if (isPointInCard(cards[i], pos.x, pos.y)) {
          draggingCardRef.current = cards[i]
          dragOffsetRef.current = {
            x: pos.x - cards[i].x,
            y: pos.y - cards[i].y
          }
          canvas.style.cursor = 'grabbing'
          break
        }
      }
    }

    const onUp = () => {
      if (draggingCardRef.current) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.3 + Math.random() * 0.3
        draggingCardRef.current.vx = Math.cos(angle) * speed
        draggingCardRef.current.vy = Math.sin(angle) * speed
      }
      draggingCardRef.current = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      const touch = e.touches[0]
      const pos = getPos(touch)

      if (draggingCardRef.current) {
        draggingCardRef.current.x = pos.x - dragOffsetRef.current.x
        draggingCardRef.current.y = pos.y - dragOffsetRef.current.y
        draggingCardRef.current.vx = 0
        draggingCardRef.current.vy = 0
        e.preventDefault()
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      const touch = e.touches[0]
      const pos = getPos(touch)
      const cards = cardsRef.current
      for (let i = cards.length - 1; i >= 0; i--) {
        if (isPointInCard(cards[i], pos.x, pos.y)) {
          draggingCardRef.current = cards[i]
          dragOffsetRef.current = {
            x: pos.x - cards[i].x,
            y: pos.y - cards[i].y
          }
          break
        }
      }
    }

    const onTouchEnd = () => {
      if (draggingCardRef.current) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.3 + Math.random() * 0.3
        draggingCardRef.current.vx = Math.cos(angle) * speed
        draggingCardRef.current.vy = Math.sin(angle) * speed
      }
      draggingCardRef.current = null
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />

      {poemDisplays.map(display => {
        if (!display.voteButtonVisible || display.opacity < 0.2) return null
        const bounds = getPoemBoxBounds(display.x, display.y, display.poem, display.scale)
        const buttonX = bounds.left + bounds.width / 2 - 45
        const buttonY = bounds.bottom + 10

        return (
          <button
            key={display.id}
            onClick={() => handleVote(display)}
            disabled={display.voted}
            style={{
              position: 'fixed',
              left: `${buttonX}px`,
              top: `${buttonY}px`,
              width: '90px',
              padding: '8px 14px',
              fontSize: '14px',
              fontFamily: '"Georgia", "Noto Serif SC", serif',
              color: display.voted ? '#555' : '#FFD700',
              background: display.voted
                ? 'rgba(50, 50, 50, 0.6)'
                : 'linear-gradient(135deg, rgba(50, 30, 80, 0.85), rgba(80, 40, 120, 0.85))',
              border: `1px solid ${display.voted ? 'rgba(100,100,100,0.4)' : 'rgba(255, 215, 0, 0.6)'}`,
              borderRadius: '20px',
              cursor: display.voted ? 'default' : 'pointer',
              opacity: Math.min(1, display.opacity * 1.5),
              transform: display.voted ? 'scale(1)' : undefined,
              transition: 'transform 0.2s ease-out, background 0.2s',
              boxShadow: display.voted ? 'none' : '0 0 12px rgba(255, 215, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              pointerEvents: 'auto'
            }}
            onMouseDown={e => {
              if (!display.voted) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'
              }
            }}
            onMouseUp={e => {
              if (!display.voted) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'
                setTimeout(() => {
                  const btn = e.currentTarget as HTMLButtonElement
                  if (btn) btn.style.transform = 'scale(1)'
                }, 150)
              }
            }}
            onMouseLeave={e => {
              if (!display.voted) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
              }
            }}
          >
            {display.voted ? `已共鸣 ${display.votes}` : `共鸣 ❤`}
          </button>
        )
      })}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to bottom, rgba(10, 5, 30, 0.85), transparent)',
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 400,
              color: 'rgba(255, 230, 200, 0.9)',
              fontFamily: '"Georgia", "Noto Serif SC", serif',
              letterSpacing: '4px',
              textShadow: '0 0 20px rgba(200, 150, 255, 0.5)'
            }}
          >
            悬浮词典
          </h1>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: 'rgba(200, 180, 230, 0.5)',
              letterSpacing: '2px'
            }}
          >
            让文字在碰撞中吟咏诗意
          </p>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(180, 160, 220, 0.4)',
            fontFamily: 'monospace',
            pointerEvents: 'auto'
          }}
        >
          {initialized ? `${fps} FPS` : '加载中...'}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '140px',
          background: 'linear-gradient(to top, rgba(10, 5, 30, 0.95), rgba(20, 10, 50, 0.7), transparent)',
          zIndex: 40,
          padding: '16px 20px 12px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(220, 200, 255, 0.7)',
              fontFamily: '"Georgia", "Noto Serif SC", serif',
              letterSpacing: '2px'
            }}
          >
            ✦ 诗韵回廊
          </h2>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(150, 130, 190, 0.4)',
              fontFamily: 'monospace'
            }}
          >
            共 {history.length} 条记录
          </span>
        </div>
        <div
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            paddingBottom: '4px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(150,120,220,0.3) transparent'
          }}
        >
          {history.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'rgba(150, 130, 180, 0.35)',
                fontSize: '12px',
                letterSpacing: '2px'
              }}
            >
              让卡片相遇，诗意便自会流淌于此...
            </div>
          ) : (
            history.map((item, idx) => {
              const timeAgo = Date.now() - item.timestamp
              const mins = Math.floor(timeAgo / 60000)
              const hours = Math.floor(mins / 60)
              const timeStr = hours > 0 ? `${hours}小时前` : mins > 0 ? `${mins}分钟前` : '刚刚'

              return (
                <div
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  style={{
                    display: 'inline-block',
                    verticalAlign: 'top',
                    width: '220px',
                    height: '100%',
                    marginRight: idx < history.length - 1 ? '12px' : '0',
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, rgba(50, 30, 80, 0.45), rgba(30, 15, 50, 0.6))',
                    border: '1px solid rgba(180, 140, 255, 0.2)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease-out',
                    boxSizing: 'border-box',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.transform = 'translateY(-3px)'
                    el.style.borderColor = 'rgba(255, 215, 0, 0.5)'
                    el.style.boxShadow = '0 4px 20px rgba(180, 140, 255, 0.25)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.transform = 'translateY(0)'
                    el.style.borderColor = 'rgba(180, 140, 255, 0.2)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'rgba(180, 150, 230, 0.5)',
                        fontFamily: 'monospace'
                      }}
                    >
                      #{history.length - idx} · {timeStr}
                    </span>
                    {item.votes > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#FFD700',
                          padding: '1px 6px',
                          background: 'rgba(255, 215, 0, 0.1)',
                          borderRadius: '8px'
                        }}
                      >
                        ❤ {item.votes}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'rgba(200, 170, 255, 0.6)',
                      marginBottom: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.word1} ⟷ {item.word2}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'rgba(255, 235, 210, 0.85)',
                      fontFamily: '"Georgia", "Noto Serif SC", serif',
                      lineHeight: '1.5',
                      whiteSpace: 'normal',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.poem}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
