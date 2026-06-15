import { useCallback, useRef, useState } from 'react'
import { useTrailStore } from '../store/trailStore'
import { parseGPX } from '../parser/gpxParser'
import { loadTerrain } from '../parser/terrainLoader'

export default function UploadArea() {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setTrailPoints = useTrailStore((s) => s.setTrailPoints)
  const setTerrainData = useTrailStore((s) => s.setTerrainData)
  const setIsLoading = useTrailStore((s) => s.setIsLoading)
  const setLoaded = useTrailStore((s) => s.setLoaded)
  const reset = useTrailStore((s) => s.reset)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      alert('请上传GPX格式的轨迹文件')
      return
    }

    reset()
    setIsLoading(true)

    try {
      const text = await file.text()
      const points = parseGPX(text)

      if (points.length === 0) {
        alert('未能从GPX文件中解析出有效轨迹点')
        setIsLoading(false)
        return
      }

      setTrailPoints(points)

      const terrainData = await loadTerrain(points)
      setTerrainData(terrainData)
      setLoaded(true)
    } catch (error) {
      console.error('解析GPX文件失败:', error)
      alert('解析GPX文件失败，请检查文件格式')
    } finally {
      setIsLoading(false)
    }
  }, [reset, setIsLoading, setTrailPoints, setTerrainData, setLoaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFile])

  return (
    <div
      className={`upload-area ${isDragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="upload-icon">📊</div>
      <div className="upload-text">点击或拖拽上传GPX文件</div>
      <div className="upload-hint">支持 .gpx 格式轨迹文件</div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        onChange={handleInputChange}
      />
    </div>
  )
}
