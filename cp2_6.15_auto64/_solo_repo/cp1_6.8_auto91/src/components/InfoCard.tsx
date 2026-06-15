import { useDuneStore } from '@/store/useDuneStore'
import { useEffect, useState } from 'react'

export default function InfoCard() {
  const clickedPoint = useDuneStore((s) => s.clickedPoint)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (clickedPoint) {
      setVisible(true)
      setAnimating(true)
      const timer = setTimeout(() => setAnimating(false), 2500)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
      setAnimating(false)
    }
  }, [clickedPoint])

  if (!visible || !clickedPoint) return null

  return (
    <div
      className={`info-card ${animating ? 'info-card-enter' : 'info-card-exit'}`}
      style={{ left: clickedPoint.screenX, top: clickedPoint.screenY }}
    >
      <div className="info-card-row">
        <span className="info-card-label">坡度</span>
        <span className="info-card-value">{clickedPoint.slope}°</span>
      </div>
      <div className="info-card-row">
        <span className="info-card-label">风速</span>
        <span className="info-card-value">{clickedPoint.windSpeed.toFixed(1)} m/s</span>
      </div>
      <div className="info-card-row">
        <span className="info-card-label">沙粒粒度</span>
        <span className="info-card-value">{clickedPoint.grainSize} mm</span>
      </div>
    </div>
  )
}
