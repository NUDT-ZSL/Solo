import { useState, useEffect, useRef, useCallback } from 'react'

export function useCountdown(endTime: string) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const calculate = useCallback(() => {
    const endTimeMs = new Date(endTime).getTime()
    const now = Date.now()
    const diff = endTimeMs - now

    if (diff <= 0) {
      setIsExpired(true)
      setTimeLeft('00天00时00分00秒')
      return
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    setTimeLeft(
      `${String(days).padStart(2, '0')}天` +
      `${String(hours).padStart(2, '0')}时` +
      `${String(minutes).padStart(2, '0')}分` +
      `${String(seconds).padStart(2, '0')}秒`
    )
  }, [endTime])

  useEffect(() => {
    setIsExpired(false)
    calculate()

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(calculate, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [endTime, calculate])

  return { timeLeft, isExpired }
}
