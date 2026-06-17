import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type { LogEntry, PanelSettings } from '../types'
import styles from './ControlPanel.module.css'

interface ControlPanelProps {
  width: number
  currentDeviceName: string
  currentWidth: number
  settings: PanelSettings
  logs: LogEntry[]
  onSettingChange: (key: keyof PanelSettings, value: boolean) => void
}

const ITEM_HEIGHT = 48

const ControlPanel = ({
  width,
  currentDeviceName,
  currentWidth,
  settings,
  logs,
  onSettingChange
}: ControlPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(200)

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      setViewportHeight(container.clientHeight)
    }
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    return `${hours}:${minutes}:${seconds}.${ms}`
  }

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2)
    const endIndex = Math.min(
      logs.length,
      Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + 2
    )
    
    const items: Array<{ log: LogEntry; offset: number; index: number }> = []
    for (let i = startIndex; i < endIndex; i++) {
      if (logs[i]) {
        items.push({
          log: logs[i],
          offset: i * ITEM_HEIGHT,
          index: i
        })
      }
    }
    return items
  }, [logs, scrollTop, viewportHeight])

  const totalHeight = logs.length * ITEM_HEIGHT

  const toggleSettings: Array<{
    key: keyof PanelSettings
    label: string
  }> = [
    { key: 'showSafeArea', label: '显示安全区域' },
    { key: 'showTouchHotspots', label: '显示触控热区' },
    { key: 'enableInteraction', label: '开启交互模拟' }
  ]

  const getLogTypeLabel = (type: LogEntry['type']) => {
    switch (type) {
      case 'device': return '设备操作'
      case 'interaction': return '元素交互'
      case 'system': return '系统事件'
    }
  }

  return (
    <div className={styles.controlPanel} style={{ width: `${width}px` }}>
      <div className={styles.panelHeader}>
        <div className={styles.deviceInfo}>
          <span className={styles.deviceName}>{currentDeviceName}</span>
          <span className={styles.deviceWidth}>{currentWidth}px · {getLogTypeLabel('device')}</span>
        </div>
      </div>

      <div className={styles.settingsSection}>
        {toggleSettings.map(({ key, label }) => (
          <div key={key} className={styles.settingItem}>
            <span className={styles.settingLabel}>{label}</span>
            <div
              className={`${styles.toggleSwitch} ${settings[key] ? styles.on : ''}`}
              onClick={() => onSettingChange(key, !settings[key])}
              role="switch"
              aria-checked={settings[key]}
            >
              <div className={styles.toggleTrack} />
              <div className={styles.toggleThumb} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.logSection}>
        <div className={styles.logHeader}>
          <span className={styles.logTitle}>操作日志</span>
          <span className={styles.logCount}>{logs.length} 条</span>
        </div>
        
        <div
          ref={containerRef}
          className={styles.logContainer}
          onScroll={handleScroll}
        >
          {logs.length === 0 ? (
            <div className={styles.emptyLog}>暂无日志</div>
          ) : (
            <div
              className={styles.logList}
              style={{ height: `${totalHeight}px`, position: 'relative' }}
            >
              {virtualItems.map(({ log, offset, index }) => (
                <div
                  key={log.id}
                  className={styles.logItem}
                  style={{
                    position: 'absolute',
                    top: `${offset}px`,
                    left: 0,
                    right: 0,
                    height: `${ITEM_HEIGHT}px`
                  }}
                >
                  <div className={`${styles.logDot} ${styles[log.type]}`} />
                  <div className={styles.logContent}>
                    <div className={styles.logMessage}>{log.message}</div>
                    <div className={styles.logTime}>{formatTime(log.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
