import { useState, useCallback } from 'react'
import WordCloud3D from './WordCloud3D'

export type LayoutType = 'sphere' | 'spiral' | 'grid'

export interface WordData {
  text: string
  count: number
}

const STOPWORDS = new Set([
  '的', '了', '和', '是', '就', '都', '而', '及', '与', '这',
  '那', '在', '有', '也', '不', '我', '你', '他', '她', '它',
  '们', '之', '以', '为', '上', '下', '中', '等', '被', '把',
  '让', '到', '从', '去', '来', '会', '能', '要', '可', '对',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
  'may', 'might', 'can', 'could', 'must', 'ought', 'i', 'you', 'he', 'she',
  'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'and', 'but', 'if',
  'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'and'
])

function tokenize(text: string): string[] {
  const tokens: string[] = []
  const englishRegex = /[a-zA-Z]+/g
  const chineseRegex = /[\u4e00-\u9fa5]{2,}/g

  let match
  while ((match = englishRegex.exec(text)) !== null) {
    const word = match[0].toLowerCase()
    if (word.length > 1) {
      tokens.push(word)
    }
  }
  while ((match = chineseRegex.exec(text)) !== null) {
    const word = match[0]
    if (word.length >= 2) {
      tokens.push(word)
      if (word.length >= 3) {
        for (let i = 0; i <= word.length - 2; i++) {
          tokens.push(word.slice(i, i + 2))
        }
      }
    }
  }

  return tokens
}

function analyzeText(text: string): WordData[] {
  const tokens = tokenize(text)
  const freqMap = new Map<string, number>()

  for (const token of tokens) {
    if (!STOPWORDS.has(token) && token.trim().length > 0) {
      freqMap.set(token, (freqMap.get(token) || 0) + 1)
    }
  }

  const result = Array.from(freqMap.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  return result
}

export default function App() {
  const [inputText, setInputText] = useState('')
  const [words, setWords] = useState<WordData[]>([])
  const [layout, setLayout] = useState<LayoutType>('sphere')
  const [rotationSpeed, setRotationSpeed] = useState(1)
  const [resetKey, setResetKey] = useState(0)
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('sphere')

  const handleGenerate = useCallback(() => {
    if (inputText.trim().length < 10) {
      alert('请输入至少10个字符的文本')
      return
    }
    const result = analyzeText(inputText)
    if (result.length === 0) {
      alert('未能提取到有效关键词，请尝试输入更多文本')
      return
    }
    setWords(result)
  }, [inputText])

  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    setSelectedLayout(newLayout)
    setLayout(newLayout)
  }, [])

  const handleResetView = useCallback(() => {
    setResetKey(prev => prev + 1)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: 340,
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: 20,
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        border: '1px solid rgba(56,189,248,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <h2 style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 12,
          color: '#E2E8F0',
          letterSpacing: 0.5
        }}>3D 文字云生成器</h2>
        
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="请输入文本（至少10个字符，支持中英文）..."
          style={{
            width: '100%',
            height: 140,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(148,163,184,0.3)',
            borderRadius: 8,
            padding: 12,
            color: '#E2E8F0',
            fontSize: 13,
            lineHeight: 1.6,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#38BDF8'
            e.target.style.boxShadow = '0 0 0 2px rgba(56,189,248,0.2)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(148,163,184,0.3)'
            e.target.style.boxShadow = 'none'
          }}
        />

        <button
          onClick={handleGenerate}
          style={{
            width: '100%',
            height: 40,
            marginTop: 12,
            background: 'linear-gradient(135deg, #38BDF8, #0EA5E9)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            letterSpacing: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(56,189,248,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          生成文字云
        </button>

        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 16,
          justifyContent: 'center'
        }}>
          <button
            onClick={() => handleLayoutChange('sphere')}
            title="球形布局"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: selectedLayout === 'sphere' ? '2px solid #38BDF8' : '2px solid transparent',
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
              transition: 'all 0.2s ease',
              boxShadow: selectedLayout === 'sphere' ? '0 0 12px rgba(56,189,248,0.6)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            ●
          </button>

          <button
            onClick={() => handleLayoutChange('spiral')}
            title="螺旋形布局"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: selectedLayout === 'spiral' ? '2px solid #38BDF8' : '2px solid transparent',
              background: 'linear-gradient(135deg, #22C55E, #15803D)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
              transition: 'all 0.2s ease',
              boxShadow: selectedLayout === 'spiral' ? '0 0 12px rgba(56,189,248,0.6)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            @
          </button>

          <button
            onClick={() => handleLayoutChange('grid')}
            title="网格形布局"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: selectedLayout === 'grid' ? '2px solid #38BDF8' : '2px solid transparent',
              background: 'linear-gradient(135deg, #F97316, #C2410C)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
              transition: 'all 0.2s ease',
              boxShadow: selectedLayout === 'grid' ? '0 0 12px rgba(56,189,248,0.6)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            ▦
          </button>
        </div>

        <div style={{
          marginTop: 14,
          fontSize: 11,
          color: '#94A3B8',
          textAlign: 'center'
        }}>
          当前关键词数: {words.length}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        minWidth: 400,
        height: 40,
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 20,
        zIndex: 10,
        border: '1px solid rgba(56,189,248,0.15)'
      }}>
        <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>旋转速度</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>慢</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
            style={{
              flex: 1,
              height: 4,
              appearance: 'none',
              background: 'rgba(148,163,184,0.3)',
              borderRadius: 2,
              outline: 'none',
              cursor: 'pointer',
              accentColor: '#38BDF8'
            }}
          />
          <span style={{ fontSize: 11, color: '#64748B' }}>快</span>
        </div>
        <span style={{ fontSize: 12, color: '#38BDF8', minWidth: 36, textAlign: 'right' }}>
          {rotationSpeed.toFixed(1)}x
        </span>
        <div style={{ width: 1, height: 20, background: 'rgba(148,163,184,0.2)' }} />
        <button
          onClick={handleResetView}
          style={{
            height: 28,
            padding: '0 16px',
            background: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 14,
            color: '#38BDF8',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(56,189,248,0.3)'
            e.currentTarget.style.boxShadow = '0 0 8px rgba(56,189,248,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(56,189,248,0.15)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          重置视角
        </button>
      </div>

      <div style={{ position: 'absolute', inset: 0 }}>
        <WordCloud3D
          words={words}
          layout={layout}
          rotationSpeed={rotationSpeed}
          resetKey={resetKey}
        />
      </div>
    </div>
  )
}
