import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoFileRef = useRef<File | null>(null)
  const { addReportWithProgress } = useAddReport()
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      photoFileRef.current = file

      const reader = new FileReader()
      reader.onloadstart = () => {
        setIsUploading(true)
        setUploadProgress(0)
      }
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percent)
        }
      }
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
        setUploadProgress(100)
        setTimeout(() => {
          setIsUploading(false)
        }, 300)
      }
      reader.onerror = () => {
        setIsUploading(false)
        showToast('error', '图片读取失败')
      }
      reader.readAsDataURL(file)
    }
  }, [showToast])

  const removePhoto = () => {
    photoFileRef.current = null
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

    setIsSubmitting(true)
    setSubmitProgress(0)

    try {
      await addReportWithProgress(
        {
          type,
          lat: location[0],
          lng: location[1],
          description: description.trim(),
          photoUrl: photoPreview || undefined
        },
        (percent) => {
          setSubmitProgress(percent)
        }
      )

      showToast('success', '上报成功！感谢您的反馈')

      setType('rainstorm_flooding')
      setDescription('')
      photoFileRef.current = null
      setPhotoPreview(null)
      setUploadProgress(0)
      setSubmitProgress(0)

      onSuccess()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        showToast('error', '提交已取消')
      } else {
        showToast('error', '上报失败，请稍后重试')
      }
    } finally {
      setIsSubmitting(false)
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
          disabled={isSubmitting}
        >
          {REPORT_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.emoji} {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">位置信息</label>
        <div className="location-input-wrapper">
          <div className={`location-status ${locationStatus}`}>
            {locationStatus === 'loading' && '📡 获取位置中...'}
            {locationStatus === 'success' && location && (
              <>
                <span className="location-coords">
                  📍 {location[0].toFixed(4)}, {location[1].toFixed(4)}
                </span>
              </>
            )}
            {locationStatus === 'error' && '❌ 获取位置失败'}
            {locationStatus === 'idle' && '🔍 等待获取位置'}
          </div>
          <div className="location-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchLocation}
              disabled={isSubmitting || locationStatus === 'loading'}
            >
              重新获取
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onPickLocation}
              disabled={isSubmitting}
            >
              🗺️ 地图选择
            </button>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          灾情描述
          <span className={`char-count ${isOverLimit ? 'over-limit' : ''}`}>
            {description.length}/{maxLength}
          </span>
        </label>
        <textarea
          className={`form-textarea ${isOverLimit ? 'error' : ''}`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="请描述灾情情况（不超过200字）"
          maxLength={maxLength + 50}
          rows={4}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label className="form-label">照片上传</label>
        <div className="photo-upload-wrapper">
          {!photoPreview ? (
            <label className="photo-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="photo-input"
                disabled={isSubmitting || isUploading}
              />
              <div className="upload-icon">📷</div>
              <div className="upload-text">点击上传照片</div>
              <div className="upload-hint">支持 JPG、PNG 格式</div>
              {isUploading && (
                <div className="upload-progress-overlay">
                  <div
                    className="upload-progress-bar"
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <span className="upload-progress-text">{uploadProgress}%</span>
                </div>
              )}
            </label>
          ) : (
            <div className="photo-preview-wrapper">
              <img src={photoPreview} alt="Preview" className="photo-preview" />
              {isUploading && (
                <div className="upload-progress-overlay">
                  <div
                    className="upload-progress-bar"
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <span className="upload-progress-text">{uploadProgress}%</span>
                </div>
              )}
              <button
                type="button"
                className="photo-remove-btn"
                onClick={removePhoto}
                disabled={isSubmitting || isUploading}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {isSubmitting && (
        <div className="submit-progress-container">
          <div className="submit-progress-label">提交中... {submitProgress}%</div>
          <div className="submit-progress-bar">
            <div
              className="submit-progress-fill"
              style={{ width: `${submitProgress}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary submit-btn"
        disabled={isSubmitting || !location || isUploading}
      >
        {isSubmitting ? '提交中...' : '提交上报'}
      </button>
    </form>
  )
}
