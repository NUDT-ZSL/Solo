import { useEffect, useState } from 'react'

interface WordCardProps {
  word: string
  index: number
  timeUsed: number
  isCorrect: boolean
  isLatest?: boolean
}

export default function WordCard({ word, index, timeUsed, isCorrect, isLatest }: WordCardProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const borderColor = isCorrect
    ? 'border-green-400/60'
    : 'border-red-400/60'

  const shadowColor = isCorrect
    ? 'shadow-green-200/40'
    : 'shadow-red-200/40'

  const badgeColor = isCorrect
    ? 'bg-green-400/20 text-green-700'
    : 'bg-red-400/20 text-red-700'

  const lastChar = word[word.length - 1]

  return (
    <div
      className={`
        relative flex items-center gap-3 px-4 py-3
        bg-white/60 backdrop-blur-md rounded-2xl
        border ${borderColor}
        shadow-lg ${shadowColor}
        transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${isLatest ? 'ring-2 ring-orange-300/50 scale-[1.02]' : ''}
      `}
    >
      <span className={`
        flex-shrink-0 w-7 h-7 rounded-full
        flex items-center justify-center
        text-xs font-bold
        ${badgeColor}
      `}>
        {index}
      </span>

      <span className="text-lg font-bold text-amber-900 tracking-wide">
        {word.slice(0, -1)}
        <span className="text-orange-500 text-xl">{lastChar}</span>
      </span>

      {timeUsed > 0 && (
        <span className="ml-auto text-xs text-amber-600/70 font-medium">
          {timeUsed.toFixed(1)}s
        </span>
      )}

      {isLatest && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-ping" />
      )}
    </div>
  )
}
