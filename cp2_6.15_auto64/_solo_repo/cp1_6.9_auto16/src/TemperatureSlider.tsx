import { useState, useRef, useCallback, useEffect } from 'react'

interface TemperatureSliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}

export default function TemperatureSlider({ value, onChange, min, max }: TemperatureSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const percentage = ((value - min) / (max - min)) * 100

  const updateFromPosition = useCallback((clientY: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top))
    const percent = 1 - y / rect.height
    const newValue = Math.round(min + percent * (max - min))
    onChange(Math.max(min, Math.min(max, newValue)))
  }, [min, max, onChange])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => updateFromPosition(e.clientY)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateFromPosition(e.touches[0].clientY)
    }
    const handleMouseUp = () => setIsDragging(false)
    const handleTouchEnd = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, updateFromPosition])

  const bgOpacity = isHovered || isDragging ? 0.6 : 0.3
  const tempColor = value < -15 ? '#66CCFF' : value < -5 ? '#88DDEE' : value < 0 ? '#BBEEEE' : value < 5 ? '#FFCC88' : '#FF8866'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 30,
        right: 30,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 14px',
        background: `rgba(20, 30, 50, ${bgOpacity})`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.2)',
        transition: 'background 0.3s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: 200,
          padding: '6px 0',
        }}
      >
        <div style={{ color: 'white', fontSize: 12, opacity: 0.7, fontFamily: 'system-ui' }}>
          {max}°C
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'system-ui',
              textShadow: '0 0 12px ' + tempColor,
            }}
          >
            {value}°C
          </div>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: tempColor,
              boxShadow: `0 0 8px ${tempColor}, 0 0 16px ${tempColor}`,
            }}
          />
        </div>
        <div style={{ color: 'white', fontSize: 12, opacity: 0.7, fontFamily: 'system-ui' }}>
          {min}°C
        </div>
      </div>

      <div
        ref={trackRef}
        style={{
          position: 'relative',
          width: 12,
          height: 200,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)',
        }}
        onMouseDown={(e) => {
          setIsDragging(true)
          updateFromPosition(e.clientY)
        }}
        onTouchStart={(e) => {
          setIsDragging(true)
          if (e.touches.length > 0) updateFromPosition(e.touches[0].clientY)
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${percentage}%`,
            background: `linear-gradient(180deg, #FF8866 0%, #FFCC88 30%, #88DDEE 65%, #6688FF 100%)`,
            borderRadius: 8,
            transition: 'height 0.08s ease-out',
            boxShadow: '0 0 12px rgba(136, 204, 255, 0.4)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: `calc(${percentage}% - 10px)`,
            transform: 'translateX(-50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'white',
            border: `2px solid ${tempColor}`,
            boxShadow: `0 0 12px ${tempColor}, 0 0 24px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.4)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: 'box-shadow 0.2s ease, transform 0.1s ease',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 200,
          padding: '6px 0',
        }}
      >
        <div style={{ color: 'white', fontSize: 10, opacity: 0.4, fontFamily: 'system-ui' }}>暖</div>
        <div style={{ color: 'white', fontSize: 10, opacity: 0.4, fontFamily: 'system-ui' }}>零</div>
        <div style={{ color: 'white', fontSize: 10, opacity: 0.4, fontFamily: 'system-ui' }}>冷</div>
      </div>
    </div>
  )
}
