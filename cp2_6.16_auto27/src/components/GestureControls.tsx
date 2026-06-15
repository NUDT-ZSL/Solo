import React, { useRef, useState, useEffect, useCallback } from 'react'
import './GestureControls.css'

interface GestureControlsProps {
  onGesture: (gesture: string) => void
}

declare global {
  interface Window {
    Hands: any
    Camera: any
    drawConnectors: any
    drawLandmarks: any
    HAND_CONNECTIONS: any
  }
}

type MediaPipeHands = any
type MediaPipeCamera = any

const LOAD_TIMEOUT_MS = 15000
const GESTURE_COOLDOWN_FRAMES = 25

const GestureControls: React.FC<GestureControlsProps> = ({ onGesture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cameraAuthorized, setCameraAuthorized] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handsRef = useRef<MediaPipeHands | null>(null)
  const cameraRef = useRef<MediaPipeCamera | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const loadTimeoutRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  const palmCenterHistoryRef = useRef<{ x: number; y: number }[]>([])
  const indexTipHistoryRef = useRef<{ y: number }[]>([])
  const noHandFrameCountRef = useRef(0)
  const lastGestureRef = useRef<string>('')
  const gestureCooldownRef = useRef<number>(0)
  const lastGestureTimeRef = useRef<number>(0)

  const loadScript = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-src="${src}"]`) as HTMLScriptElement | null
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve()
        } else {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
        }
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.crossOrigin = 'anonymous'
      script.dataset.src = src
      script.onload = () => {
        script.dataset.loaded = 'true'
        resolve()
      }
      script.onerror = () => {
        document.head.removeChild(script)
        reject(new Error(`Failed to load ${src}`))
      }
      document.head.appendChild(script)
    })
  }, [])

  const initMediaPipe = useCallback(async (): Promise<boolean> => {
    try {
      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      ]

      for (const src of scripts) {
        await loadScript(src)
        if (!mountedRef.current) return false
      }

      return typeof window.Hands !== 'undefined'
    } catch (error) {
      console.error('MediaPipe load error:', error)
      setLoadError('手势识别模型加载失败')
      return false
    }
  }, [loadScript])

  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
  }

  const detectFist = (landmarks: any[]): boolean => {
    const thumbTip = landmarks[4]
    const indexMcp = landmarks[5]
    const distance = calculateDistance(
      { x: thumbTip.x, y: thumbTip.y },
      { x: indexMcp.x, y: indexMcp.y }
    )
    return distance < 0.08
  }

  const detectOpenPalm = (landmarks: any[]): boolean => {
    const wrist = landmarks[0]
    const middleTip = landmarks[12]
    const distance = calculateDistance(
      { x: wrist.x, y: wrist.y },
      { x: middleTip.x, y: middleTip.y }
    )
    return distance > 0.25
  }

  const getPalmCenter = (landmarks: any[]): { x: number; y: number } => {
    const wrist = landmarks[0]
    const middleMcp = landmarks[9]
    return {
      x: (wrist.x + middleMcp.x) / 2,
      y: (wrist.y + middleMcp.y) / 2,
    }
  }

  const detectGesture = useCallback((landmarks: any[]): string | null => {
    const palmCenter = getPalmCenter(landmarks)
    const indexTip = landmarks[8]

    palmCenterHistoryRef.current.push(palmCenter)
    if (palmCenterHistoryRef.current.length > 6) {
      palmCenterHistoryRef.current.shift()
    }

    indexTipHistoryRef.current.push({ y: indexTip.y })
    if (indexTipHistoryRef.current.length > 6) {
      indexTipHistoryRef.current.shift()
    }

    const isFist = detectFist(landmarks)
    const isOpenPalm = detectOpenPalm(landmarks)

    if (isFist) {
      return 'fist'
    }

    if (isOpenPalm && palmCenterHistoryRef.current.length >= 5) {
      const history = palmCenterHistoryRef.current
      const recent = history.slice(-3)
      const earlier = history.slice(0, 3)

      const avgRecentX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length
      const avgEarlierX = earlier.reduce((sum, p) => sum + p.x, 0) / earlier.length

      if (avgEarlierX - avgRecentX > 0.09) {
        return 'swipe-left'
      }
      if (avgRecentX - avgEarlierX > 0.09) {
        return 'swipe-right'
      }
    }

    if (isOpenPalm && indexTipHistoryRef.current.length >= 5) {
      const history = indexTipHistoryRef.current
      const recent = history.slice(-3)
      const earlier = history.slice(0, 3)

      const avgRecentY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length
      const avgEarlierY = earlier.reduce((sum, p) => sum + p.y, 0) / earlier.length

      if (avgEarlierY - avgRecentY > 0.09) {
        return 'volume-up'
      }
      if (avgRecentY - avgEarlierY > 0.09) {
        return 'volume-down'
      }
    }

    return null
  }, [])

  const onResults = useCallback(
    (results: any) => {
      if (!mountedRef.current) return

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      try {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
      } catch {
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        noHandFrameCountRef.current = 0

        for (const landmarks of results.multiHandLandmarks) {
          try {
            if (window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
              window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 2,
              })
              window.drawLandmarks(ctx, landmarks, {
                color: '#FF0000',
                lineWidth: 1,
              })
            }
          } catch {
          }

          const now = performance.now()
          if (gestureCooldownRef.current <= 0 && now - lastGestureTimeRef.current > 400) {
            const gesture = detectGesture(landmarks)
            if (gesture && gesture !== lastGestureRef.current) {
              lastGestureRef.current = gesture
              lastGestureTimeRef.current = now
              gestureCooldownRef.current = GESTURE_COOLDOWN_FRAMES
              if (mountedRef.current) {
                onGesture(gesture)
              }
            }
          } else {
            gestureCooldownRef.current--
          }
        }
      } else {
        noHandFrameCountRef.current++
        if (noHandFrameCountRef.current > 10) {
          lastGestureRef.current = ''
          palmCenterHistoryRef.current = []
          indexTipHistoryRef.current = []
        }
      }

      ctx.restore()
    },
    [detectGesture, onGesture]
  )

  const startCameraWithStream = useCallback(
    async (stream: MediaStream) => {
      if (!mountedRef.current || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      mediaStreamRef.current = stream

      try {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      } catch (playError) {
        console.error('Video play error:', playError)
      }

      if (!window.Hands) {
        setCameraAuthorized(true)
        return
      }

      try {
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        })

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        })

        hands.onResults(onResults)
        handsRef.current = hands

        if (window.Camera) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (handsRef.current && videoRef.current && mountedRef.current) {
                try {
                  await handsRef.current.send({ image: videoRef.current })
                } catch {
                }
              }
            },
            width: 320,
            height: 240,
          })
          camera.start()
          cameraRef.current = camera
        } else {
          const processFrame = async () => {
            if (!mountedRef.current) return
            if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              try {
                await handsRef.current.send({ image: videoRef.current })
              } catch {
              }
            }
            animationFrameRef.current = requestAnimationFrame(processFrame)
          }
          animationFrameRef.current = requestAnimationFrame(processFrame)
        }

        setCameraAuthorized(true)
      } catch (error) {
        console.error('Hands init error:', error)
        setLoadError('手势识别初始化失败')
        setCameraAuthorized(true)
      }
    },
    [onResults]
  )

  const requestAndStartCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      })
      if (mountedRef.current) {
        await startCameraWithStream(stream)
      } else {
        stream.getTracks().forEach((t) => t.stop())
      }
    } catch (error) {
      console.error('Camera permission error:', error)
      if (mountedRef.current) {
        setCameraAuthorized(false)
      }
    }
  }, [startCameraWithStream])

  useEffect(() => {
    mountedRef.current = true
    setIsLoading(true)
    setLoadError(null)

    loadTimeoutRef.current = window.setTimeout(() => {
      if (mountedRef.current && isLoading) {
        setLoadError('手势识别加载超时')
        setIsLoading(false)
      }
    }, LOAD_TIMEOUT_MS)

    const init = async () => {
      const loaded = await initMediaPipe()
      if (!mountedRef.current) return

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }

      if (!loaded) {
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      await requestAndStartCamera()
    }

    init()

    return () => {
      mountedRef.current = false

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (cameraRef.current && typeof cameraRef.current.stop === 'function') {
        try {
          cameraRef.current.stop()
        } catch {
        }
        cameraRef.current = null
      }

      if (handsRef.current && typeof handsRef.current.close === 'function') {
        try {
          handsRef.current.close()
        } catch {
        }
        handsRef.current = null
      }

      if (videoRef.current) {
        try {
          videoRef.current.pause()
          videoRef.current.srcObject = null
        } catch {
        }
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop()
          } catch {
          }
        })
        mediaStreamRef.current = null
      }

      palmCenterHistoryRef.current = []
      indexTipHistoryRef.current = []
      lastGestureRef.current = ''
      gestureCooldownRef.current = 0
      noHandFrameCountRef.current = 0
    }
  }, [initMediaPipe, requestAndStartCamera])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 320
    canvas.height = 240
  }, [])

  return (
    <div className="gesture-controls">
      <div className="gesture-video-container">
        <video
          ref={videoRef}
          className="gesture-video"
          playsInline
          muted
          width="320"
          height="240"
        />
        <canvas ref={canvasRef} className="gesture-canvas" />

        {cameraAuthorized === false && (
          <div className="gesture-overlay">
            <p className="gesture-error-text">摄像头未授权</p>
          </div>
        )}

        {loadError && (
          <div className="gesture-overlay">
            <p className="gesture-error-text">{loadError}</p>
          </div>
        )}

        {isLoading && !loadError && cameraAuthorized === null && (
          <div className="gesture-overlay gesture-loading">
            <div className="gesture-spinner" />
            <p className="gesture-loading-text">正在加载手势识别...</p>
          </div>
        )}
      </div>

      <div className="gesture-hints">
        <div className="hint-item">
          <span className="hint-icon">✊</span>
          <span>握拳：播放/暂停</span>
        </div>
        <div className="hint-item">
          <span className="hint-icon">👈</span>
          <span>左滑：上一首</span>
        </div>
        <div className="hint-item">
          <span className="hint-icon">👉</span>
          <span>右滑：下一首</span>
        </div>
        <div className="hint-item">
          <span className="hint-icon">☝️</span>
          <span>食指上下：音量</span>
        </div>
      </div>
    </div>
  )
}

export default GestureControls
