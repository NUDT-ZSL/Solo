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
  const [highlightVersion, setHighlightVersion] = useState<number>(0)
  const prevDeviceIdRef = useRef<string>(currentDevice.id)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastValidWidth = useRef<number>(previewWidth)

  useEffect(() => {
    setInputValue(String(previewWidth))
    lastValidWidth.current = previewWidth
  }, [previewWidth])

  useEffect(() => {
    if (prevDeviceIdRef.current !== currentDevice.id) {
      prevDeviceIdRef.current = currentDevice.id
      setHighlightVersion(v => v + 1)
    }
  }, [currentDevice.id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value)) {
      setInputValue(value)
    }
  }

  const clampWidth = (value: number): number => {
    return Math.max(320, Math.min(2560, Math.round(value)))
  }

  const isValidNumber = (value: string): boolean => {
    if (value.trim() === '') return false
    const num = Number(value)
    return !isNaN(num) && isFinite(num)
  }

  const applyWidthChange = () => {
    const trimmedValue = inputValue.trim()
    
    if (!isValidNumber(trimmedValue)) {
      setInputValue(String(lastValidWidth.current))
      return
    }
    
    let numValue = parseFloat(trimmedValue)
    
    if (!isNaN(numValue) && isFinite(numValue)) {
      const clamped = clampWidth(numValue)
      setInputValue(String(clamped))
      lastValidWidth.current = clamped
      if (clamped !== previewWidth) {
        onWidthChange(clamped)
      }
    } else {
      setInputValue(String(lastValidWidth.current))
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
    const clamped = clampWidth(previewWidth + 10)
    if (clamped !== previewWidth) {
      onWidthChange(clamped)
    }
  }

  const handleStepDown = () => {
    const clamped = clampWidth(previewWidth - 10)
    if (clamped !== previewWidth) {
      onWidthChange(clamped)
    }
  }

  const handleDeviceClick = (device: Device) => {
    onDeviceSelect(device)
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
        {devices.map((device) => {
          const isActive = currentDevice.id === device.id
          return (
            <div
              key={device.id}
              className={`${styles.deviceItem} ${isActive ? styles.active : ''}`}
              onClick={() => handleDeviceClick(device)}
            >
              <div className={styles.deviceIcon}>
                {renderDeviceIcon(device.icon)}
              </div>
              <span className={styles.deviceName}>{device.name}</span>
              {isActive && (
                <div 
                  key={`highlight-${device.id}-${highlightVersion}`}
                  className={styles.highlightBar}
                />
              )}
            </div>
          )
        })}
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
              disabled={previewWidth >= 2560}
            >
              ▲
            </button>
            <button
              className={styles.stepButton}
              onClick={handleStepDown}
              aria-label="减少宽度"
              disabled={previewWidth <= 320}
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
