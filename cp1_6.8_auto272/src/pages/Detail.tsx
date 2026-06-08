import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../App'
import SandTimer from '../components/SandTimer'
import { CountdownDisplay, useCountdown } from '../components/LetterCard'

interface Comment {
  id: number
  content: string
  nickname: string
  createdAt: string
}

interface Letter {
  id: number
  title: string
  content: string
  recipientNickname: string
  unlockAt: string
  isUnlocked: boolean
  isPublic: boolean
  likes: number
  hasLiked: boolean
  comments: Comment[]
  authorNickname: string
  createdAt: string
}

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const { user, token } = useAuth()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likeAnimating, setLikeAnimating] = useState(false)

  useEffect(() => {
    if (id) fetchLetter()
  }, [id])

  const fetchLetter = async () => {
    try {
      const headers: any = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await axios.get(`/api/letters/${id}`, { headers })
      setLetter(res.data)
    } catch (err: any) {
      setError(err.response?.data?.error || '信件不存在')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!token || !letter) return
    setLikeAnimating(true)
    try {
      const res = await axios.post(`/api/letters/${letter.id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLetter({ ...letter, likes: res.data.likes, hasLiked: res.data.hasLiked })
    } catch (err) {
      console.error('点赞失败:', err)
    }
    setTimeout(() => setLikeAnimating(false), 600)
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !letter || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await axios.post(`/api/letters/${letter.id}/comments`, {
        content: commentText.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLetter({
        ...letter,
        comments: [...letter.comments, res.data],
      })
      setCommentText('')
    } catch (err: any) {
      alert(err.response?.data?.error || '评论失败')
    } finally {
      setSubmittingComment(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-[var(--text-secondary)] text-sm">信件缓缓展开...</p>
      </div>
    )
  }

  if (error || !letter) {
    return (
      <div className="text-center py-20 animate-float-up">
        <div className="text-6xl mb-4">📭</div>
        <p className="text-xl text-[var(--text-secondary)] font-serif mb-4">{error || '信件不存在'}</p>
        <Link
          to="/"
          className="inline-block px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] hover:bg-white/10 transition-all duration-300"
        >
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        ← 返回信箱
      </Link>

      <div className="glass-card p-8 sm:p-10 animate-float-up">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-serif title-glow mb-3">{letter.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
              <span>✍️ {letter.authorNickname}</span>
              <span>👤 致 {letter.recipientNickname}</span>
              <span>📅 {formatDate(letter.createdAt)}</span>
            </div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full flex-shrink-0 ml-4 ${
            letter.isUnlocked
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          }`}>
            {letter.isUnlocked ? '✨ 已解锁' : '🔒 待解锁'}
          </span>
        </div>

        <div className="mb-6">
          <CountdownDisplay unlockAt={letter.unlockAt} isUnlocked={letter.isUnlocked} />
        </div>

        {!letter.isUnlocked ? (
          <div className="py-8">
            <SandTimer size={180} unlockAt={letter.unlockAt} />
            <div className="mt-8 p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="blur-preview text-sm leading-relaxed text-[var(--text-secondary)]">
                {letter.content}
              </p>
            </div>
            <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
              🔐 解锁时间：{formatDate(letter.unlockAt)}
            </p>
          </div>
        ) : (
          <div className="animate-float-up">
            <div className="p-6 sm:p-8 rounded-xl bg-white/[0.02] border border-white/5 mb-8">
              <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                {letter.content}
              </p>
            </div>

            <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/5">
              <button
                onClick={handleLike}
                disabled={!token}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 ${
                  letter.hasLiked
                    ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                    : 'bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:bg-white/10'
                } ${likeAnimating ? 'scale-110' : ''} ${!token ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <span className={`text-lg ${likeAnimating ? 'animate-bounce' : ''}`}>
                  {letter.hasLiked ? '❤️' : '🤍'}
                </span>
                <span className="text-sm">{letter.likes}</span>
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                📅 解锁于 {formatDate(letter.unlockAt)}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-serif title-glow mb-6">
                💬 评论 ({letter.comments.length})
              </h3>

              {token ? (
                <form onSubmit={handleComment} className="mb-8">
                  <div className="relative">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-white/20 outline-none input-glow transition-all duration-300 resize-none text-sm"
                      placeholder="写下你的想法..."
                      disabled={submittingComment}
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="absolute bottom-3 right-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/60 to-pink-600/60 text-white text-sm hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingComment ? '发送中...' : '发送'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-sm text-[var(--text-secondary)]">
                  🔑 请先登录后再评论
                </div>
              )}

              {letter.comments.length === 0 ? (
                <div className="text-center py-8 text-sm text-[var(--text-secondary)]">
                  还没有评论，来写第一条吧 ✍️
                </div>
              ) : (
                <div className="space-y-4">
                  {letter.comments.map((comment, i) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5 animate-float-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--accent-purple)]">
                          {comment.nickname}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
