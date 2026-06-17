import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import DeviceBar from './device-bar/DeviceBar'
import PreviewFrame from './preview/PreviewFrame'
import ControlPanel from './panel/ControlPanel'
import { DEVICES, DEFAULT_DEVICE, MIN_WIDTH, MAX_WIDTH, DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH, type LogEntry, type PanelSettings, type Device } from './types'

function App() {
  const [currentDevice, setCurrentDevice] = useState<Device>(DEFAULT_DEVICE)
  const [previewWidth, setPreviewWidth] = useState<number>(DEFAULT_DEVICE.width)
  const [displayWidth, setDisplayWidth] = useState<number>(DEFAULT_DEVICE.width)
  const [panelWidth, setPanelWidth] = useState<number>(DEFAULT_PANEL_WIDTH)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [panelSettings, setPanelSettings] = useState<PanelSettings>({
    showSafeArea: false,
    showTouchHotspots: false,
    enableInteraction: false
  })
  
  const dragStartX = useRef<number>(0)
  const dragStartWidth = useRef<number>(DEFAULT_PANEL_WIDTH)
  const logIdCounter = useRef<number>(0)
  const lastDeviceIdRef = useRef<string>(DEFAULT_DEVICE.id)
  const pendingWidthRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      id: `log-${++logIdCounter.current}`,
      type,
      message,
      timestamp: Date.now()
    }
    setLogs(prev => [entry, ...prev])
  }, [])

  useEffect(() => {
    addLog('system', '屏幕模拟器已初始化')
    addLog('device', `默认设备：${DEFAULT_DEVICE.name} (${DEFAULT_DEVICE.width}px)`)
  }, [addLog])

  const handleDeviceSelect = useCallback((device: Device) => {
    if (lastDeviceIdRef.current === device.id) return
    lastDeviceIdRef.current = device.id
    setCurrentDevice(device)
    pendingWidthRef.current = device.width
    addLog('device', `切换到 ${device.name} (${device.width}px)`)
  }, [addLog])

  const handleWidthChange = useCallback((width: number) => {
    const clampedWidth = Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH)
    if (clampedWidth === previewWidth) return
    pendingWidthRef.current = clampedWidth
    setPreviewWidth(clampedWidth)
    
    const matchedDevice = DEVICES.find(d => d.width === clampedWidth)
    if (matchedDevice) {
      lastDeviceIdRef.current = matchedDevice.id
      setCurrentDevice(matchedDevice)
    }
    
    addLog('device', `宽度调整为 ${clampedWidth}px`)
  }, [previewWidth, addLog])

  const handleSettingChange = useCallback((key: keyof PanelSettings, value: boolean) => {
    setPanelSettings(prev => ({ ...prev, [key]: value }))
    const settingNames: Record<keyof PanelSettings, string> = {
      showSafeArea: '安全区域显示',
      showTouchHotspots: '触控热区显示',
      enableInteraction: '交互模拟'
    }
    addLog('system', `${settingNames[key]}：${value ? '开启' : '关闭'}`)
  }, [addLog])

  const handleIframeInteraction = useCallback((data: { type: string; target: string; detail?: string }) => {
    if (!panelSettings.enableInteraction) return
    
    let message = ''
    switch (data.type) {
      case 'card-click':
        message = `点击卡片 ${data.target}`
        break
      case 'nav-click':
        message = `点击导航：${data.target}`
        break
      case 'table-sort':
        message = `表格排序：按 ${data.target} ${data.detail || '升序'}`
        break
      case 'menu-toggle':
        message = `${data.target === 'open' ? '打开' : '关闭'}汉堡菜单`
        break
      default:
        message = `交互事件：${data.type}`
    }
    addLog('interaction', message)
  }, [panelSettings.enableInteraction, addLog])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const delta = dragStartX.current - e.clientX
    const newWidth = Math.min(
      Math.max(dragStartWidth.current + delta, MIN_PANEL_WIDTH),
      MAX_PANEL_WIDTH
    )
    setPanelWidth(newWidth)
  }, [isDragging])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [isDragging])

  useLayoutEffect(() => {
    if (pendingWidthRef.current !== null && pendingWidthRef.current !== displayWidth) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(() => {
        if (pendingWidthRef.current !== null) {
          setDisplayWidth(pendingWidthRef.current)
          pendingWidthRef.current = null
        }
        rafRef.current = null
      })
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [previewWidth, currentDevice, displayWidth])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('mouseleave', handleDragEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
      window.removeEventListener('mouseleave', handleDragEnd)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <DeviceBar
        devices={DEVICES}
        currentDevice={currentDevice}
        previewWidth={previewWidth}
        onDeviceSelect={handleDeviceSelect}
        onWidthChange={handleWidthChange}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
      />
      
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        position: 'relative'
      }}>
        <PreviewFrame
          width={displayWidth}
          deviceName={currentDevice.name}
          showSafeArea={panelSettings.showSafeArea}
          showTouchHotspots={panelSettings.showTouchHotspots}
          enableInteraction={panelSettings.enableInteraction}
          bgColor={currentDevice.bgColor}
          onInteraction={handleIframeInteraction}
        />
        
        {isDragging && (
          <div
            style={{
              position: 'absolute',
              right: panelWidth,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: '#CBD5E1',
              cursor: 'col-resize',
              zIndex: 100,
              transform: 'translateX(2px)'
            }}
          />
        )}
        
        <div
          onMouseDown={handleDragStart}
          style={{
            position: 'absolute',
            right: panelWidth,
            top: 0,
            bottom: 0,
            width: '6px',
            cursor: 'col-resize',
            zIndex: 10,
            transform: 'translateX(3px)'
          }}
        />
        
        <ControlPanel
          width={panelWidth}
          currentDeviceName={currentDevice.name}
          currentWidth={previewWidth}
          settings={panelSettings}
          logs={logs}
          onSettingChange={handleSettingChange}
        />
      </div>
    </div>
  )
}

export default App
