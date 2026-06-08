import React, { useState, useEffect } from 'react'
import axios from 'axios'
import LetterCard from '../components/LetterCard'

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

export default function Home() {
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'locked' | 'unlocked'>('all')

  useEffect(() => {
    fetchLetters()
  }, [])

  const fetchLetters = async () => {
    try {
      const res = await axios.get('/api/letters')
      setLetters(res.data)
    } catch (err) {
      console.error('获取信件失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLetters = letters.filter(l => {
    if (filter === 'locked') return !l.isUnlocked
    if (filter === 'unlocked') return l.isUnlocked
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-12 animate-float-up">
        <h1 className="text-4xl sm:text-5xl font-serif shimmer-text font-bold mb-4">
          🕰️ 回声信箱
        </h1>
        <p className="text-lg text-[var(--text-secondary)] font-serif max-w-xl mx-auto leading-relaxed">
          写一封未来的信，让时光替你传递此刻的心声
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-8 animate-float-up" style={{ animationDelay: '0.2s' }}>
        {(['all', 'locked', 'unlocked'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm transition-all duration-300 ${
              filter === f
                ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white border border-purple-500/30'
                : 'bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:bg-white/10'
            }`}
          >
            {f === 'all' ? '🌊 全部' : f === 'locked' ? '🔒 未解锁' : '✨ 已解锁'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">信件飘来的路上...</p>
        </div>
      ) : filteredLetters.length === 0 ? (
        <div className="text-center py-20 animate-float-up">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-[var(--text-secondary)] font-serif mb-2">
            {filter === 'all' ? '信箱空空如也' : `没有${filter === 'locked' ? '未解锁' : '已解锁'}的信件`}
          </p>
          <p className="text-sm text-[var(--text-secondary)] opacity-60">
            点击右上角「写信」来写一封未来的信吧
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLetters.map((letter, index) => (
            <LetterCard key={letter.id} letter={letter} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
