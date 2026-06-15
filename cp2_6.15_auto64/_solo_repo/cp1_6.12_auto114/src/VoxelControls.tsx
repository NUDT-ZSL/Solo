import React, { useCallback, useRef, useState } from 'react'
import { useVoxelStore } from './store'
import { processFiles, MAX_SLICES } from './voxelEngine'

const glassPanelStyle: React.CSSProperties = {
  background: 'rgba(30, 30, 40, 0.85)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: 'rgba(255, 255, 255, 0.1)',
  outline: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
}

const VoxelLimitWarning: React.FC = () => {
  const { voxelLimitWarning, dismissWarning } = useVoxelStore()

  if (!voxelLimitWarning) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        ...glassPanelStyle,
        background: 'rgba(40, 20, 20, 0.95)',
        padding: '24px 28px',
        maxWidth: '420px',
        zIndex: 1000,
        border: '1px solid rgba(255, 107, 53, 0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#FF6B35' }}>
          体素数量超限警告
        </h3>
      </div>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', marginBottom: '16px' }}>
        {voxelLimitWarning}
      </p>
      <button
        onClick={dismissWarning}
        style={{
          width: '100%',
          padding: '10px',
          background: 'rgba(255, 107, 53, 0.2)',
          color: '#FF6B35',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          ;(e.target as HTMLElement).style.background = 'rgba(255, 107, 53, 0.35)'
        }}
        onMouseLeave={(e) => {
          ;(e.target as HTMLElement).style.background = 'rgba(255, 107, 53, 0.2)'
        }}
      >
        我知道了
      </button>
    </div>
  )
}

export const UploadPanel: React.FC = () => {
  const { addSlices, setLoading, setError, slices, clearSlices } = useVoxelStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const remainingSlots = MAX_SLICES - slices.length
      if (remainingSlots <= 0) {
        setError(`最多只能上传 ${MAX_SLICES} 张切片`)
        return
      }

      const fileArray = Array.from(files)
      if (fileArray.length > remainingSlots) {
        setError(`还能上传 ${remainingSlots} 张切片`)
        return
      }

      setIsUploading(true)
      setLoading(true)
      setError(null)

      try {
        const sliceData = await processFiles(fileArray)
        addSlices(sliceData)
      } catch (err) {
        setError(err instanceof Error ? err.message : '上传失败')
      } finally {
        setIsUploading(false)
        setLoading(false)
      }
    },
    [addSlices, setLoading, setError, slices.length]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      e.target.value = ''
    },
    [handleFiles]
  )

  return (
    <div
      style={{
        ...glassPanelStyle,
        padding: '20px',
        marginBottom: '16px',
        transition: 'all 0.3s ease',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
        📁 上传切片
      </h3>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          border: `2px dashed ${isDragging ? '#FF6B35' : 'rgba(255,255,255,0.3)'}`,
          borderRadius: '12px',
          padding: '30px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          background: isDragging
            ? 'rgba(255, 107, 53, 0.1)'
            : 'rgba(255, 255, 255, 0.02)',
          animation: isUploading ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            marginBottom: '8px',
            transform: isDragging ? 'translateY(-5px)' : 'translateY(0)',
            transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          🖼️
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
          {isUploading ? '处理中...' : '拖拽图片到这里，或点击选择'}
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
          支持 PNG/JPEG，最多 {MAX_SLICES} 张
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {slices.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            已上传 {slices.length} 张
          </span>
          <button
            onClick={clearSlices}
            style={{
              background: 'rgba(255, 107, 53, 0.2)',
              color: '#FF6B35',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            清空
          </button>
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #FF6B35;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #FF6B35;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  )
}

export const ControlPanel: React.FC = () => {
  const {
    sliceSpacing,
    opacity,
    clipPlaneEnabled,
    clipPlaneZ,
    setSliceSpacing,
    setOpacity,
    setClipPlaneEnabled,
    setClipPlaneZ,
    slices,
  } = useVoxelStore()

  const maxClipZ = slices.length > 0 ? slices.length - 1 : 10

  return (
    <div style={{ ...glassPanelStyle, padding: '20px', marginBottom: '16px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
        ⚙️ 渲染控制
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
            切片间距
          </label>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#FF6B35',
              background: 'rgba(255, 107, 53, 0.15)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            {sliceSpacing.toFixed(2)}mm
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="2.0"
          step="0.05"
          value={sliceSpacing}
          onChange={(e) => setSliceSpacing(parseFloat(e.target.value))}
          style={sliderStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          <span>0.1mm</span>
          <span>2.0mm</span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
            透明度
          </label>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#FF6B35',
              background: 'rgba(255, 107, 53, 0.15)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            {opacity.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          style={sliderStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          <span>0</span>
          <span>1.0</span>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
            剖切面
          </label>
          <button
            onClick={() => setClipPlaneEnabled(!clipPlaneEnabled)}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              background: clipPlaneEnabled ? '#FF6B35' : 'rgba(255,255,255,0.2)',
              position: 'relative',
              transition: 'background 0.3s ease',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: clipPlaneEnabled ? '22px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.3s ease',
              }}
            />
          </button>
        </div>
        {clipPlaneEnabled && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                剖切位置
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#FF6B35',
                  background: 'rgba(255, 107, 53, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                Z={clipPlaneZ.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={maxClipZ}
              step="0.1"
              value={clipPlaneZ}
              onChange={(e) => setClipPlaneZ(parseFloat(e.target.value))}
              style={sliderStyle}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export const InfoPanel: React.FC = () => {
  const { voxelCount, slices, boundingBox } = useVoxelStore()

  return (
    <div
      style={{
        ...glassPanelStyle,
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '16px 20px',
        minWidth: '200px',
        zIndex: 100,
        background: 'rgba(30, 30, 40, 0.85)',
      }}
    >
      <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
        📊 模型信息
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            体素总数
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#fff',
            }}
          >
            {voxelCount.toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            切片数量
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#fff',
            }}
          >
            {slices.length}
          </span>
        </div>
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '8px',
            marginTop: '4px',
          }}
        >
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
            包围盒尺寸
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: '#FF6B35',
                  fontWeight: 'bold',
                }}
              >
                {boundingBox.x.toFixed(0)}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>X</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: '#4ECDC4',
                  fontWeight: 'bold',
                }}
              >
                {boundingBox.y.toFixed(0)}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Y</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: '#A66CFF',
                  fontWeight: 'bold',
                }}
              >
                {boundingBox.z.toFixed(1)}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Z</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const VoxelControls: React.FC = () => {
  const { error } = useVoxelStore()

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          width: '280px',
          zIndex: 100,
        }}
      >
        <div
          style={{
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              letterSpacing: '1px',
            }}
          >
            🧊 VoxelCanvas
          </h1>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            3D 体素可视化工具
          </p>
        </div>
        <UploadPanel />
        <ControlPanel />
        {error && (
          <div
            style={{
              ...glassPanelStyle,
              background: 'rgba(40, 20, 20, 0.9)',
              padding: '12px 16px',
              color: '#ff6b6b',
              fontSize: '12px',
              borderColor: 'rgba(255, 107, 107, 0.3)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>
      <InfoPanel />
      <VoxelLimitWarning />
    </>
  )
}
