import { useState, useEffect, useCallback } from 'react'
import { Card } from '../utils/cards'

interface CardEditorProps {
  card: Card | null
  onCreate: (source: string, target: string, tags: string[], example: string) => void
  onUpdate: (id: string, updates: Partial<Pick<Card, 'source' | 'target' | 'tags' | 'example'>>) => void
}

export default function CardEditor({ card, onCreate, onUpdate }: CardEditorProps) {
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [example, setExample] = useState('')
  const [shake, setShake] = useState(false)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (card) {
      setSource(card.source)
      setTarget(card.target)
      setTagsInput(card.tags.join(', '))
      setExample(card.example)
    } else {
      setSource('')
      setTarget('')
      setTagsInput('')
      setExample('')
    }
  }, [card])

  const isDisabled = !source.trim() || !target.trim()

  const handleSubmit = useCallback(() => {
    if (isDisabled) {
      setShake(true)
      setTimeout(() => setShake(false), 300)
      return
    }

    setPulse(true)
    setTimeout(() => setPulse(false), 200)

    const tags = tagsInput
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0)

    setTimeout(() => {
      if (card) {
        onUpdate(card.id, {
          source: source.trim(),
          target: target.trim(),
          tags,
          example: example.trim()
        })
      } else {
        onCreate(source.trim(), target.trim(), tags, example.trim())
      }
    }, 100)
  }, [isDisabled, tagsInput, card, source, target, example, onCreate, onUpdate])

  const handleReset = () => {
    if (card) {
      setSource(card.source)
      setTarget(card.target)
      setTagsInput(card.tags.join(', '))
      setExample(card.example)
    } else {
      setSource('')
      setTarget('')
      setTagsInput('')
      setExample('')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E0E0E0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s ease',
    fontFamily: 'inherit'
  }

  return (
    <div style={{
      flex: 1,
      padding: 24,
      overflowY: 'auto',
      background: '#F8F9FA'
    }}>
      <div style={{
        maxWidth: 560,
        margin: '0 auto',
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: 24
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 20, color: '#2D3436' }}>
          {card ? '编辑卡片' : '新建卡片'}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#636E72',
            marginBottom: 6,
            fontWeight: 500
          }}>
            源语言文本 <span style={{ color: '#FF4757' }}>*</span>
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="请输入源语言文本..."
            style={{
              ...inputStyle,
              borderColor: !source.trim() && shake ? '#FF4757' : undefined
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#636E72',
            marginBottom: 6,
            fontWeight: 500
          }}>
            目标语言文本 <span style={{ color: '#FF4757' }}>*</span>
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="请输入目标语言文本..."
            style={{
              ...inputStyle,
              borderColor: !target.trim() && shake ? '#FF4757' : undefined
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#636E72',
            marginBottom: 6,
            fontWeight: 500
          }}>
            标签（可选，用逗号分隔）
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例如：日常, 商务, 旅游"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#636E72',
            marginBottom: 6,
            fontWeight: 500
          }}>
            例句（可选）
          </label>
          <textarea
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="请输入例句帮助记忆..."
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 80
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className={`btn btn-flip ${shake ? 'shake' : ''} ${pulse ? 'scale-pulse' : ''}`}
            onClick={handleSubmit}
            disabled={isDisabled}
            style={{ flex: 1, padding: '10px 20px', fontSize: 15 }}
          >
            {card ? '保存修改' : '创建卡片'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            style={{ padding: '10px 20px', fontSize: 15 }}
          >
            重置
          </button>
        </div>

        {card && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #F1F3F5' }}>
            <div style={{ fontSize: 12, color: '#636E72', marginBottom: 8 }}>
              <div>记忆等级：{'★'.repeat(card.level)}{'☆'.repeat(5 - card.level)}（{card.level}/5）</div>
              <div style={{ marginTop: 4 }}>创建时间：{new Date(card.createdAt).toLocaleString()}</div>
              <div style={{ marginTop: 4 }}>复习次数：{card.reviewCount}，正确次数：{card.correctCount}</div>
              <div style={{ marginTop: 4 }}>下次复习：{new Date(card.nextReviewAt).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
