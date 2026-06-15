import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '@/store'
import { analyzeText } from '@/utils/textAnalysis'
import { computeCloudLayout, type CloudWord } from '@/utils/cloudLayout'
import { poems } from '@/utils/poems'
import GlassCard from './GlassCard'

interface BurstApi {
  burst: (x: number, y: number, color: string) => void
}

export default function WordCloud({ burstApi }: { burstApi: BurstApi | null }) {
  const {
    inputText,
    selectedPoemId,
    hoveredWord,
    activeWord,
    setCloudWords,
    setKeywords,
    setActiveWord,
    setHoveredWord,
    cloudWords,
  } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [cardInfo, setCardInfo] = useState<{
    word: string
    frequency: number
    sentiment: 'positive' | 'neutral' | 'melancholic' | 'heroic'
    sourceLines: string[]
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!inputText.trim()) {
      setCloudWords([])
      setKeywords([])
      return
    }
    const poem = selectedPoemId ? poems.find(p => p.id === selectedPoemId) : null
    const sourceLines = poem ? poem.lines : inputText.split(/[。！？\n]/).filter(Boolean)
    const keywords = analyzeText(inputText, sourceLines)
    setKeywords(keywords)
    const layout = computeCloudLayout(keywords, dimensions.width, dimensions.height)
    setCloudWords(layout)
  }, [inputText, selectedPoemId, dimensions, setCloudWords, setKeywords])

  const handleMouseEnter = useCallback(
    (word: CloudWord, e: React.MouseEvent) => {
      setHoveredWord(word.text)
      const rect = (e.target as SVGTextElement).getBoundingClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (containerRect) {
        setCardInfo({
          word: word.text,
          frequency: word.frequency,
          sentiment: word.sentiment as any,
          sourceLines: word.sourceLines,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top,
        })
      }
    },
    [setHoveredWord],
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredWord(null)
    setCardInfo(null)
  }, [setHoveredWord])

  const handleClick = useCallback(
    (word: CloudWord, e: React.MouseEvent) => {
      setActiveWord(word.text)
      if (burstApi) {
        const rect = (e.target as SVGTextElement).getBoundingClientRect()
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (containerRect) {
          burstApi.burst(
            rect.left - containerRect.left + rect.width / 2,
            rect.top - containerRect.top + rect.height / 2,
            word.color,
          )
        }
      }
      const poemSection = document.getElementById('poem-display')
      if (poemSection) {
        poemSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [setActiveWord, burstApi],
  )

  const isHovered = (word: CloudWord) => hoveredWord === word.text
  const isActive = (word: CloudWord) => activeWord === word.text

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="block"
      >
        {cloudWords.map((word, i) => {
          const hovered = isHovered(word)
          const active = isActive(word)
          const scale = hovered ? 1.25 : active ? 1.15 : 1
          return (
            <text
              key={`${word.text}-${i}`}
              x={word.x}
              y={word.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={word.fontSize}
              fontFamily="'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif"
              fontWeight={hovered || active ? 700 : 500}
              fill={word.color}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
                transform: `scale(${scale})`,
                transformOrigin: `${word.x}px ${word.y}px`,
                opacity: hoveredWord && !hovered ? 0.4 : 1,
                userSelect: 'none',
              }}
              onMouseEnter={e => handleMouseEnter(word, e)}
              onMouseLeave={handleMouseLeave}
              onClick={e => handleClick(word, e)}
            >
              {word.text}
            </text>
          )
        })}
      </svg>

      {cardInfo && (
        <GlassCard
          word={cardInfo.word}
          frequency={cardInfo.frequency}
          sentiment={cardInfo.sentiment}
          sourceLines={cardInfo.sourceLines}
          x={cardInfo.x}
          y={cardInfo.y}
        />
      )}

      {!inputText.trim() && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="font-serif text-lg text-amber-400/40">输入文本或选择诗词，生成词云</p>
        </div>
      )}
    </div>
  )
}
