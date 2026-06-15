import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'

export default function InfoLayer() {
  const simTime = useStore((s) => s.simTime)
  const selectedCity = useStore((s) => s.selectedCity)
  const [cardVisible, setCardVisible] = useState(false)
  const [cardAnim, setCardAnim] = useState(false)

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
        <span style={styles.timeText}>{simTime}</span>
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
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    pointerEvents: 'none',
  },
  timeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', monospace",
    whiteSpace: 'nowrap',
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
