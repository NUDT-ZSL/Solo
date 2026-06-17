import { useEffect, useRef, useCallback } from 'react'
import { useClimateStore } from '@/store/useClimateStore'

export function useAnimationController() {
  const isPlaying = useClimateStore((s) => s.isPlaying)
  const playSpeed = useClimateStore((s) => s.playSpeed)
  const currentYear = useClimateStore((s) => s.currentYear)
  const startYear = useClimateStore((s) => s.startYear)
  const endYear = useClimateStore((s) => s.endYear)
  const setYear = useClimateStore((s) => s.setYear)
  const pause = useClimateStore((s) => s.pause)
  const setYearFlash = useClimateStore((s) => s.setYearFlash)

  const lastTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const animate = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }
      const elapsed = timestamp - lastTimeRef.current
      const interval = 1000 / playSpeed

      if (elapsed >= interval) {
        lastTimeRef.current = timestamp
        const nextYear = currentYear + 1
        if (nextYear > endYear) {
          pause()
          setYear(startYear)
          return
        }
        setYear(nextYear)
        setYearFlash(nextYear)
        setTimeout(() => setYearFlash(null), 500)
      }

      rafRef.current = requestAnimationFrame(animate)
    },
    [currentYear, playSpeed, startYear, endYear, setYear, pause, setYearFlash]
  )

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0
      rafRef.current = requestAnimationFrame(animate)
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isPlaying, animate])
}
