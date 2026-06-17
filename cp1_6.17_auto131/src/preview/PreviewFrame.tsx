import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './PreviewFrame.module.css'

interface PreviewFrameProps {
  width: number
  deviceName: string
  showSafeArea: boolean
  showTouchHotspots: boolean
  enableInteraction: boolean
  bgColor: string
  onInteraction: (data: { type: string; target: string; detail?: string }) => void
}

const PreviewFrame = ({
  width,
  deviceName,
  showSafeArea,
  showTouchHotspots,
  enableInteraction,
  bgColor,
  onInteraction
}: PreviewFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [iframeHeight, setIframeHeight] = useState<number>(600)
  const [hotspots, setHotspots] = useState<Array<{ x: number; y: number; w: number; h: number }>>([])

  useEffect(() => {
    const updateHeight = () => {
      const container = containerRef.current
      if (container) {
        const containerHeight = container.clientHeight - 48
        setIframeHeight(Math.max(500, containerHeight))
      }
    }
    
    updateHeight()
    
    const resizeObserver = new ResizeObserver(updateHeight)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => resizeObserver.disconnect()
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'interaction' && enableInteraction) {
      onInteraction({
        type: event.data.interactionType,
        target: event.data.target,
        detail: event.data.detail
      })
    }
    if (event.data?.type === 'hotspots-update' && showTouchHotspots) {
      setHotspots(event.data.hotspots || [])
    }
  }, [enableInteraction, showTouchHotspots, onInteraction])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: 'width-change',
          width: width,
          enableHotspots: showTouchHotspots,
          enableInteraction: enableInteraction
        }, '*')
      } catch (e) {
        // Ignore cross-origin errors
      }
    }
  }, [width, showTouchHotspots, enableInteraction])

  const iframeSrc = '/src/example/index.html'

  return (
    <div
      ref={containerRef}
      className={styles.previewContainer}
      style={{ backgroundColor: bgColor }}
    >
      <div
        className={styles.previewWrapper}
        style={{
          width: `${width}px`,
          height: `${iframeHeight}px`
        }}
      >
        {showSafeArea && (
          <>
            <div className={`${styles.safeArea} ${styles.safeAreaTop}`} />
            <div className={`${styles.safeArea} ${styles.safeAreaBottom}`} />
          </>
        )}
        
        {showTouchHotspots && hotspots.length > 0 && (
          <div className={styles.touchHotspots}>
            {hotspots.map((spot, index) => (
              <div
                key={index}
                className={styles.hotspot}
                style={{
                  left: `${spot.x}px`,
                  top: `${spot.y}px`,
                  width: `${spot.w}px`,
                  height: `${spot.h}px`
                }}
              />
            ))}
          </div>
        )}
        
        <div className={styles.deviceFrame} />
        
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className={styles.previewIframe}
          title={deviceName}
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
        />
      </div>
    </div>
  )
}

export default PreviewFrame
