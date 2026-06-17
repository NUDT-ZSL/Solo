import { useCallback, useRef, useState } from 'react'
import { Play, Upload } from 'lucide-react'
import { useAppStore } from './store'
import { formatDuration, formatFileSize } from './utils'
import type { Video } from './types'

export default function VideoUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { videos, setSelectedVideo, setIsPlayerOpen, addVideo } = useAppStore()

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/^video\/(mp4|mov|quicktime)/)) {
      alert('仅支持 MP4/MOV 格式')
      return
    }
    if (file.size > 200 * 1024 * 1024) {
      alert('单个文件不能超过 200MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('video', file)

      const res = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('上传失败')
      const video: Video = await res.json()
      addVideo(video)
    } catch (err) {
      console.error(err)
      alert('上传失败')
    } finally {
      setUploading(false)
    }
  }, [addVideo])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handlePlay = useCallback((video: Video) => {
    setSelectedVideo(video)
    setIsPlayerOpen(true)
  }, [setSelectedVideo, setIsPlayerOpen])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="mb-4">
        <h1 className="text-xl font-semibold mb-3 text-text-primary">视频素材库</h1>
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging ? 'border-accent bg-accent/5' : 'border-bg-tertiary hover:border-accent/50'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-accent" />
          <p className="text-text-primary font-medium mb-1">拖拽视频到此处，或点击上传</p>
          <p className="text-text-secondary text-sm">支持 MP4 / MOV 格式，单个不超过 200MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,.mov,.mp4"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
            <p>暂无视频素材</p>
            <p className="text-sm mt-1">上传视频开始标记剪辑</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-bg-secondary rounded-lg overflow-hidden flex flex-col"
                style={{ width: '320px' }}
              >
                <div className="relative" style={{ height: '180px' }}>
                  <video
                    className="w-full h-full object-cover"
                    src={video.filePath}
                    muted
                    preload="metadata"
                  />
                  <button
                    className="absolute bottom-3 left-3 w-9 h-9 rounded-full bg-accent flex items-center justify-center shadow-lg hover:bg-accent-hover transition-colors"
                    style={{ width: '36px', height: '36px' }}
                    onClick={() => handlePlay(video)}
                  >
                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" strokeWidth={0} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-text-primary font-medium truncate text-sm">{video.fileName}</p>
                  <div className="flex items-center justify-between mt-2 text-text-secondary text-xs">
                    <span>{formatDuration(video.duration)}</span>
                    <span>{formatFileSize(video.fileSize)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
