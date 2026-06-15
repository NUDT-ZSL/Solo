import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGameStore } from './store'
import { CARD_TYPE_LABELS, DECK_MAX_SIZE, type Card, type CardType } from '../shared/types'

interface DragState {
  card: Card
  x: number
  y: number
}

const FILTERS: Array<{ key: CardType | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'attack', label: '攻击' },
  { key: 'defense', label: '防御' },
  { key: 'spell', label: '法术' },
  { key: 'summon', label: '召唤' },
]

export default function CardBuilder({ onStartBattle }: { onStartBattle: () => void }) {
  const { cards, setCards, deck, addCard, removeCard, filter, setFilter, deckPanelOpen, toggleDeckPanel } = useGameStore()
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [shakeIdx, setShakeIdx] = useState<number | null>(null)
  const dragGhostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    axios.get('/api/cards').then(r => setCards(r.data))
  }, [setCards])

  const handlePointerDown = (e: React.PointerEvent, card: Card) => {
    e.preventDefault()
    setDrag({ card, x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => setDrag(d => d ? { ...d, x: e.clientX, y: e.clientY } : null)
    const up = (e: PointerEvent) => {
      if (dragOver) {
        const res = addCard(drag.card)
        if (!res.ok) {
          setShakeIdx(-1)
          setTimeout(() => setShakeIdx(null), 200)
        }
      }
      setDrag(null)
      setDragOver(false)
      void e
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag, dragOver, addCard])

  const handleRemove = (idx: number) => {
    setShakeIdx(idx)
    setTimeout(() => { removeCard(idx); setShakeIdx(null) }, 80)
  }

  const avgCost = deck.length ? (deck.reduce((s, c) => s + c.cost, 0) / deck.length).toFixed(1) : '0.0'
  const costCurve = Array.from({ length: 11 }, (_, cost) => deck.filter(c => c.cost === cost).length)
  const maxCurve = Math.max(1, ...costCurve)

  const filtered = filter === 'all' ? cards : cards.filter(c => c.type === filter)

  return (
    <>
      <div className="glass-panel library-panel">
        <div className="panel-title">卡牌库</div>
        <div className="type-filters">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`type-filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="card-grid">
          {filtered.map(card => (
            <div
              key={card.id}
              className={`card-item rarity-${card.rarity}`}
              onPointerDown={(e) => handlePointerDown(e, card)}
            >
              <div className="card-cost">{card.cost}</div>
              <div className="card-name">{card.name}</div>
              <div className="card-meta">
                <span className="card-effect-icon">{card.effectIcon}</span>
                <span>{CARD_TYPE_LABELS[card.type]}</span>
                {card.attack != null && card.attack > 0 && <span style={{color:'#ff8866'}}>⚔{card.attack}</span>}
                {card.health != null && card.health > 0 && card.effect === 'summon' && <span style={{color:'#88ff99'}}>❤{card.health}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`glass-panel deck-panel ${deckPanelOpen ? 'open' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onPointerEnter={(e) => { if (drag) { e.preventDefault(); setDragOver(true) } }}
        onPointerLeave={() => setDragOver(false)}
      >
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div className="panel-title" style={{marginBottom:0}}>我的卡组 ({deck.length}/{DECK_MAX_SIZE})</div>
          <button className="close-btn" onClick={toggleDeckPanel}>收起</button>
        </div>

        <div
          className={`deck-drop-zone ${dragOver ? 'drag-over' : ''} ${shakeIdx === -1 ? '' : ''}`}
          onPointerEnter={(e) => { if (drag) { e.preventDefault(); setDragOver(true) } }}
        >
          {deck.length === 0 && (
            <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#8888aa', fontSize:12, textAlign:'center'}}>
              将卡牌拖拽到此处构建卡组
            </div>
          )}
          <div className="deck-list">
            {deck.map((c, i) => (
              <div key={`${c.id}-${i}`} className={`deck-card rarity-${c.rarity} ${shakeIdx === i ? 'shake' : ''}`}>
                <div className="deck-card-cost">{c.cost}</div>
                <div className="deck-card-name">{c.name}</div>
                <button className="deck-card-remove" onClick={() => handleRemove(i)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="cost-curve" title="费用曲线">
          {costCurve.map((n, i) => (
            <div key={i} className="cost-bar" style={{ height: `${(n / maxCurve) * 100}%` }} />
          ))}
        </div>

        <div className="deck-stats">
          <span>平均费用: {avgCost}</span>
          <span>总数量: {deck.length}</span>
        </div>

        <button className="primary-btn" disabled={deck.length === 0} onClick={onStartBattle}>
          开始战斗
        </button>
      </div>

      {window.innerWidth <= 1280 && (
        <button className="deck-toggle glass-panel" onClick={toggleDeckPanel}>
          {deckPanelOpen ? '关闭卡组' : `卡组 (${deck.length})`}
        </button>
      )}

      {drag && (
        <div
          ref={dragGhostRef}
          className={`card-item rarity-${drag.card.rarity} dragging`}
          style={{ left: drag.x, top: drag.y, width: 200 }}
        >
          <div className="card-cost">{drag.card.cost}</div>
          <div className="card-name">{drag.card.name}</div>
          <div className="card-meta">
            <span className="card-effect-icon">{drag.card.effectIcon}</span>
            <span>{CARD_TYPE_LABELS[drag.card.type]}</span>
          </div>
        </div>
      )}
    </>
  )
}
