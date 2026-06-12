import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useGameStore } from './store'
import type { BattleResponse, BattleTurnRecord, CardPlayed } from '../shared/types'
import { MAX_MANA, STARTING_HEALTH, CARD_TYPE_LABELS } from '../shared/types'

interface AnimatedCard {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  start: number
  duration: number
  color: string
  icon: string
}

interface Shockwave {
  x: number
  y: number
  start: number
  duration: number
}

interface HitTarget {
  side: 'enemy' | 'ally'
  start: number
}

interface WinText {
  text: string
  start: number
  duration: number
}

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3) }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

export default function BattleSimulator({ onBack }: { onBack: () => void }) {
  const { deck, battleResult, setBattleResult } = useGameStore()
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [turnIdx, setTurnIdx] = useState(0)
  const [currentTurn, setCurrentTurn] = useState<BattleTurnRecord | null>(null)
  const [playerHealth, setPlayerHealth] = useState(STARTING_HEALTH)
  const [enemyHealth, setEnemyHealth] = useState(STARTING_HEALTH)
  const [playerMaxMana, setPlayerMaxMana] = useState(0)
  const [enemyMaxMana, setEnemyMaxMana] = useState(0)
  const [playerHand, setPlayerHand] = useState<number>(3)
  const [enemyHand, setEnemyHand] = useState<number>(3)
  const [playerField, setPlayerField] = useState<Array<{ id: string; icon: string; name: string; atk: number; hp: number; rarity: string }>>([])
  const [enemyField, setEnemyField] = useState<Array<{ id: string; icon: string; name: string; atk: number; hp: number; rarity: string }>>([])
  const [showTurnText, setShowTurnText] = useState<string | null>(null)
  const [healthAnim, setHealthAnim] = useState<{ side: 'player' | 'enemy'; dir: 'up' | 'down' } | null>(null)
  const [hitTarget, setHitTarget] = useState<'enemy' | 'ally' | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<{ cards: AnimatedCard[]; shocks: Shockwave[]; hits: HitTarget[]; winText: WinText | null; startTime: number }>({
    cards: [], shocks: [], hits: [], winText: null, startTime: performance.now(),
  })
  const arenaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    axios.post('/api/battle', { playerDeck: deck }).then(res => {
      if (!alive) return
      setBattleResult(res.data)
      setLoading(false)
    }).catch(() => { setLoading(false) })
    return () => { alive = false }
  }, [deck, setBattleResult])

  useEffect(() => {
    if (!battleResult) return
    let i = 0
    const tick = () => {
      if (i >= battleResult.turns.length) {
        setShowReport(true)
        const winner = battleResult.winner === 'player' ? '胜  利' : '失  败'
        animRef.current.winText = { text: winner, start: performance.now(), duration: 600 }
        return
      }
      const t = battleResult.turns[i]
      setCurrentTurn(t)
      setTurnIdx(i)
      if (t.side === 'player') {
        setPlayerMaxMana(m => Math.min(MAX_MANA, m + 1))
        setPlayerHand(h => Math.min(10, h + 1))
        setShowTurnText(`回合 ${t.turn} - 我方`)
      } else {
        setEnemyMaxMana(m => Math.min(MAX_MANA, m + 1))
        setEnemyHand(h => Math.min(10, h + 1))
        setShowTurnText(`回合 ${t.turn} - 敌方`)
      }
      setTimeout(() => setShowTurnText(null), 600)

      const playCards = (j: number) => {
        if (j >= t.cardsPlayed.length) {
          i++
          setTimeout(tick, 700)
          return
        }
        const cp: CardPlayed = t.cardsPlayed[j]
        playCardAnim(t.side, cp)
        setTimeout(() => playCards(j + 1), 600)
      }
      setTimeout(() => playCards(0), 400)
    }
    setTimeout(tick, 500)
  }, [battleResult])

  const playCardAnim = (side: 'player' | 'enemy', cp: CardPlayed) => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const fromHandX = side === 'player' ? rect.width / 2 : rect.width / 2
    const fromHandY = side === 'player' ? rect.height - 50 : 50
    const toX = rect.width / 2
    const toY = rect.height / 2
    animRef.current.cards.push({
      id: cp.cardId + Math.random(),
      fromX: fromHandX, fromY: fromHandY,
      toX, toY,
      start: performance.now(), duration: 500,
      color: side === 'player' ? '#4a9eff' : '#ff4455',
      icon: '',
    })
    setTimeout(() => {
      animRef.current.shocks.push({ x: toX, y: toY, start: performance.now(), duration: 300 })
      if (cp.damage && cp.damage > 0) {
        const target = side === 'player' ? 'enemy' : 'ally'
        animRef.current.hits.push({ side: target, start: performance.now() })
        setHitTarget(target)
        setTimeout(() => setHitTarget(null), 200)
        if (target === 'enemy') {
          setEnemyHealth(h => Math.max(0, h - (cp.damage ?? 0)))
          setHealthAnim({ side: 'enemy', dir: 'down' })
        } else {
          setPlayerHealth(h => Math.max(0, h - (cp.damage ?? 0)))
          setHealthAnim({ side: 'player', dir: 'down' })
        }
      }
      if (cp.healing && cp.healing > 0) {
        if (side === 'player') {
          setPlayerHealth(h => Math.min(STARTING_HEALTH, h + (cp.healing ?? 0)))
          setHealthAnim({ side: 'player', dir: 'up' })
        } else {
          setEnemyHealth(h => Math.min(STARTING_HEALTH, h + (cp.healing ?? 0)))
          setHealthAnim({ side: 'enemy', dir: 'up' })
        }
      }
      setTimeout(() => setHealthAnim(null), 400)

      if (cp.cardName.includes('新兵') || cp.cardName.includes('步兵') || cp.cardName.includes('骑士') ||
          cp.cardName.includes('战士') || cp.cardName.includes('巨龙') || cp.cardName.includes('凤凰') ||
          cp.cardName.includes('巨人') || cp.cardName.includes('刺客') || cp.cardName.includes('勇士') ||
          cp.cardName.includes('元素') || cp.cardName.includes('图腾')) {
        const minion = { id: cp.cardId + Math.random(), icon: '🐾', name: cp.cardName, atk: cp.damage ?? 2, hp: cp.healing ?? 3, rarity: 'common' }
        if (side === 'player') setPlayerField(f => [...f, minion])
        else setEnemyField(f => [...f, minion])
      }
    }, 500)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const resize = () => {
      const arena = arenaRef.current
      if (!arena) return
      const r = arena.getBoundingClientRect()
      canvas.width = r.width
      canvas.height = r.height
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const now = performance.now()

      for (let i = animRef.current.cards.length - 1; i >= 0; i--) {
        const c = animRef.current.cards[i]
        const t = Math.min(1, (now - c.start) / c.duration)
        if (t >= 1) { animRef.current.cards.splice(i, 1); continue }
        const x = c.fromX + (c.toX - c.fromX) * easeOut(t)
        const y = c.fromY + (c.toY - c.fromY) * easeOut(t) - Math.sin(Math.PI * t) * 120
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate((t - 0.5) * 0.4)
        const grad = ctx.createLinearGradient(-40, -55, 40, 55)
        grad.addColorStop(0, c.color)
        grad.addColorStop(1, 'rgba(30,30,60,0.95)')
        ctx.fillStyle = grad
        ctx.shadowColor = c.color
        ctx.shadowBlur = 20
        roundRect(ctx, -40, -55, 80, 110, 10)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 13px JetBrains Mono'
        ctx.textAlign = 'center'
        ctx.fillText('卡牌', 0, 0)
        ctx.restore()
      }

      for (let i = animRef.current.shocks.length - 1; i >= 0; i--) {
        const s = animRef.current.shocks[i]
        const t = Math.min(1, (now - s.start) / s.duration)
        if (t >= 1) { animRef.current.shocks.splice(i, 1); continue }
        const r = 80 * t
        ctx.save()
        ctx.globalAlpha = 1 - t
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 3
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 15
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      for (let i = animRef.current.hits.length - 1; i >= 0; i--) {
        const h = animRef.current.hits[i]
        const t = Math.min(1, (now - h.start) / 200)
        if (t >= 1) { animRef.current.hits.splice(i, 1); continue }
        const targetY = h.side === 'enemy' ? H * 0.15 : H * 0.85
        ctx.save()
        ctx.globalAlpha = 1 - t
        ctx.fillStyle = 'rgba(255,68,85,0.55)'
        const off = Math.sin(t * Math.PI * 4) * 5
        ctx.fillRect(W * 0.35 + off, targetY - 30, W * 0.3, 60)
        ctx.restore()
      }

      if (animRef.current.winText) {
        const w = animRef.current.winText
        const t = Math.min(1, (now - w.start) / w.duration)
        if (t >= 1 && !showReport) setShowReport(true)
        ctx.save()
        const scale = 0.3 + easeOutCubic(t) * 1.8
        ctx.translate(W / 2, H / 2)
        ctx.scale(scale, scale)
        ctx.globalAlpha = Math.min(1, t * 2)
        const g = ctx.createLinearGradient(-200, 0, 200, 0)
        g.addColorStop(0, '#ffd700')
        g.addColorStop(0.5, '#ffffff')
        g.addColorStop(1, '#ff8c00')
        ctx.fillStyle = g
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 30
        ctx.font = 'bold 72px Cinzel, serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(w.text, 0, 0)
        ctx.restore()
      }

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [showReport])

  const result = battleResult
  const heatmapData = useMemo(() => {
    if (!result) return []
    const used = { ...result.playerStats.cardsUsed }
    const deckIds = new Map<string, { name: string; count: number }>()
    for (const c of deck) {
      const prev = deckIds.get(c.id) ?? { name: c.name, count: 0 }
      prev.count++
      deckIds.set(c.id, prev)
    }
    const max = Math.max(1, ...Object.values(used))
    return Array.from(deckIds.entries()).map(([id, info]) => ({
      id, name: info.name, used: used[id] ?? 0, intensity: (used[id] ?? 0) / max,
    }))
  }, [result, deck])

  if (loading) {
    return (
      <div className="glass-panel battle-panel" style={{alignItems:'center', justifyContent:'center'}}>
        <div style={{fontFamily:'Cinzel, serif', fontSize:22, color:'#ffd700'}}>战斗模拟中...</div>
      </div>
    )
  }

  return (
    <div className="glass-panel battle-panel">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <div className="panel-title" style={{marginBottom:0}}>战斗模拟</div>
        <div style={{display:'flex', gap:8}}>
          <span style={{fontSize:12, color:'#8888aa'}}>回合 {turnIdx + 1}/{result?.turns.length ?? 0}</span>
          <button onClick={onBack}>返回</button>
        </div>
      </div>
      <div className="battle-arena" ref={arenaRef}>
        <canvas ref={canvasRef} className="battle-canvas" />

        <div className={`hero-area enemy ${hitTarget === 'enemy' ? 'hit' : ''}`}>
          <div className="hero-info">
            <div className="hero-avatar">👿</div>
            <div className="hero-meta">
              <div className="hero-name">敌方英雄</div>
              <div className="health-bar"><div className="health-fill" style={{width:`${(enemyHealth / STARTING_HEALTH) * 100}%`}} /></div>
              <span className={`health-text ${healthAnim?.side === 'enemy' ? healthAnim.dir : ''}`}>❤ {enemyHealth}/{STARTING_HEALTH}</span>
            </div>
          </div>
          <div className="mana-display" title={`法力 ${enemyMaxMana}/${MAX_MANA}`}>
            {Array.from({length: MAX_MANA}).map((_, i) => (
              <div key={i} className={`mana-crystal ${i < enemyMaxMana ? 'filled' : ''}`} />
            ))}
          </div>
        </div>

        <div className="hand-row" style={{minHeight: 50}}>
          {Array.from({length: Math.min(enemyHand, 6)}).map((_, i) => (
            <div key={i} className="enemy-hand-card">🂠</div>
          ))}
        </div>

        <div className="battlefield-row">
          {enemyField.map(m => (
            <div key={m.id} className={`minion-card rarity-${m.rarity} ${hitTarget==='enemy' ? 'hit':''}`}>
              <div className="minion-icon">{m.icon}</div>
              <div className="minion-name">{m.name}</div>
              <div className="minion-stats">
                <span className="minion-atk">⚔{m.atk}</span>
                <span className="minion-hp">❤{m.hp}</span>
              </div>
            </div>
          ))}
          {enemyField.length === 0 && <span style={{color:'#8888aa', fontSize:12}}>敌方战场</span>}
        </div>

        <div className="battlefield-row">
          {playerField.map(m => (
            <div key={m.id} className={`minion-card rarity-${m.rarity} ${hitTarget==='ally' ? 'hit':''}`}>
              <div className="minion-icon">{m.icon}</div>
              <div className="minion-name">{m.name}</div>
              <div className="minion-stats">
                <span className="minion-atk">⚔{m.atk}</span>
                <span className="minion-hp">❤{m.hp}</span>
              </div>
            </div>
          ))}
          {playerField.length === 0 && <span style={{color:'#8888aa', fontSize:12}}>我方战场</span>}
        </div>

        <div className="hand-row">
          {Array.from({length: Math.min(playerHand, 6)}).map((_, i) => (
            <div key={i} className="hand-card">
              <div className="hand-card-icon">🎴</div>
              <div className="hand-card-name">手牌{i+1}</div>
            </div>
          ))}
        </div>

        <div className={`hero-area ally ${hitTarget === 'ally' ? 'hit' : ''}`}>
          <div className="hero-info">
            <div className="hero-avatar">🧙</div>
            <div className="hero-meta">
              <div className="hero-name">我方英雄</div>
              <div className="health-bar"><div className="health-fill" style={{width:`${(playerHealth / STARTING_HEALTH) * 100}%`}} /></div>
              <span className={`health-text ${healthAnim?.side === 'player' ? healthAnim.dir : ''}`}>❤ {playerHealth}/{STARTING_HEALTH}</span>
            </div>
          </div>
          <div className="mana-display" title={`法力 ${playerMaxMana}/${MAX_MANA}`}>
            {Array.from({length: MAX_MANA}).map((_, i) => (
              <div key={i} className={`mana-crystal ${i < playerMaxMana ? 'filled' : ''}`} />
            ))}
          </div>
        </div>

        {showTurnText && <div className="turn-indicator">{showTurnText}</div>}
      </div>

      <div className="battle-controls">
        <button onClick={() => setShowReport(true)}>查看战报</button>
        <button onClick={onBack}>构建新卡组</button>
      </div>

      {showReport && result && (
        <BattleReport result={result} onClose={() => setShowReport(false)} heatmap={heatmapData} />
      )}
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function BattleReport({ result, onClose, heatmap }: {
  result: BattleResponse
  onClose: () => void
  heatmap: Array<{ id: string; name: string; used: number; intensity: number }>
}) {
  const baseWinRate = 50 + result.winRateAdjustment
  return (
    <div className="battle-report-overlay" onClick={onClose}>
      <div className="battle-report glass-panel" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <div className="report-header">
          <div className="report-title">战斗结算报告</div>
          <div className={`report-winner ${result.winner === 'enemy' ? 'lose' : ''}`}>
            {result.winner === 'player' ? '🏆 胜  利' : '💀 失  败'}
          </div>
          <div style={{fontSize:12, color:'#8888aa', marginTop:4}}>
            总回合数 {result.totalTurns}
          </div>
        </div>

        <div className="report-section-title">数据统计</div>
        <div className="report-grid">
          <div className="stats-card">
            <div className="stats-label">我方总伤害</div>
            <div className="stats-value damage">{result.playerStats.totalDamage}</div>
          </div>
          <div className="stats-card">
            <div className="stats-label">我方总治疗</div>
            <div className="stats-value heal">{result.playerStats.totalHealing}</div>
          </div>
          <div className="stats-card">
            <div className="stats-label">敌方总伤害</div>
            <div className="stats-value damage">{result.enemyStats.totalDamage}</div>
          </div>
          <div className="stats-card">
            <div className="stats-label">敌方总治疗</div>
            <div className="stats-value heal">{result.enemyStats.totalHealing}</div>
          </div>
        </div>

        <div className="report-section-title">胜率预测修正</div>
        <div className="winrate-bar">
          <div className="winrate-fill" style={{ width: `${Math.max(5, Math.min(95, baseWinRate))}%` }} />
        </div>
        <div className="winrate-text">
          <span>修正后胜率: <strong style={{color: baseWinRate >= 50 ? '#44ff88' : '#ff4455'}}>{baseWinRate.toFixed(1)}%</strong></span>
          <span style={{color: result.winRateAdjustment >= 0 ? '#44ff88' : '#ff4455'}}>
            {result.winRateAdjustment >= 0 ? '+' : ''}{result.winRateAdjustment.toFixed(1)}%
          </span>
        </div>
        <div style={{fontSize:11, color:'#8888aa', marginTop:4}}>
          基于历史同类对战数据和卡组强度统计
        </div>

        <div className="report-section-title">卡牌使用频率热力图</div>
        <div className="heatmap-grid">
          {heatmap.map(h => (
            <div key={h.id} className="heatmap-cell" title={`${h.name}: 使用 ${h.used} 次`}
              style={{
                background: `rgba(255,68,85,${0.15 + h.intensity * 0.7})`,
                borderColor: `rgba(255,68,85,${0.3 + h.intensity * 0.6})`,
              }}>
              <div style={{fontWeight:700, fontSize:11}}>{h.name}</div>
              <div style={{fontSize:10, color:'#ffaaaa'}}>× {h.used}</div>
            </div>
          ))}
          {heatmap.length === 0 && <div style={{color:'#8888aa', fontSize:12}}>暂无数据</div>}
        </div>

        <div className="report-section-title">出牌记录</div>
        <div className="turn-log">
          {result.turns.slice().reverse().map((t, i) => (
            <div key={`${t.turn}-${t.side}-${i}`} className={`turn-entry ${t.side === 'enemy' ? 'enemy' : ''}`}>
              <span className="turn-number">T{t.turn} {t.side === 'player' ? '我方' : '敌方'}</span>
              {t.cardsPlayed.length > 0 ? t.cardsPlayed.map((cp, j) => (
                <span key={j} style={{marginRight: 8}}>
                  {cp.cardName}
                  {cp.damage ? <span style={{color:'#ff6677'}}> -{cp.damage}</span> : null}
                  {cp.healing ? <span style={{color:'#66ff88'}}> +{cp.healing}</span> : null}
                </span>
              )) : <span style={{color:'#8888aa'}}>无出牌</span>}
              <span style={{marginLeft:8, color:'#8888aa'}}>| 伤害{t.damageDealt} 治疗{t.healingDone}</span>
              <div style={{fontSize:10, color:'#666688', marginTop:2}}>
                我方血量 {t.playerHealthAfter} · 敌方血量 {t.enemyHealthAfter}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', gap:10, justifyContent:'center', marginTop:20}}>
          <button className="primary-btn" style={{width:'auto', margin:0, padding:'10px 28px'}} onClick={onClose}>
            关闭战报
          </button>
        </div>
      </div>
    </div>
  )
}
