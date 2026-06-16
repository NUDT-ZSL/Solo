import { useState, useEffect, useRef } from 'react'
import { useAddReport } from '../hooks/useReports'
import { useToast } from '../hooks/useToast'
import { getCurrentPosition } from '../utils/geolocation'
import { REPORT_TYPE_OPTIONS } from '../utils/constants'
import type { ReportType } from '../types'
import './ReportForm.css'

interface ReportFormProps {
  onSuccess: () => void
  initialLocation?: [number, number] | null
  onPickLocation?: () => void
}

export default function ReportForm({ onSuccess, initialLocation, onPickLocation }: ReportFormProps) {
  const [type, setType] = useState<ReportType>('rainstorm_flooding')
  const [location, setLocation] = useState<[number, number] | null>(initialLocation || null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addReport, loading } = useAddReport()
  const { toasts, showToast } = useToast()

  const maxLength = 200
  const remainingChars = maxLength - description.length
  const isOverLimit = remainingChars < 0

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation)
      setLocationStatus('success')
    } else {
      fetchLocation()
    }
  }, [initialLocation])

  const fetchLocation = async () => {
    setLocationStatus('loading')
    try {
      const pos = await getCurrentPosition()
      setLocation(pos)
      setLocationStatus('success')
    } catch {
      setLocationStatus('error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      setIsUploading(true)
      setUploadProgress(0)
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsUploading(false)
            return 100
          }
          return prev + 10
        })
      }, 100)
    }
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    setUploadProgress(0)
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!location) {
      showToast('error', '请先获取位置信息')
      return
    }
    
    if (isOverLimit) {
      showToast('error', '描述内容超出字数限制')
      return
    }
    
    if (isUploading) {
      showToast('error', '图片上传中，请稍候')
      return
    }

    try {
      await addReport({
        type,
        lat: location[0],
        lng: location[1],
        description: description.trim(),
        photoUrl: photoPreview || undefined
      })
      
      showToast('success', '上报成功！感谢您的反馈')
      
      setType('rainstorm_flooding')
      setDescription('')
      setPhoto(null)
      setPhotoPreview(null)
      setUploadProgress(0)
      
      onSuccess()
    } catch {
      showToast('error', '上报失败，请稍后重试')
    }
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">灾情类型</label>
        <select
          className="form-select"
          value={type}
          onChange={e => setType(e.target.value as ReportType)}
        >
          {REPORT_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          位置
          <span className="location-status">
            {locationStatus === 'loading' && '定位中...'}
            {locationStatus === 'success' && location && `(${location[0].toFixed(4)}, ${location[1].toFixed(4)})`}
            {locationStatus === 'error' && '定位失败'}
          </span>
        </label>
        <div className="location-actions">
          {locationStatus === 'error' && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchLocation}
              >
                重新定位
              </button>
              {onPickLocation && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onPickLocation}
                >
                  在地图选择
                </button>
              )}
            </>
          )}
          {locationStatus === 'success' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchLocation}
            >
              刷新位置
            </button>
          )}
          {locationStatus === 'loading' && (
            <span className="loading-spinner">⏳</span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          文字描述
          <span className={`char-count ${isOverLimit ? 'error' : ''}`}>
            {remainingChars}/{maxLength}
          </span>
        </label>
        <textarea
          className={`form-textarea ${isOverLimit ? 'error' : ''}`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="请描述灾情情况（最多200字）..."
          maxLength={maxLength + 50}
          rows={4}
        />
      </div>

      <div className="form-group">
        <label className="form-label">照片上传</label>
        <div className="photo-upload">
          {!photoPreview && (
            <label className="photo-upload-btn">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />
              <span className="upload-icon">📷</span>
              <span className="upload-text">点击上传照片</span>
            </label>
          )}
          {photoPreview && (
            <div className="photo-preview">
              <img src={photoPreview} alt="Preview" />
              {isUploading && (
                <div className="upload-progress-overlay">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
              )}
              {!isUploading && (
                <button
                  type="button"
                  className="photo-remove"
                  onClick={removePhoto}
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-submit"
        disabled={loading || isUploading || !location || isOverLimit}
      >
        {loading ? '提交中...' : '提交上报'}
      </button>

      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
          >
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </form>
  )
}
