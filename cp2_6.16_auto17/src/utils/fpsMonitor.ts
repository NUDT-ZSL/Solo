interface FPSMonitor {
  checkFPS: () => number | null
  isLowPerf: () => boolean
}

export function createFPSMonitor(
  sampleFrames: number = 60,
  lowFPSThreshold: number = 40
): FPSMonitor {
  let frameCount = 0
  let lastTime = performance.now()
  let currentFPS = 60
  let lowPerformance = false
  let hasWarned = false

  const checkFPS = (): number | null => {
    frameCount++

    if (frameCount >= sampleFrames) {
      const now = performance.now()
      const delta = now - lastTime
      currentFPS = Math.round((frameCount * 1000) / delta)
      frameCount = 0
      lastTime = now

      if (currentFPS < lowFPSThreshold) {
        if (!hasWarned) {
          console.warn(`[FPS Monitor] Low FPS detected: ${currentFPS}fps`)
          hasWarned = true
        }
        lowPerformance = true
      } else {
        lowPerformance = false
      }

      return currentFPS
    }

    return null
  }

  const isLowPerf = (): boolean => {
    return lowPerformance
  }

  return {
    checkFPS,
    isLowPerf
  }
}
