import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'

interface UploadZoneProps {
  onUpload: (file: File) => void
  isParsing: boolean
  error: string
  success: string
}

export default function UploadZone({ onUpload, isParsing }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDragEnter, setIsDragEnter] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string => {
    const maxSize = 5 * 1024 * 1024
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPEG/PNG 格式图片'
    }
    if (file.size > maxSize) {
      return '图片大小不能超过 5MB'
    }
    return ''
  }

  const handleFile = useCallback((file: File) => {
    setFileError('')
    const err = validateFile(file)
    if (err) {
      setFileError(err)
      return
    }
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [])

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setIsDragEnter(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragEnter(true)
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragEnter(false)
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleClick = () => {
    if (!isParsing) {
      fileInputRef.current?.click()
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleParse = () => {
    if (!previewUrl || isParsing || !fileName) return
    const dataTransfer = new DataTransfer()
    const input = fileInputRef.current
    if (input && input.files && input.files.length > 0) {
      onUpload(input.files[0])
    } else {
      fetch(previewUrl)
        .then(r => r.blob())
        .then(blob => {
          const file = new File([blob], fileName, { type: blob.type })
          onUpload(file)
        })
    }
  }

  const handleClear = () => {
    if (isParsing) return
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
    setFileName('')
    setFileError('')
  }

  const onUploadWrapper = (file: File) => {
    onUpload(file)
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        style={{
          position: 'relative',
          padding: previewUrl ? 24 : 48,
          border: `2px dashed ${isDragging ? '#5B8DEF' : '#cbd5e0'}`,
          borderRadius: 12,
          background: isDragging ? '#EBF4FF' : '#FAFBFC',
          cursor: isParsing ? 'not-allowed' : 'pointer',
          transition: 'all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isDragging ? 'scale(1.015)' : 'scale(1)',
          textAlign: 'center',
          opacity: isParsing ? 0.6 : 1
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={isParsing}
        />

        {!previewUrl ? (
          <div
            style={{
              transition: 'all 300ms ease-out',
              transform: isDragging ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)',
              opacity: isDragging ? 1 : 0.9
            }}
          >
            <div style={{
              width: 72, height: 72, margin: '0 auto 18px',
              background: 'linear-gradient(135deg, #EBF4FF, #E2E8F0)',
              borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isDragging ? 'rotate(-8deg) scale(1.1)' : 'rotate(0) scale(1)'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p style={{
              fontSize: 16, fontWeight: 600, color: '#2D3748',
              margin: '0 0 6px 0'
            }}>
              点击上传或拖拽小票图片到此
            </p>
            <p style={{
              fontSize: 13, color: '#718096', margin: 0
            }}>
              支持 JPEG/PNG 格式，单张不超过 5MB
            </p>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{
              display: 'inline-block',
              padding: 8,
              background: '#ffffff',
              borderRadius: 10,
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              border: '1px solid #e8e8e8'
            }}>
              <img
                src={previewUrl}
                alt="小票预览"
                style={{
                  maxWidth: 300,
                  maxHeight: 300,
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 6,
                  display: 'block',
                  objectFit: 'contain'
                }}
              />
            </div>
            <p style={{
              fontSize: 13, color: '#4A5568',
              marginTop: 14, marginBottom: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 20px'
            }}>
              📎 {fileName}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              marginTop: 18,
              flexWrap: 'wrap'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleParse()
                }}
                disabled={isParsing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 28px',
                  background: isParsing ? '#90b4f2' : '#5B8DEF',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isParsing ? 'not-allowed' : 'pointer',
                  transition: 'background 200ms ease-out, transform 150ms',
                  minWidth: 120,
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!isParsing) e.currentTarget.style.background = '#4A7CDC'
                }}
                onMouseLeave={(e) => {
                  if (!isParsing) e.currentTarget.style.background = '#5B8DEF'
                }}
                onMouseDown={(e) => {
                  if (!isParsing) e.currentTarget.style.transform = 'scale(0.97)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {isParsing ? (
                  <>
                    <svg
                      className="spinner"
                      width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    解析中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    开始解析
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                disabled={isParsing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 28px',
                  background: isParsing ? '#bbb' : '#999999',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isParsing ? 'not-allowed' : 'pointer',
                  transition: 'background 200ms ease-out, transform 150ms',
                  minWidth: 100,
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!isParsing) e.currentTarget.style.background = '#7a7a7a'
                }}
                onMouseLeave={(e) => {
                  if (!isParsing) e.currentTarget.style.background = '#999999'
                }}
                onMouseDown={(e) => {
                  if (!isParsing) e.currentTarget.style.transform = 'scale(0.97)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
                清空
              </button>
            </div>
          </div>
        )}
      </div>

      {fileError && (
        <div className="fade-in" style={{
          marginTop: 14,
          padding: '12px 16px',
          background: '#FFF5F5',
          border: '1px solid #FEB2B2',
          borderRadius: 8,
          color: '#C53030',
          fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>⚠️</span>
          <span>{fileError}</span>
        </div>
      )}
    </div>
  )
}
