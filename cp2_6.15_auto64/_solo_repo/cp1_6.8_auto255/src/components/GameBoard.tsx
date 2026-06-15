import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { playCorrectSound, playErrorSound, playTimeoutSound } from '@/utils/audioUtils'
import WordCard from './WordCard'

const ROUND_TIME = 20

function CircularTimer({ timeRemaining, total }: { timeRemaining: number; total: number }) {
  const radius = 28
  const stroke = 4
  const normalizedRadius = radius - stroke
  const circumference = normalizedRadius * 2 * Math.PI
  const progress = timeRemaining / total
  const strokeDashoffset = circumference * (1 - progress)

  const color = timeRemaining > 10
    ? '#FF9A56'
    : timeRemaining > 5
      ? '#FBBF24'
      : '#F87171'

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg
        width={radius * 2}
        height={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="#FED7AA"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease',
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span
        className="absolute text-lg font-bold"
        style={{ color }}
      >
        {timeRemaining}
      </span>
    </div>
  )
}

export default function GameBoard() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [shakeInput, setShakeInput] = useState(false)
  const [glowGreen, setGlowGreen] = useState(false)

  const {
    mode,
    status,
    currentWord,
    requiredChar,
    wordHistory,
    timeRemaining,
    currentPlayer,
    errorCount,
    feedbackState,
    errorMessage,
    tick,
    submitWord,
  } = useGameStore()

  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = setInterval(() => {
        tick()
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status, tick])

  useEffect(() => {
    if (status === 'finished') {
      if (timerRef.current) clearInterval(timerRef.current)
      if (timeRemaining <= 0) {
        playTimeoutSound()
      }
      const timer = setTimeout(() => navigate('/result'), 1200)
      return () => clearTimeout(timer)
    }
  }, [status, navigate, timeRemaining])

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [wordHistory])

  useEffect(() => {
    if (feedbackState === 'correct') {
      setGlowGreen(true)
      playCorrectSound()
      const timer = setTimeout(() => setGlowGreen(false), 600)
      return () => clearTimeout(timer)
    }
    if (feedbackState === 'error') {
      setShakeInput(true)
      playErrorSound()
      const timer = setTimeout(() => setShakeInput(false), 500)
      return () => clearTimeout(timer)
    }
  }, [feedbackState, wordHistory.length])

  useEffect(() => {
    if (status === 'playing' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [status, currentPlayer])

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim() || status !== 'playing') return
    submitWord(inputValue)
    setInputValue('')
  }, [inputValue, status, submitWord])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }, [handleSubmit])

  const correctCount = wordHistory.filter(w => w.isCorrect && w.timeUsed > 0).length

  const playerLabel = mode === 'dual' ? `玩家${currentPlayer}` : ''

  return (
    <div className="flex flex-col h-full min-h-screen px-4 py-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <CircularTimer timeRemaining={timeRemaining} total={ROUND_TIME} />

        <div className="text-center flex-1">
          {mode === 'dual' && (
            <span className={`
              inline-block px-3 py-0.5 rounded-full text-sm font-bold mb-1
              ${currentPlayer === 1 ? 'bg-orange-400/20 text-orange-700' : 'bg-purple-400/20 text-purple-700'}
            `}>
              {playerLabel}
            </span>
          )}
          <div className="text-xs text-amber-600/70">
            已接 {correctCount} 词
            {mode === 'dual' && (
              <> · 错误 {errorCount[currentPlayer - 1]}/3</>
            )}
          </div>
        </div>

        <div className="w-16" />
      </div>

      <div className="bg-white/50 backdrop-blur-lg rounded-3xl p-5 mb-4 shadow-lg shadow-orange-100/40 border border-orange-200/30">
        <div className="text-center text-xs text-amber-500/80 mb-2 font-medium tracking-wider">
          当前词语
        </div>
        <div className="text-center">
          <span className="text-3xl font-bold text-amber-900 tracking-widest">
            {currentWord.slice(0, -1)}
          </span>
          <span className="text-4xl font-bold text-orange-500 animate-pulse-gentle">
            {currentWord[currentWord.length - 1]}
          </span>
        </div>
        <div className="text-center mt-2 text-sm text-amber-600/70">
          请输入以「<span className="text-orange-500 font-bold text-base">{requiredChar}</span>」开头的词语
        </div>
      </div>

      <div
        ref={historyRef}
        className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 scrollbar-thin"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#FDBA74 transparent' }}
      >
        {wordHistory.map((entry, idx) => (
          <WordCard
            key={`${entry.word}-${entry.timestamp}`}
            word={entry.word}
            index={idx + 1}
            timeUsed={entry.timeUsed}
            isCorrect={entry.isCorrect}
            isLatest={idx === wordHistory.length - 1}
          />
        ))}
      </div>

      {errorMessage && feedbackState === 'error' && (
        <div className="text-center text-sm text-red-500 mb-2 animate-fade-in font-medium">
          {errorMessage}
        </div>
      )}

      <div className={`
        relative
        ${shakeInput ? 'animate-shake' : ''}
        ${glowGreen ? 'animate-glow-green' : ''}
      `}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入词语后按回车..."
          disabled={status !== 'playing'}
          className={`
            w-full px-5 py-4 rounded-full text-center text-lg font-bold
            bg-white/70 backdrop-blur-md
            border-2 transition-colors duration-300
            ${glowGreen
              ? 'border-green-400 shadow-lg shadow-green-200/50'
              : shakeInput
                ? 'border-red-400 shadow-lg shadow-red-200/50'
                : 'border-orange-200 focus:border-orange-400 shadow-lg shadow-orange-100/30'
            }
            text-amber-900 placeholder-amber-300/60
            outline-none
            focus:ring-4 focus:ring-orange-200/40
          `}
        />
        {inputValue && status === 'playing' && (
          <button
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2
              w-10 h-10 rounded-full bg-orange-400 text-white
              flex items-center justify-center
              hover:bg-orange-500 active:scale-95
              transition-all duration-150 shadow-md"
          >
            →
          </button>
        )}
      </div>
    </div>
  )
}
