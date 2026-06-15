import type { Sentiment } from '@/utils/textAnalysis'

interface GlassCardProps {
  word: string
  frequency: number
  sentiment: Sentiment
  sourceLines: string[]
  x: number
  y: number
}

const sentimentLabels: Record<Sentiment, string> = {
  positive: '明丽',
  neutral: '淡远',
  melancholic: '悲怆',
  heroic: '豪迈',
}

const sentimentBg: Record<Sentiment, string> = {
  positive: 'bg-amber-100/80 text-amber-800',
  neutral: 'bg-gray-100/80 text-gray-700',
  melancholic: 'bg-purple-100/80 text-purple-800',
  heroic: 'bg-blue-100/80 text-blue-800',
}

export default function GlassCard({ word, frequency, sentiment, sourceLines, x, y }: GlassCardProps) {
  const cardWidth = 220
  const offsetX = x + 20
  const offsetY = y - 10

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: offsetX,
        top: offsetY,
        width: cardWidth,
        animation: 'fadeInCard 0.25s ease-out',
      }}
    >
      <div
        className="rounded-xl border border-amber-200/40 p-4 shadow-lg"
        style={{
          background: 'rgba(255, 252, 245, 0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 8px 32px rgba(184, 134, 11, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="font-serif text-lg font-bold text-amber-900">{word}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sentimentBg[sentiment]}`}>
            {sentimentLabels[sentiment]}
          </span>
        </div>

        <div className="mb-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-amber-800">{frequency}</span>
          <span className="text-xs text-amber-700/70">次出现</span>
        </div>

        {sourceLines.length > 0 && (
          <div className="border-t border-amber-200/30 pt-2">
            <p className="mb-1 text-xs font-medium text-amber-800/60">诗句出处</p>
            {sourceLines.slice(0, 3).map((line, i) => (
              <p key={i} className="font-serif text-sm leading-relaxed text-gray-700">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
