import React, { useState, useCallback } from 'react'
import axios from 'axios'
import * as exifr from 'exifr'
import { v4 as uuidv4 } from 'uuid'

export interface PhotoData {
  id: string
  filename: string
  originalName: string
  dataUrl: string
  latitude?: number
  longitude?: number
  takenAt: string
  exif?: Record<string, unknown>
}

interface UploadingPhoto {
  id: string
  file: File
  dataUrl: string
  originalName: string
  status: 'loading' | 'needs-input' | 'ready' | 'uploading' | 'done' | 'error'
  latitude?: number
  longitude?: number
  takenAt?: string
  errorMsg?: string
}

interface PhotoUploaderProps {
  onPhotosUploaded: (photos: PhotoData[]) => void
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const formatDateTimeLocal = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onPhotosUploaded }) => {
  const [photos, setPhotos] = useState<UploadingPhoto[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const newPhotos: UploadingPhoto[] = []

    for (const file of fileArray) {
      const id = uuidv4()
      try {
        const dataUrl = await fileToDataUrl(file)
        const entry: UploadingPhoto = {
          id,
          file,
          dataUrl,
          originalName: file.name,
          status: 'loading'
        }
        newPhotos.push(entry)
        setPhotos((prev) => [...prev, entry])

        try {
          const exif = await exifr.parse(file, {
            gps: true,
            exif: true,
            xmp: true
          })

          let latitude: number | undefined
          let longitude: number | undefined
          let takenAt: string | undefined

          if (exif) {
            if (typeof exif.latitude === 'number') latitude = exif.latitude
            if (typeof exif.longitude === 'number') longitude = exif.longitude
            if (exif.DateTimeOriginal instanceof Date) {
              takenAt = exif.DateTimeOriginal.toISOString()
            } else if (typeof exif.DateTimeOriginal === 'string') {
              const parsed = new Date(exif.DateTimeOriginal)
              if (!isNaN(parsed.getTime())) takenAt = parsed.toISOString()
            } else if (exif.CreateDate instanceof Date) {
              takenAt = exif.CreateDate.toISOString()
            }
          }

          const needsInput = !takenAt || (!latitude && latitude !== 0) || (!longitude && longitude !== 0)

          setPhotos((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    latitude,
                    longitude,
                    takenAt,
                    status: needsInput ? 'needs-input' : 'ready',
                    exif
                  }
                : p
            )
          )
        } catch (parseErr) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status: 'needs-input',
                    errorMsg: (parseErr as Error).message
                  }
                : p
            )
          )
        }
      } catch (err) {
        setPhotos((prev) => [
          ...prev,
          {
            id,
            file,
            dataUrl: '',
            originalName: file.name,
            status: 'error',
            errorMsg: (err as Error).message
          }
        ])
      }
    }
  }, [])

  const updatePhoto = (id: string, updates: Partial<UploadingPhoto>) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const updated = { ...p, ...updates }
        if (updates.takenAt && (updates.latitude || updates.latitude === 0) && (updates.longitude || updates.longitude === 0)) {
          updated.status = 'ready'
        }
        return updated
      })
    )
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const uploadAll = async () => {
    const ready = photos.filter((p) => p.status === 'ready')
    if (ready.length === 0) return

    setPhotos((prev) =>
      prev.map((p) => (p.status === 'ready' ? { ...p, status: 'uploading' } : p))
    )

    const uploaded: PhotoData[] = []
    for (const p of ready) {
      try {
        const payload = {
          id: p.id,
          filename: p.file.name,
          originalName: p.originalName,
          dataUrl: p.dataUrl,
          latitude: p.latitude,
          longitude: p.longitude,
          takenAt: p.takenAt
        }
        const resp = await axios.post('/api/photos', payload)
        uploaded.push(resp.data)
        setPhotos((prev) =>
          prev.map((ph) => (ph.id === p.id ? { ...ph, status: 'done' } : ph))
        )
      } catch (err) {
        setPhotos((prev) =>
          prev.map((ph) =>
            ph.id === p.id
              ? { ...ph, status: 'error', errorMsg: (err as Error).message }
              : ph
          )
        )
      }
    }

    if (uploaded.length > 0) {
      onPhotosUploaded(uploaded)
      setPhotos((prev) => prev.filter((p) => p.status !== 'done'))
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  return (
    <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
      <h2 style={{ marginBottom: 16, fontSize: '1.4rem', color: '#1f2937' }}>上传照片</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#f97316' : '#d1d5db'}`,
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          marginBottom: 24,
          background: dragOver ? '#fff7ed' : '#fafafa',
          transition: 'all 0.2s ease-out',
          cursor: 'pointer'
        }}
        onClick={() => (document.getElementById('ml-file-input') as HTMLInputElement)?.click()}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📷</div>
        <div style={{ fontWeight: 500, color: '#374151' }}>拖拽照片到此处，或点击选择文件</div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 8 }}>支持 JPG / PNG / HEIC，自动识别拍摄时间和位置</div>
        <input
          id="ml-file-input"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 200px)', gap: 16 }}>
          {photos.map((p) => (
            <div
              key={p.id}
              style={{
                width: 200,
                borderRadius: 16,
                border: '2px solid #ffffff',
                boxShadow: '0 1px 3px #d1d5db',
                background: '#ffffff',
                overflow: 'hidden',
                animation: 'fadeIn 0.4s ease-out'
              }}
            >
              <div style={{ position: 'relative', width: 200, height: 150, background: '#f3f4f6' }}>
                {p.dataUrl && (
                  <img src={p.dataUrl} alt={p.originalName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {p.status === 'loading' && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ animation: 'spin 1s linear infinite', fontSize: '1.8rem' }}>⏳</div>
                  </div>
                )}
                {p.status === 'uploading' && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(249,115,22,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontWeight: 500
                  }}>
                    上传中...
                  </div>
                )}
                <button
                  onClick={() => removePhoto(p.id)}
                  style={{
                    position: 'absolute', top: 6, right: 6, width: 24, height: 24,
                    borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.6)',
                    color: 'white', cursor: 'pointer', fontSize: '0.8rem'
                  }}
                >✕</button>
              </div>

              <div style={{ padding: 10, fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.originalName}
                </div>

                {p.status === 'needs-input' && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                      无法自动识别，请手动填写：
                    </div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>拍摄时间</label>
                    <input
                      type="datetime-local"
                      defaultValue={p.takenAt ? formatDateTimeLocal(new Date(p.takenAt)) : formatDateTimeLocal(new Date())}
                      onChange={(e) => {
                        const d = new Date(e.target.value)
                        updatePhoto(p.id, { takenAt: d.toISOString() })
                      }}
                      style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>纬度</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="39.9042"
                          defaultValue={p.latitude ?? ''}
                          onChange={(e) => {
                            const v = e.target.value ? parseFloat(e.target.value) : undefined
                            updatePhoto(p.id, { latitude: v })
                          }}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>经度</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="116.4074"
                          defaultValue={p.longitude ?? ''}
                          onChange={(e) => {
                            const v = e.target.value ? parseFloat(e.target.value) : undefined
                            updatePhoto(p.id, { longitude: v })
                          }}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const current = photos.find((ph) => ph.id === p.id)
                        if (!current) return
                        if (current.takenAt && (current.latitude || current.latitude === 0) && (current.longitude || current.longitude === 0)) {
                          setPhotos((prev) =>
                            prev.map((ph) =>
                              ph.id === p.id ? { ...ph, status: 'ready' } : ph
                            )
                          )
                        } else {
                          alert('请填写完整的拍摄时间、纬度和经度')
                        }
                      }}
                      style={{
                        marginTop: 4,
                        padding: '6px 10px',
                        background: 'linear-gradient(90deg, #f97316, #d946ef)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      确认并提交
                    </button>
                  </div>
                )}

                {p.status === 'ready' && (
                  <div style={{ color: '#16a34a', marginTop: 6, fontSize: '0.75rem' }}>✓ 已就绪</div>
                )}
                {p.status === 'done' && (
                  <div style={{ color: '#16a34a', marginTop: 6, fontSize: '0.75rem' }}>✓ 已上传</div>
                )}
                {p.status === 'error' && (
                  <div style={{ color: '#dc2626', marginTop: 6, fontSize: '0.75rem' }}>✗ {p.errorMsg || '出错'}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.some((p) => p.status === 'ready') && (
        <button
          onClick={uploadAll}
          style={{
            marginTop: 24, padding: '12px 32px', background: 'linear-gradient(90deg, #f97316, #d946ef)',
            color: 'white', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
          }}
        >
          上传 {photos.filter((p) => p.status === 'ready').length} 张照片
        </button>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default PhotoUploader
