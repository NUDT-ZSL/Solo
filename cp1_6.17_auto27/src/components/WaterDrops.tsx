import { useEffect } from 'react'

interface WaterDropsProps {
  active: boolean
  onComplete: () => void
}

const drops = [
  { size: 8, delay: 0 },
  { size: 12, delay: 0.15 },
  { size: 16, delay: 0.3 },
]

const keyframes = `
@keyframes drop-fall {
  0% {
    transform: translateY(-20px);
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: translateY(60px);
    opacity: 0;
  }
}
`

export default function WaterDrops({ active, onComplete }: WaterDropsProps) {
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(onComplete, 700)
    return () => clearTimeout(timer)
  }, [active, onComplete])

  if (!active) return null

  return (
    <>
      <style>{keyframes}</style>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {drops.map((drop, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: drop.size,
              height: drop.size * 1.4,
              backgroundColor: '#42A5F5',
              borderRadius: '50% 50% 50% 50%',
              borderTopLeftRadius: '50%',
              borderTopRightRadius: '50%',
              borderBottomLeftRadius: '50%',
              borderBottomRightRadius: '50%',
              animation: `drop-fall 0.3s ease-in ${drop.delay}s both`,
            }}
          />
        ))}
      </div>
    </>
  )
}
