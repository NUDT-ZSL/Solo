import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import type { Device } from '../types'
import styles from './DeviceBar.module.css'

interface DeviceBarProps {
  devices: Device[]
  currentDevice: Device
  previewWidth: number
  onDeviceSelect: (device: Device) => void
  onWidthChange: (width: number) => void
  minWidth: number
  maxWidth: number
}

const DeviceBar = ({
  devices,
  currentDevice,
  previewWidth,
  onDeviceSelect,
  onWidthChange,
  minWidth,
  maxWidth
}: DeviceBarProps) => {
  const [inputValue, setInputValue] = useState<string>(String(previewWidth))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(String(previewWidth))
  }, [previewWidth])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value)) {
      setInputValue(value)
    }
  }

  const applyWidthChange = () => {
    const numValue = parseInt(inputValue, 10)
    if (!isNaN(numValue)) {
      const clamped = Math.min(Math.max(numValue, minWidth), maxWidth)
      setInputValue(String(clamped))
      if (clamped !== previewWidth) {
        onWidthChange(clamped)
      }
    } else {
      setInputValue(String(previewWidth))
    }
  }

  const handleInputBlur = () => {
    applyWidthChange()
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyWidthChange()
      inputRef.current?.blur()
    }
  }

  const handleStepUp = () => {
    const newValue = Math.min(previewWidth + 10, maxWidth)
    if (newValue !== previewWidth) {
      onWidthChange(newValue)
    }
  }

  const handleStepDown = () => {
    const newValue = Math.max(previewWidth - 10, minWidth)
    if (newValue !== previewWidth) {
      onWidthChange(newValue)
    }
  }

  const renderDeviceIcon = (icon: Device['icon']) => {
    switch (icon) {
      case 'phone':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        )
      case 'tablet':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        )
      case 'desktop':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )
    }
  }

  return (
    <div className={styles.deviceBar}>
      <div className={styles.deviceList}>
        {devices.map((device) => (
          <div
            key={device.id}
            className={`${styles.deviceItem} ${currentDevice.id === device.id ? styles.active : ''}`}
            onClick={() => onDeviceSelect(device)}
          >
            <div className={styles.deviceIcon}>
              {renderDeviceIcon(device.icon)}
            </div>
            <span className={styles.deviceName}>{device.name}</span>
            <div className={styles.highlightBar} />
          </div>
        ))}
      </div>
      
      <div className={styles.widthControl}>
        <span className={styles.widthLabel}>宽度</span>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.widthInput}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
          />
          <div className={styles.stepButtons}>
            <button
              className={styles.stepButton}
              onClick={handleStepUp}
              aria-label="增加宽度"
            >
              ▲
            </button>
            <button
              className={styles.stepButton}
              onClick={handleStepDown}
              aria-label="减少宽度"
            >
              ▼
            </button>
          </div>
        </div>
        <span className={styles.widthUnit}>px</span>
      </div>
    </div>
  )
}

export default DeviceBar
