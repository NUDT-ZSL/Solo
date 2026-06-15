import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface Letter {
  id: number
  title: string
  content: string
  recipientNickname: string
  unlockAt: string
  isUnlocked: boolean
  likes: number
  comments: { id: number; content: string; nickname: string; createdAt: string }[]
  authorNickname: string
  createdAt: string
}

interface LetterCardProps {
  letter: Letter
  index: number
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime()
      const target = new Date(targetDate).getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

function CountdownDisplay({ unlockAt, isUnlocked }: { unlockAt: string; isUnlocked: boolean }) {
  const timeLeft = useCountdown(unlockAt)

  if (isUnlocked || timeLeft.expired) {
    return (
      <div className="flex items-center gap-1.5 countdown-pulse">
        <span className="text-[var(--accent-gold)] text-xs">✨</span>
        <span className="text-[var(--accent-gold)] text-sm font-medium">已解锁</span>
      </div>
    )
  }

  return (
    <div className="countdown-pulse">
      <div className="flex items-center gap-1">
        <span className="text-[var(--accent-purple)] text-xs">⏳</span>
        <div className="flex gap-1 text-xs font-mono">
          {timeLeft.days > 0 && (
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-[var(--accent-purple)]">
              {timeLeft.days}<span className="text-[var(--text-secondary)] ml-0.5">天</span>
            </span>
          )}
          <span className="bg-white/5 px-1.5 py-0.5 rounded text-[var(--accent-pink)]">
            {String(timeLeft.hours).padStart(2, '0')}<span className="text-[var(--text-secondary)] ml-0.5">时</span>
          </span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded text-[var(--accent-purple)]">
            {String(timeLeft.minutes).padStart(2, '0')}<span className="text-[var(--text-secondary)] ml-0.5">分</span>
          </span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded text-[var(--accent-pink)]">
            {String(timeLeft.seconds).padStart(2, '0')}<span className="text-[var(--text-secondary)] ml-0.5">秒</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default function LetterCard({ letter, index }: LetterCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      to={`/letter/${letter.id}`}
      className="block animate-float-up"
      style={{ animationDelay: `${index * 0.08}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="glass-card p-6 relative overflow-hidden group cursor-pointer"
        style={{
          boxShadow: isHovered
            ? '0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
            : undefined,
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-500/5 to-transparent rounded-tr-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-serif title-glow leading-tight flex-1 mr-3">
              {letter.title}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
              letter.isUnlocked
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {letter.isUnlocked ? '已解锁' : '待解锁'}
            </span>
          </div>

          <div className="mb-4">
            <CountdownDisplay unlockAt={letter.unlockAt} isUnlocked={letter.isUnlocked} />
          </div>

          <div className={`mb-4 text-sm leading-relaxed ${letter.isUnlocked ? 'text-[var(--text-primary)]' : 'blur-preview'}`}>
            {letter.content}
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                👤 {letter.recipientNickname}
              </span>
              <span className="flex items-center gap-1">
                ✍️ {letter.authorNickname}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                ❤️ {letter.likes}
              </span>
              <span className="flex items-center gap-1">
                💬 {letter.comments.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export { CountdownDisplay, useCountdown }
