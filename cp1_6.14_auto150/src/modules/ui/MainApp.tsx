import React, { useState, useEffect } from 'react'
import ThreeViewer from '@/modules/viewer/ThreeViewer'
import AnnotationPanel from './components/AnnotationPanel'
import ExportButton from './components/ExportButton'
import { annotationEngine } from '@/modules/annotation/AnnotationEngine'
import { reportExporter } from '@/modules/report/ReportExporter'
import { eventBus } from '@/utils/EventBus'
import type { ModelData } from '@/types'

const MainApp: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [currentModelName, setCurrentModelName] = useState<string>('')

  useEffect(() => {
    void annotationEngine
    void reportExporter

    const handleModelLoaded = (modelData: ModelData) => {
      setCurrentModelName(modelData.name)
      annotationEngine.clearAnnotationsByModelId(modelData.id)
    }

    eventBus.on('model:loaded', handleModelLoaded)

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
      eventBus.off('model:loaded', handleModelLoaded)
    }
  }, [])

  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed)
  }

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#1a202c',
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
            minHeight: 0,
          }}
        >
          <ThreeViewer />
        </div>

        <div
          style={{
            height: isPanelCollapsed ? '40px' : '250px',
            transition: 'height 0.3s ease',
            flexShrink: 0,
            borderTop: '1px solid #2d3748',
          }}
        >
          <div
            onClick={togglePanel}
            style={{
              height: '40px',
              backgroundColor: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: isPanelCollapsed ? 'none' : '1px solid #171923',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#e2e8f0',
                letterSpacing: '1px',
              }}
            >
              批注列表 {isPanelCollapsed ? '▲' : '▼'}
            </span>
          </div>
          {!isPanelCollapsed && (
            <div style={{ height: 'calc(100% - 40px)' }}>
              <AnnotationPanel />
            </div>
          )}
        </div>

        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 100,
          }}
        >
          <ExportButton />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a202c',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '70%',
          position: 'relative',
          height: '100%',
        }}
      >
        <ThreeViewer />
      </div>

      <div
        style={{
          width: '30%',
          height: '100%',
          flexShrink: 0,
          borderLeft: '1px solid #2d3748',
        }}
      >
        <AnnotationPanel />
      </div>

      <div
        style={{
          position: 'fixed',
          top: '16px',
          right: 'calc(30% + 16px)',
          zIndex: 100,
        }}
      >
        <ExportButton />
      </div>
    </div>
  )
}

export default MainApp
