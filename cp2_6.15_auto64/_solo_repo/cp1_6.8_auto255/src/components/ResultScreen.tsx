import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { generateShareText, copyToClipboard } from '@/utils/shareUtils'
import { Trophy, Clock, Flame, Share2, RotateCcw, Check } from 'lucide-react'
import WordCard from './WordCard'

function AnimatedNumber({ target, duration = 800 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Number((target * eased).toFixed(1)))
      if (progress < 1) requestAnimationFrame(animate)
      else setCurrent(target)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return <>{Number.isInteger(target) ? Math.round(current) : current}</>
}

export default function ResultScreen() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const { wordHistory, mode, getStats, resetGame, dualScore } = useGameStore()

  const stats = getStats()

  const handleRestart = () => {
    resetGame()
    navigate('/')
  }

  const handleShare = async () => {
    const text = generateShareText(wordHistory, stats.totalWords, stats.avgTime, mode)
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statCards = [
    {
      icon: <Trophy className="w-5 h-5 text-amber-500" />,
      label: '总词数',
      value: stats.totalWords,
      color: 'from-amber-50 to-orange-50',
      border: 'border-amber-200/40',
    },
    {
      icon: <Clock className="w-5 h-5 text-sky-500" />,
      label: '平均用时',
      value: stats.avgTime,
      suffix: '秒',
      color: 'from-sky-50 to-blue-50',
      border: 'border-sky-200/40',
      decimal: true,
    },
    {
      icon: <Flame className="w-5 h-5 text-rose-500" />,
      label: '接龙链长',
      value: stats.longestChain,
      color: 'from-rose-50 to-pink-50',
      border: 'border-rose-200/40',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-1">游戏结束</h2>
        <p className="text-amber-600/70 text-sm">
          {mode === 'dual' ? '双人对战结果' : '单人练习成绩'}
        </p>
      </div>

      {mode === 'dual' && (
        <div className="flex gap-3 mb-4">
          <div className={`
            flex-1 text-center py-3 rounded-2xl
            bg-white/60 backdrop-blur-md border border-orange-200/40
            ${dualScore[0] > dualScore[1] ? 'ring-2 ring-orange-300' : ''}
          `}>
            <div className="text-xs text-orange-600/70 font-medium">玩家1</div>
            <div className="text-2xl font-bold text-orange-600">{dualScore[0]}</div>
          </div>
          <div className={`
            flex-1 text-center py-3 rounded-2xl
            bg-white/60 backdrop-blur-md border border-purple-200/40
            ${dualScore[1] > dualScore[0] ? 'ring-2 ring-purple-300' : ''}
          `}>
            <div className="text-xs text-purple-600/70 font-medium">玩家2</div>
            <div className="text-2xl font-bold text-purple-600">{dualScore[1]}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`
              text-center py-4 px-2 rounded-2xl
              bg-gradient-to-b ${card.color}
              backdrop-blur-md border ${card.border}
              shadow-lg shadow-orange-50/30
            `}
          >
            <div className="flex justify-center mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-amber-900">
              <AnimatedNumber
                target={card.decimal ? Number(card.value.toFixed(1)) : card.value}
                duration={1000}
              />
              {card.suffix && <span className="text-sm font-normal text-amber-600/70">{card.suffix}</span>}
            </div>
            <div className="text-xs text-amber-600/70 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 text-sm font-bold text-amber-800">接龙历史</div>
      <div
        className="flex-1 overflow-y-auto space-y-2 mb-6 pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#FDBA74 transparent' }}
      >
        {wordHistory.map((entry, idx) => (
          <WordCard
            key={`${entry.word}-${entry.timestamp}`}
            word={entry.word}
            index={idx + 1}
            timeUsed={entry.timeUsed}
            isCorrect={entry.isCorrect}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className={`
            flex-1 flex items-center justify-center gap-2
            py-4 rounded-full font-bold text-base
            transition-all duration-300 active:scale-95
            ${copied
              ? 'bg-green-400 text-white shadow-lg shadow-green-200/50'
              : 'bg-white/70 backdrop-blur-md text-amber-800 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 shadow-lg shadow-orange-100/30'
            }
          `}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              已复制
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              分享结果
            </>
          )}
        </button>

        <button
          onClick={handleRestart}
          className="
            flex-1 flex items-center justify-center gap-2
            py-4 rounded-full font-bold text-base
            bg-orange-400 text-white
            hover:bg-orange-500 active:scale-95
            transition-all duration-300
            shadow-lg shadow-orange-200/50
          "
        >
          <RotateCcw className="w-5 h-5" />
          再来一局
        </button>
      </div>
    </div>
  )
}
