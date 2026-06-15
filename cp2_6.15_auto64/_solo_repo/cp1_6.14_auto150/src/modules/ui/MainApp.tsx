/**
 * MainApp - 主应用入口（全局状态管理与事件路由中心
 *
 * 模块间数据流向总览：
 *
 * ┌─────────────────┐      model:loaded       ┌─────────────────┐
 * │  FileUploader │──────────────────────▶│   ThreeViewer   │
 * │ (文件上传解析)│                        │  (3D渲染)       │
 * └─────────────────┘                        └─────────────────┘
 *         │                                           │
 *         │                                           │ click模型
 *         │                                           │ annotation:create
 *         │                                           ▼
 *         │                             ┌─────────────────┐
 *         │                             │ AnnotationEngine│
 *         │                             │  (批注管理)      │◀────────┐
 *         │                             └─────────────────┘          │
 *         │                                       │                  │
 *         │                                       │                  │
 *         │                     annotation:created  │                  │
 *         │                                       │                  │
 *         │                                       ▼                  │
 *         │                             ┌─────────────────┐      │
 *         └────────────────────────────▶│   ThreeViewer   │      │
 *         │                             │ (渲染标记球)     │      │
 *         │                             └─────────────────┘      │
 *         │                                                       │
 *         │ annotation:changed                                       │
 *         ▼                                                       │
 * ┌─────────────────┐                                            │
 * │ AnnotationPanel│                                            │
 * │  (批注列表UI)  │────────────────────────────────────────┘
 * └─────────────────┘   annotation:update/delete
 *         │
 *         │
 *         │ report:export
 *         ▼
 * ┌─────────────────┐      viewer:request-snapshot    ┌─────────────────┐
 * │  ReportExporter │─────────────────────────────▶│   ThreeViewer   │
 * │   (PDF导出)      │                               │   (截图)         │
 * └─────────────────┘◀────────────────────────────┘──────────────────┘
 *                            viewer:snapshot-ready
 *
 * 事件总线职责：
 * - MainApp 不直接参与模块间调用，所有通信都通过 EventBus
 * - 各模块通过订阅/发射事件进行松耦合通信
 * - MainApp 负责：
 *   1. 初始化各模块单例（annotationEngine, reportExporter）
 *   2. 监听 'error' 事件，统一处理各模块错误并弹出提示
 *   3. 管理全局 UI 状态（移动端布局、面板折叠、模型名称）
 *   4. 开发环境性能监控（FPS、虚拟滚动压力测试）
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import ThreeViewer from '@/modules/viewer/ThreeViewer'
import AnnotationPanel from './components/AnnotationPanel'
import ExportButton from './components/ExportButton'
import { annotationEngine } from '@/modules/annotation/AnnotationEngine'
import { reportExporter } from '@/modules/report/ReportExporter'
import { eventBus } from '@/utils/EventBus'
import type { ModelData } from '@/types'
import {
  startFpsMonitor,
  stopFpsMonitor,
  runAnnotationPerformanceTest,
  type PerformanceMetrics,
} from '@/utils/performanceTest'

const MainApp: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [currentModelName, setCurrentModelName] = useState<string>('')
  const [errorToast, setErrorToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })
  const [fps, setFps] = useState<number>(0)
  const [showPerfPanel, setShowPerfPanel] = useState<boolean>(false)

  const hideErrorToast = useCallback(() => {
    setErrorToast({ message: '', visible: false })
  }, [])

  useEffect(() => {
    void annotationEngine
    void reportExporter

    const handleModelLoaded = (modelData: ModelData) => {
      setCurrentModelName(modelData.name)
      annotationEngine.clearAnnotationsByModelId(modelData.id)
    }

    const handleError = (data: { source: string; message: string }) => {
      const fullMessage = `[${data.source}] ${data.message}`
      console.error(fullMessage)
      setErrorToast({ message: fullMessage, visible: true })
      setTimeout(hideErrorToast, 4000)
    }

    eventBus.on('model:loaded', handleModelLoaded)
    eventBus.on('error', handleError)

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    if (import.meta.env.DEV) {
      setShowPerfPanel(true)

      const handleFpsUpdate = (metrics: PerformanceMetrics) => {
        setFps(metrics.fps)
      }

      startFpsMonitor(handleFpsUpdate)

      const runPerformanceTest = async () => {
        console.log('[Performance] 开始性能测试...')
        await runAnnotationPerformanceTest(60)

        setTimeout(() => {
          annotationEngine.clearAll()
          console.log('[Performance] 性能测试完成，已清理测试数据')
        }, 3000)
      }

      setTimeout(runPerformanceTest, 2000)
    }

    return () => {
      window.removeEventListener('resize', checkMobile)
      eventBus.off('model:loaded', handleModelLoaded)
      eventBus.off('error', handleError)

      if (import.meta.env.DEV) {
        stopFpsMonitor()
      }
    }
  }, [hideErrorToast])

  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed)
  }

  const renderToastAndPerfPanel = () => (
    <>
      {errorToast.visible && (
        <div
          onClick={hideErrorToast}
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#e53e3e',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(229, 62, 62, 0.4)',
            zIndex: 1000,
            cursor: 'pointer',
            maxWidth: '80%',
            textAlign: 'center',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          ⚠️ {errorToast.message}
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
            点击关闭
          </div>
        </div>
      )}

      {showPerfPanel && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: fps >= 30 ? '#48bb78' : '#e53e3e',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          FPS: {fps} {fps >= 30 ? '✓' : '⚠️'}
        </div>
      )}
    </>
  )

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

        {renderToastAndPerfPanel()}
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

      {renderToastAndPerfPanel()}
    </div>
  )
}

export default MainApp
