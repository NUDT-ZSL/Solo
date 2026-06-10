import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Heart, Share2, Tag, Save } from "lucide-react"
import { useStore } from "@/store"
import SpectrumCanvas from "@/components/SpectrumCanvas"

function RingProgress({ value, color, label }: { value: number; color: string; label: string }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - value * circumference
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1A2A3A" strokeWidth={6} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="transition-all duration-500"
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="16" fontWeight="bold">
          {Math.round(value * 100)}%
        </text>
      </svg>
      <span className="text-xs text-base-500">{label}</span>
    </div>
  )
}

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const voiceprints = useStore((s) => s.voiceprints)
  const updateVoiceprint = useStore((s) => s.updateVoiceprint)
  const setActiveTag = useStore((s) => s.setActiveTag)
  const [story, setStory] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [heartAnim, setHeartAnim] = useState(false)
  const [toast, setToast] = useState(false)
  const [saving, setSaving] = useState(false)

  const vp = voiceprints.find((v) => v.id === id)

  useEffect(() => {
    if (vp) setStory(vp.story)
  }, [vp])

  const handleFavorite = useCallback(async () => {
    if (!vp) return
    setHeartAnim(true)
    setTimeout(() => setHeartAnim(false), 200)
    await updateVoiceprint(vp.id, { favorited: !vp.favorited })
  }, [vp, updateVoiceprint])

  const handleSave = useCallback(async () => {
    if (!vp) return
    setSaving(true)
    try {
      await updateVoiceprint(vp.id, { story })
    } finally {
      setSaving(false)
    }
  }, [vp, story, updateVoiceprint])

  const handleAddTag = useCallback(async () => {
    if (!vp || !tagInput.trim() || vp.tags.length >= 3) return
    const newTag = tagInput.trim()
    if (vp.tags.includes(newTag)) return
    await updateVoiceprint(vp.id, { tags: [...vp.tags, newTag] })
    setTagInput("")
  }, [vp, tagInput, updateVoiceprint])

  const handleTagClick = useCallback(
    (tag: string) => {
      setActiveTag(tag)
      navigate("/")
    },
    [setActiveTag, navigate]
  )

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.origin + `/voiceprint/${id}`)
    setToast(true)
    setTimeout(() => setToast(false), 1500)
  }, [id])

  if (!vp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-base-900 to-base-800">
        <p className="text-base-500">声纹不存在</p>
      </div>
    )
  }

  const date = vp.createdAt ? vp.createdAt.slice(0, 10) : ""

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-900 to-base-800">
      <nav className="sticky top-0 z-50 bg-base-900/80 backdrop-blur-glass border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-base-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-display text-lg font-semibold text-white">声纹详情</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-center">
          <SpectrumCanvas spectrum={vp.spectrum} width={Math.min(560, window.innerWidth * 0.7)} height={Math.min(560, window.innerWidth * 0.7)} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-base-700/50 backdrop-blur-glass p-4">
          <div>
            <p className="text-sm text-white font-medium">{vp.filename}</p>
            <p className="text-xs text-base-500 mt-1">上传于 {date}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFavorite}
              className="p-2 rounded-lg hover:bg-base-600 transition-colors duration-200"
            >
              <Heart
                className={`w-5 h-5 ${vp.favorited ? "text-red-500 fill-red-500" : "text-base-500"} ${
                  heartAnim ? "heart-pop" : ""
                }`}
              />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg hover:bg-base-600 transition-colors duration-200"
            >
              <Share2 className="w-5 h-5 text-base-500" />
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-8">
          <RingProgress value={vp.spectrum.high} color="#FF9800" label="高频" />
          <RingProgress value={vp.spectrum.mid} color="#4CAF50" label="中频" />
          <RingProgress value={vp.spectrum.low} color="#9C27B0" label="低频" />
        </div>

        <div className="rounded-xl border border-white/5 bg-base-700/50 backdrop-blur-glass p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-white font-medium">
            <Tag className="w-4 h-4 text-cyan-primary" /> 标签
          </div>
          <div className="flex flex-wrap gap-2">
            {vp.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-[#E0F7FA] to-[#FCE4EC] text-base-900 text-xs font-medium hover:brightness-110 transition-all duration-200"
              >
                {tag}
              </button>
            ))}
            {vp.tags.length < 3 && (
              <div className="flex items-center gap-1">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="添加标签"
                  maxLength={10}
                  className="w-20 rounded-lg border border-base-600 bg-base-800/50 px-2 py-1 text-xs text-white placeholder:text-base-500 focus:border-cyan-primary focus:outline-none transition-colors duration-200"
                />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-base-700/50 backdrop-blur-glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-medium">声纹故事</span>
            <span className="text-xs text-base-500">{story.length}/500</span>
          </div>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value.slice(0, 500))}
            placeholder="为这段声纹写下你的故事..."
            rows={4}
            className="w-full rounded-xl border border-base-600 bg-base-800/50 px-4 py-3 text-sm text-white placeholder:text-base-500 focus:border-cyan-primary focus:outline-none transition-colors duration-200 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-primary to-indigo-primary text-white text-sm font-medium hover:brightness-110 transition-all duration-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-base-800 border border-white/10 rounded-lg text-sm text-white toast-fade z-50">
          链接已复制
        </div>
      )}
    </div>
  )
}
