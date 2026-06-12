import { useState, useEffect, useRef, useCallback } from 'react'
import { parseDNASequence, type ParsedDNAData } from './DNAParser'
import { DNAVisualizer } from './DNAVisualizer'

const MAX_SEQUENCE_LENGTH = 3000

function App() {
  const [sequence, setSequence] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [showModal, setShowModal] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const visualizerRef = useRef<DNAVisualizer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parsedDataRef = useRef<ParsedDNAData | null>(null)

  useEffect(() => {
    if (canvasContainerRef.current && !visualizerRef.current) {
      visualizerRef.current = new DNAVisualizer(canvasContainerRef.current)
    }

    return () => {
      if (visualizerRef.current) {
        visualizerRef.current.dispose()
        visualizerRef.current = null
      }
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    const trimmed = sequence.trim()
    if (!trimmed) {
      setError('请输入DNA/RNA序列')
      return
    }

    setError(null)
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      const parsed = parseDNASequence(trimmed)
      parsedDataRef.current = parsed

      if (parsed.validBases === 0) {
        setError('未检测到有效的碱基序列（请使用 A, T, C, G, U）')
        setIsLoading(false)
        return
      }

      if (parsed.invalidChars.length > 0) {
        console.warn(
          '忽略无效字符:',
          parsed.invalidChars.join(', '),
        )
      }

      if (visualizerRef.current) {
        visualizerRef.current.renderDNA(parsed)
      }

      setIsGenerated(true)
      setShowModal(false)
    } catch (err) {
      setError('解析序列时发生错误')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [sequence])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('仅支持 .txt 格式文件')
      return
    }

    try {
      const text = await file.text()
      const clean = text.trim()
      if (clean.length > MAX_SEQUENCE_LENGTH) {
        setSequence(clean.slice(0, MAX_SEQUENCE_LENGTH))
      } else {
        setSequence(clean)
      }
      setError(null)
      setShowModal(true)
    } catch {
      setError('读取文件失败')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleSequenceChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const val = e.target.value
    if (val.length <= MAX_SEQUENCE_LENGTH) {
      setSequence(val)
    } else {
      setSequence(val.slice(0, MAX_SEQUENCE_LENGTH))
    }
    if (error) setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!isLoading && sequence.trim()) {
        handleGenerate()
      }
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ width: '100%', height: '100%' }}
    >
      <nav className="navbar">
        <div className="navbar-title">BioMesh</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isGenerated && (
            <button
              className="close-btn"
              onClick={() => setShowModal(true)}
              style={{ color: '#e2e8f0', borderColor: '#475569' }}
            >
              编辑序列
            </button>
          )}
          <button
            className={`upload-btn ${isDragging ? 'upload-zone-dragging' : ''}`}
            onClick={handleUploadClick}
            style={{
              border: isDragging ? '2px dashed #60a5fa' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            上传 .txt 文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </nav>

      <div ref={canvasContainerRef} className="canvas-container" />

      {isGenerated && (
        <div className="hint-bar">
          鼠标拖拽旋转 · 滚轮缩放 · 按 R 键重置视角
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget && isGenerated) {
            setShowModal(false)
          }
        }}>
          <div className="modal-box">
            <h2 className="modal-title">输入 DNA / RNA 序列</h2>
            <p className="modal-subtitle">
              支持 A T C G U 字符，最多 {MAX_SEQUENCE_LENGTH} 个碱基
            </p>

            {error && <div className="error-msg">{error}</div>}

            <div className="textarea-wrapper">
              <textarea
                className="sequence-textarea"
                value={sequence}
                onChange={handleSequenceChange}
                onKeyDown={handleKeyDown}
                placeholder="例如：ATCGATCGATCG..."
                spellCheck={false}
              />
            </div>

            <div className="char-count">
              {sequence.trim().length} / {MAX_SEQUENCE_LENGTH} 碱基
            </div>

            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner" />
              </div>
            ) : (
              <div className="modal-actions">
                <button
                  className="close-btn"
                  onClick={() => {
                    if (isGenerated) {
                      setShowModal(false)
                    } else {
                      setSequence('')
                      setError(null)
                    }
                  }}
                >
                  {isGenerated ? '取消' : '清空'}
                </button>
                <button
                  className="generate-btn"
                  onClick={handleGenerate}
                  disabled={!sequence.trim() || isLoading}
                >
                  生成 3D 结构
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
