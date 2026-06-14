import React, { useRef, useState, useCallback } from 'react'
import { fileUploader } from './FileUploader'

interface FileDropZoneProps {
  className?: string
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ className }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setIsLoading(true)

    const validation = fileUploader.validateFile(file)
    if (!validation.valid) {
      setError(validation.error || '文件验证失败')
      setIsLoading(false)
      return
    }

    await fileUploader.loadModel(file)
    setIsLoading(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFile]
  )

  return (
    <div
      className={`file-drop-zone ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: '200px',
        border: `2px dashed ${isDragging ? '#3b82f6' : '#4a5568'}`,
        borderRadius: '12px',
        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'all 0.3s ease',
        textAlign: 'center',
        padding: '24px',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".gltf,.glb"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}
      >
        📦
      </div>
      <div
        style={{
          fontSize: '16px',
          fontWeight: 500,
          marginBottom: '8px',
          color: '#e2e8f0',
        }}
      >
        {isLoading ? '正在加载模型...' : '拖拽 glTF/GLB 文件到此处'}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#718096',
        }}
      >
        或点击选择文件 · 最大支持 50MB
      </div>
      {error && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#ef4444',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}

export default FileDropZone
