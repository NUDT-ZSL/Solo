import { useState, useEffect, useRef, useCallback } from 'react'
import { parseDNASequence, type ParsedDNAData } from './DNAParser'
import { DNAVisualizer } from './DNAVisualizer'

const MAX_SEQUENCE_LENGTH = 3000

function App() {
  const [sequence, setSequence] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [showModal, setShowModal] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [dragCount, setDragCount] = useState(0)
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderStage, setRenderStage] = useState('')
  const [renderEta, setRenderEta] = useState(-1)

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const visualizerRef = useRef<DNAVisualizer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parsedDataRef = useRef<ParsedDNAData | null>(null)
  const dragCountRef = useRef(0)

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

  const incrementDrag = useCallback(() => {
    dragCountRef.current += 1
    setDragCount(dragCountRef.current)
  }, [])

  const decrementDrag = useCallback(() => {
    dragCountRef.current = Math.max(0, dragCountRef.current - 1)
    setDragCount(dragCountRef.current)
  }, [])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      incrementDrag()
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    decrementDrag()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    dragCountRef.current = 0
    setDragCount(0)
    if (file) {
      await processFile(file)
    }
  }

  const handleUploadBtnDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    dragCountRef.current = 0
    setDragCount(0)
    if (file) {
      await processFile(file)
    }
  }

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
      setError('仅支持 .txt 格式的序列文件')
      setShowModal(true)
      return
    }

    try {
      const text = await file.text()
      const clean = text.replace(/\s/g, '')
      if (clean.length === 0) {
        setError('文件内容为空，请提供有效的DNA/RNA序列')
        setShowModal(true)
        return
      }

      const limited =
        clean.length > MAX_SEQUENCE_LENGTH
          ? clean.slice(0, MAX_SEQUENCE_LENGTH)
          : clean

      setSequence(limited)
      setError(null)
      setWarning(
        clean.length > MAX_SEQUENCE_LENGTH
          ? `序列过长，已自动截取前 ${MAX_SEQUENCE_LENGTH} 个碱基`
          : null,
      )
      setShowModal(true)
    } catch {
      setError('读取文件失败，请检查文件是否损坏')
      setShowModal(true)
    }
  }

  const handleGenerate = useCallback(async () => {
    const trimmed = sequence.trim()
    if (!trimmed) {
      setError('请输入DNA/RNA序列')
      return
    }

    setError(null)
    setWarning(null)
    setIsLoading(true)
    setRenderProgress(0)
    setRenderStage('解析序列...')
    setRenderEta(-1)

    await new Promise((resolve) => setTimeout(resolve, 30))

    try {
      const parsed = parseDNASequence(trimmed)
      parsedDataRef.current = parsed

      if (parsed.validBases === 0) {
        setError(
          '未检测到有效的碱基序列。请使用标准碱基字符：A, T, C, G, U',
        )
        setIsLoading(false)
        return
      }

      if (parsed.invalidChars.length > 0) {
        const charList = parsed.invalidChars
          .map((c) => `"${c}"`)
          .join('、')
        setWarning(`已忽略 ${parsed.invalidChars.length} 个无效字符：${charList}`)
      }

      if (parsed.validBases < trimmed.replace(/\s/g, '').length) {
        const invalidCount =
          trimmed.replace(/\s/g, '').length - parsed.validBases
        if (!warning && invalidCount > 0) {
          setWarning(`跳过了 ${invalidCount} 个无效字符`)
        }
      }

      if (visualizerRef.current) {
        await visualizerRef.current.renderDNA(
          parsed,
          (progress, stage, etaMs) => {
            setRenderProgress(progress)
            setRenderStage(stage)
            setRenderEta(etaMs)
          },
        )
      }

      setIsGenerated(true)
      setShowModal(false)
    } catch (err) {
      console.error('DNA渲染错误:', err)
      setError('渲染过程中发生错误，请尝试较短的序列')
    } finally {
      setIsLoading(false)
    }
  }, [sequence, warning])

  const handleSequenceChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const val = e.target.value
    const clean = val.replace(/\s/g, '')
    if (clean.length <= MAX_SEQUENCE_LENGTH) {
      setSequence(val)
    } else {
      setSequence(val.slice(0, MAX_SEQUENCE_LENGTH))
    }
    if (error) setError(null)
    if (warning) setWarning(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!isLoading && sequence.trim()) {
        handleGenerate()
      }
    }
  }

  const validBaseCount = sequence.replace(/[^ATCGUatcgu]/g, '').length
  const charCountClass =
    validBaseCount > MAX_SEQUENCE_LENGTH * 0.9
      ? validBaseCount >= MAX_SEQUENCE_LENGTH
        ? 'char-count error'
        : 'char-count warning'
      : 'char-count'

  const formatEta = (ms: number): string => {
    if (ms < 0) return '计算中...'
    if (ms < 1000) return '即将完成'
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) return `约 ${seconds} 秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `约 ${minutes}分${secs}秒`
  }

  const progressDeg = Math.min(360, renderProgress * 360)

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <nav className="navbar">
        <div className="navbar-title">BioMesh</div>
        <div className="navbar-right">
          {isGenerated && (
            <button
              className="edit-btn"
              onClick={() => setShowModal(true)}
            >
              编辑序列
            </button>
          )}
          <button
            className={`upload-btn ${dragCount > 0 ? 'dragging' : ''}`}
            onClick={handleUploadClick}
            onDragEnter={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (e.dataTransfer.types.includes('Files')) {
                incrementDrag()
              }
            }}
            onDragLeave={(e) => {
              e.stopPropagation()
              e.preventDefault()
              decrementDrag()
            }}
            onDragOver={(e) => {
              e.stopPropagation()
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={handleUploadBtnDrop}
          >
            {dragCount > 0 ? '释放以上传' : '上传 .txt 文件'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </nav>

      <div
        ref={canvasContainerRef}
        className={`canvas-container ${dragCount > 0 ? 'drag-overlay' : ''}`}
      />

      {isGenerated && (
        <div className="hint-bar">
          鼠标拖拽旋转 · 滚轮缩放 · 按 R 键重置视角
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && isGenerated && !isLoading) {
              setShowModal(false)
            }
          }}
        >
          <div className="modal-box">
            <h2 className="modal-title">输入 DNA / RNA 序列</h2>
            <p className="modal-subtitle">
              支持 A T C G U 字符，最多 {MAX_SEQUENCE_LENGTH} 个碱基
            </p>

            {error && <div className="error-msg">{error}</div>}
            {warning && !error && (
              <div className="warning-msg">{warning}</div>
            )}

            <div className="textarea-wrapper">
              <textarea
                className="sequence-textarea"
                value={sequence}
                onChange={handleSequenceChange}
                onKeyDown={handleKeyDown}
                placeholder="例如：ATCGATCGATCG...&#10;（Ctrl/Cmd + Enter 快速生成）"
                spellCheck={false}
                disabled={isLoading}
              />
            </div>

            <div className={charCountClass}>
              {validBaseCount} / {MAX_SEQUENCE_LENGTH} 有效碱基
            </div>

            {isLoading ? (
              <div className="loading-container">
                <div className="loading-ring-wrapper">
                  <div className="loading-ring-bg" />
                  <div
                    className="loading-ring-progress"
                    style={{
                      transform: `rotate(${progressDeg - 90}deg)`,
                      opacity: renderProgress > 0 ? 1 : 0,
                    }}
                  />
                  <div
                    className={`loading-ring-spinner ${renderProgress <= 0 ? 'indeterminate' : ''}`}
                  />
                  <div className="loading-percent">
                    {renderProgress > 0
                      ? `${Math.round(renderProgress * 100)}%`
                      : ''}
                  </div>
                </div>
                <div className="loading-info">
                  <div className="loading-stage">{renderStage}</div>
                  <div className="loading-eta">
                    剩余时间：{formatEta(renderEta)}
                  </div>
                </div>
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
                      setWarning(null)
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
