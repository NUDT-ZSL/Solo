export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatTimeWithFrames(seconds: number, fps = 30): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00:00'
  const totalFrames = Math.round(seconds * fps)
  const m = Math.floor(totalFrames / (fps * 60))
  const s = Math.floor((totalFrames % (fps * 60)) / fps)
  const f = totalFrames % fps
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function generateThumbnail(
  videoUrl: string,
): Promise<{ duration: number; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = videoUrl

    const onLoaded = () => {
      const duration = video.duration
      video.currentTime = Math.min(1, duration * 0.1)
    }

    const onSeeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 180
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ duration: video.duration, thumbnail: '' })
        return
      }
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
        resolve({ duration: video.duration, thumbnail })
      } catch {
        resolve({ duration: video.duration, thumbnail: '' })
      }
    }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', () => reject(new Error('无法读取视频信息')))
  })
}
