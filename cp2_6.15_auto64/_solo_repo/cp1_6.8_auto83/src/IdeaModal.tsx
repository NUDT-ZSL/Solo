import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useIdeaStore, type Idea } from './IdeaEngine'

interface IdeaModalProps {
  idea: Idea
  onClose: () => void
  onInspire: (idea: Idea) => void
}

export const IdeaModal: React.FC<IdeaModalProps> = ({ idea, onClose, onInspire }) => {
  const [visible, setVisible] = useState(false)
  const fusionAnimation = useIdeaStore((s) => s.fusionAnimation)
  const isFusing = fusionAnimation?.toId === idea.id
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleInspire = () => {
    onInspire(idea)
    handleClose()
  }

  const scale = isFusing ? 1 + 0.3 * fusionAnimation!.progress : 1
  const glowIntensity = isFusing ? fusionAnimation!.progress : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        ref={contentRef}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 p-6 transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
          background: `linear-gradient(135deg, ${idea.color}15, ${idea.color}08)`,
          backdropFilter: 'blur(24px)',
          boxShadow: isFusing
            ? `0 0 ${40 + glowIntensity * 60}px ${idea.color}60, 0 0 ${80 + glowIntensity * 120}px ${idea.color}30`
            : `0 0 30px ${idea.color}20`,
          transform: `translateY(${visible ? 0 : 30}px) scale(${scale})`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-4">
          <div
            className="inline-block rounded-full px-3 py-1 text-xs font-medium mb-3"
            style={{
              background: `${idea.color}20`,
              color: idea.color,
              border: `1px solid ${idea.color}40`,
            }}
          >
            创意卡片
          </div>
        </div>

        <p className="text-white/90 text-lg leading-relaxed mb-6 font-light">
          {idea.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: idea.color }} />
            <span className="text-sm" style={{ color: `${idea.color}CC` }}>
              已被启发 {idea.inspiredCount} 次
            </span>
          </div>

          <button
            onClick={handleInspire}
            className="group relative px-5 py-2.5 rounded-xl font-medium text-sm text-white overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${idea.color}90, ${idea.color}60)`,
              boxShadow: `0 0 20px ${idea.color}40`,
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles size={14} />
              启发
            </span>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `linear-gradient(135deg, ${idea.color}B0, ${idea.color}80)`,
                boxShadow: `0 0 30px ${idea.color}60`,
              }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

interface PublishModalProps {
  onClose: () => void
}

export const PublishModal: React.FC<PublishModalProps> = ({ onClose }) => {
  const [content, setContent] = useState('')
  const [visible, setVisible] = useState(false)
  const publishIdea = useIdeaStore((s) => s.publishIdea)
  const publishing = useIdeaStore((s) => s.publishing)
  const setShowPublishModal = useIdeaStore((s) => s.setShowPublishModal)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      setShowPublishModal(false)
      onClose()
    }, 300)
  }

  const handlePublish = async () => {
    if (!content.trim() || content.length > 50 || publishing) return
    const result = await publishIdea(content.trim())
    if (result) {
      handleClose()
    }
  }

  const charCount = content.length
  const isOverLimit = charCount > 50

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 p-6 transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
          background: 'linear-gradient(135deg, rgba(13,2,33,0.9), rgba(10,22,40,0.9))',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 40px rgba(0,212,255,15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white/90 text-lg font-medium mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-[#00D4FF]" />
          发布创意
        </h3>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的灵感火花..."
          maxLength={50}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/50 focus:ring-1 focus:ring-[#00D4FF]/30 resize-none transition-all duration-200"
        />

        <div className="flex items-center justify-between mt-3">
          <span
            className={`text-xs ${isOverLimit ? 'text-[#FF2D95]' : 'text-white/30'}`}
          >
            {charCount}/50
          </span>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all duration-200"
            >
              取消
            </button>
            <button
              onClick={handlePublish}
              disabled={!content.trim() || isOverLimit || publishing}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, #00D4FF90, #39FF1460)',
                boxShadow: '0 0 20px rgba(0,212,255,30)',
              }}
            >
              {publishing ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
