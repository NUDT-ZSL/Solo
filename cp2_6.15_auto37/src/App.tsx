import { useState, useEffect } from 'react'
import UploadArea from './components/UploadArea'
import TerrainScene from './components/TerrainScene'
import ControlPanel from './components/ControlPanel'
import InfoPanel from './components/InfoPanel'
import { useTrailStore } from './store/trailStore'

export default function App() {
  const isLoading = useTrailStore((s) => s.isLoading)
  const loaded = useTrailStore((s) => s.loaded)
  const trailPoints = useTrailStore((s) => s.trailPoints)
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true)
    } else if (loaded && showSkeleton) {
      const timer = setTimeout(() => {
        setShowSkeleton(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isLoading, loaded, showSkeleton])

  const isNarrow = screenWidth < 900
  const isMobile = screenWidth < 600

  return (
    <div className="app-container" style={{
      flexDirection: isNarrow ? 'column' : 'row',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Left Panel - Upload Area */}
      <div
        className="left-panel"
        style={{
          width: isMobile ? '100%' : '380px',
          height: isNarrow ? 'auto' : '100%',
          padding: isMobile ? '12px' : '20px',
          flexShrink: 0,
          background: 'rgba(26, 35, 126, 0.6)',
          borderRight: isNarrow ? 'none' : '1px solid rgba(0, 230, 118, 0.2)',
          borderBottom: isNarrow ? '1px solid rgba(0, 230, 118, 0.2)' : 'none',
          overflowY: isNarrow ? 'auto' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 10,
        }}
      >
        <div className="left-panel-header">
          <div className="left-panel-title" style={{
            fontSize: isMobile ? '18px' : '20px',
          }}>
            🗺️ TrailView 3D
          </div>
          <div className="left-panel-subtitle">
            三维轨迹可视化工具
          </div>
        </div>

        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: isMobile ? 'center' : 'flex-start',
        }}>
          <UploadArea />
        </div>

        {loaded && trailPoints.length > 0 && (
          <div className="file-info">
            <div className="file-info-row">
              <span className="file-info-label">轨迹点数</span>
              <span className="file-info-value">{trailPoints.length} 个点</span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">海拔范围</span>
              <span className="file-info-value">
                {Math.min(...trailPoints.map(p => p.ele)).toFixed(1)} - {Math.max(...trailPoints.map(p => p.ele)).toFixed(1)} m
              </span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">经纬度范围</span>
              <span className="file-info-value" style={{ fontSize: '11px' }}>
                {Math.min(...trailPoints.map(p => p.lat)).toFixed(4)}°N ~ {Math.max(...trailPoints.map(p => p.lat)).toFixed(4)}°N
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className="main-content"
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: isNarrow ? '400px' : 0,
        }}
      >
        <div
          className="scene-container"
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minHeight: isNarrow ? '400px' : 0,
          }}
        >
          <TerrainScene />

          {/* Loading Skeleton Overlay */}
          {(isLoading || showSkeleton) && !loaded && (
            <div className="loading-overlay">
              <div style={{ textAlign: 'center' }}>
                <div className="skeleton-grid">
                  <div className="skeleton-grid-inner">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="skeleton-line h"
                        style={{ top: `${i * 25}%` }}
                      />
                    ))}
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={`v-${i}`}
                        className="skeleton-line v"
                        style={{ left: `${i * 25}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="loading-text">
                  {isLoading ? '正在加载地形数据...' : '正在构建3D场景...'}
                </div>
              </div>
            </div>
          )}

          {/* Info Panel - Positioned based on screen width */}
          {!isNarrow && (
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 5,
              maxHeight: 'calc(100% - 112px)',
              overflowY: 'auto',
            }}>
              <InfoPanel />
            </div>
          )}

          {/* Control Panel */}
          <div style={{
            position: 'absolute',
            left: isNarrow ? '8px' : '50%',
            right: isNarrow ? '8px' : 'auto',
            bottom: isNarrow ? (loaded ? '216px' : '16px') : '16px',
            transform: isNarrow ? 'none' : 'translateX(-50%)',
            zIndex: 20,
            width: isNarrow ? 'auto' : 'auto',
          }}>
            <ControlPanel />
          </div>
        </div>
      </div>

      {/* Right Panel - Info Panel for narrow screens */}
      {isNarrow && (
        <div style={{
          width: '100%',
          height: loaded ? '200px' : 'auto',
          maxHeight: '200px',
          overflowY: 'auto',
          flexShrink: 0,
          background: '#37474f',
          borderTop: '1px solid rgba(0, 230, 118, 0.2)',
        }}>
          <InfoPanel />
        </div>
      )}
    </div>
  )
}
