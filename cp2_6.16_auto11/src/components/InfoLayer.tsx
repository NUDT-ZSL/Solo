import { useEffect, useState, useRef } from 'react'
import { useStore } from '@/store/useStore'

export default function InfoLayer() {
  const simTime = useStore((s) => s.simTime)
  const selectedCity = useStore((s) => s.selectedCity)
  const [cardVisible, setCardVisible] = useState(false)
  const [cardAnim, setCardAnim] = useState(false)
  const [textOffset, setTextOffset] = useState(0)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const scroll = () => {
      setTextOffset((prev) => (prev - 0.3) % 600)
      animRef.current = requestAnimationFrame(scroll)
    }
    animRef.current = requestAnimationFrame(scroll)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  useEffect(() => {
    if (selectedCity) {
      setCardVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCardAnim(true)
        })
      })
    } else {
      setCardAnim(false)
      const timer = setTimeout(() => setCardVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [selectedCity])

  return (
    <>
      <div style={styles.timeBar}>
        <div style={{ ...styles.scrollTrack, transform: `translateX(${textOffset}px)` }}>
          <span style={styles.timeText}>{simTime} &nbsp;&nbsp;|&nbsp;&nbsp; 实时风场模拟数据 &nbsp;&nbsp;|&nbsp;&nbsp; Global Wind Simulation &nbsp;&nbsp;|&nbsp;&nbsp; {simTime} &nbsp;&nbsp;|&nbsp;&nbsp; 实时风场模拟数据 &nbsp;&nbsp;|&nbsp;&nbsp; Global Wind Simulation</span>
        </div>
      </div>
      {cardVisible && selectedCity && (
        <div
          style={{
            ...styles.card,
            transform: cardAnim ? 'translateY(0)' : 'translateY(20px)',
            opacity: cardAnim ? 1 : 0,
          }}
        >
          <div style={styles.cardCity}>{selectedCity.name}</div>
          <div style={styles.cardSpeed}>风速: {selectedCity.windSpeed} m/s</div>
        </div>
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  timeBar: {
    position: 'fixed',
    bottom: 16,
    left: 0,
    right: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    zIndex: 100,
    pointerEvents: 'none',
  },
  scrollTrack: {
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  timeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', monospace",
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
  card: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    marginLeft: -70,
    marginTop: -30,
    width: 140,
    height: 60,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: 8,
    border: '1px solid rgba(30,136,229,0.3)',
    padding: '10px 12px',
    boxSizing: 'border-box',
    zIndex: 200,
    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
    pointerEvents: 'none',
  },
  cardCity: {
    color: '#ffeb3b',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  cardSpeed: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}
