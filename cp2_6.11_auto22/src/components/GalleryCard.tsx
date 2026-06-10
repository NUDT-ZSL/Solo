import { useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Trash2, Share2 } from "lucide-react"
import SpectrumCanvas from "@/components/SpectrumCanvas"

interface Voiceprint {
  id: string
  userId: string
  filename: string
  createdAt: string
  spectrum: { high: number; mid: number; low: number; mfcc: number[] }
  story: string
  tags: string[]
  favorited: boolean
}

interface GalleryCardProps {
  vp: Voiceprint
  onDelete: (id: string) => void
}

export default function GalleryCard({ vp, onDelete }: GalleryCardProps) {
  const [fading, setFading] = useState(false)
  const [toast, setToast] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const navigate = useNavigate()

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setFading(true)
      setTimeout(() => onDelete(vp.id), 300)
    },
    [vp.id, onDelete]
  )

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(window.location.origin + `/voiceprint/${vp.id}`)
    setToast(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(false), 1500)
  }, [vp.id])

  const date = vp.createdAt ? vp.createdAt.slice(0, 10) : ""

  return (
    <div
      onClick={() => navigate(`/voiceprint/${vp.id}`)}
      className={`relative rounded-xl border border-white/5 bg-base-700/50 backdrop-blur-glass p-4 cursor-pointer transition-all duration-300 hover:-translate-y-[5px] hover:shadow-lg hover:shadow-black/30 ${
        fading ? "card-fade-out" : ""
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-base-500">{date}</span>
        <span className="text-xs text-base-500 truncate max-w-[100px] ml-2">{vp.filename}</span>
      </div>
      <SpectrumCanvas spectrum={vp.spectrum} width={280} height={280} />
      <div className="flex justify-between items-center mt-3">
        <div className="flex gap-1 flex-wrap">
          {vp.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#E0F7FA] to-[#FCE4EC] text-base-900"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-base-600 transition-colors duration-200"
          >
            <Share2 className="w-4 h-4 text-base-500" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors duration-200"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
      {toast && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm pointer-events-none">
          <span className="px-4 py-2 text-sm text-white toast-fade">链接已复制</span>
        </div>
      )}
    </div>
  )
}
