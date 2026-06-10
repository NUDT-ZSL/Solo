export interface Voiceprint {
  id: string
  userId: string
  filename: string
  createdAt: string
  spectrum: { high: number; mid: number; low: number; mfcc: number[] }
  story: string
  tags: string[]
  favorited: boolean
}

import { useEffect, useRef, useState, useCallback } from "react"
import { Search, Upload, X, Disc3 } from "lucide-react"
import { useStore } from "@/store"
import { useDebounce } from "@/hooks/useDebounce"
import GalleryCard from "@/components/GalleryCard"
import SkeletonCard from "@/components/SkeletonCard"

export default function Gallery() {
  const voiceprints = useStore((s) => s.voiceprints)
  const loading = useStore((s) => s.loading)
  const uploading = useStore((s) => s.uploading)
  const searchQuery = useStore((s) => s.searchQuery)
  const activeTag = useStore((s) => s.activeTag)
  const fetchVoiceprints = useStore((s) => s.fetchVoiceprints)
  const uploadAudio = useStore((s) => s.uploadAudio)
  const deleteVoiceprint = useStore((s) => s.deleteVoiceprint)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const setActiveTag = useStore((s) => s.setActiveTag)
  const getFilteredVoiceprints = useStore((s) => s.getFilteredVoiceprints)

  const fileRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [uploadProgress, setUploadProgress] = useState(false)

  useEffect(() => {
    fetchVoiceprints()
  }, [debouncedSearch, activeTag])

  const filtered = getFilteredVoiceprints()

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 20 * 1024 * 1024) return
      setUploadProgress(true)
      try {
        await uploadAudio(file)
      } finally {
        setUploadProgress(false)
        if (fileRef.current) fileRef.current.value = ""
      }
    },
    [uploadAudio]
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-900 to-base-800">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-base-900/80 backdrop-blur-glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <h1 className="font-display text-xl font-bold bg-gradient-to-r from-cyan-primary to-indigo-primary bg-clip-text text-transparent whitespace-nowrap">
            声纹相簿
          </h1>
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索声纹故事或标签"
              className="w-full rounded-xl border border-base-600 bg-base-800/50 pl-9 pr-4 py-2 text-sm text-white placeholder:text-base-500 focus:border-cyan-primary focus:outline-none transition-colors duration-200"
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-primary to-indigo-primary text-white text-sm font-medium hover:brightness-110 transition-all duration-200"
          >
            <Upload className="w-4 h-4" /> 上传
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".wav,.mp3"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </nav>

      {uploadProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-900/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Disc3 className="w-12 h-12 text-cyan-primary spin-dots" />
            <p className="text-sm text-base-500">正在分析声纹...</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        {activeTag && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-base-500">筛选标签:</span>
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#E0F7FA] to-[#FCE4EC] text-base-900 text-xs font-medium">
              {activeTag}
              <button onClick={() => setActiveTag(null)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-base-500">
            <Disc3 className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">暂无声纹</p>
            <p className="text-sm mt-1">上传一段音频，开始你的声纹之旅</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filtered.map((vp) => (
              <GalleryCard key={vp.id} vp={vp} onDelete={deleteVoiceprint} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
