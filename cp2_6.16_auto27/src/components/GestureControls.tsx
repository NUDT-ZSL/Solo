import React, { useRef, useEffect, useState, useCallback } from 'react'
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

const GestureControls: React.FC<GestureControlsProps> = ({ onGesture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cameraAuthorized, setCameraAuthorized] = useState<boolean | null>(null)
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false)
  const handsRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastGestureRef = useRef<string>('')
  const gestureCooldownRef = useRef<number>(0)

  const palmCenterHistoryRef = useRef<{ x: number; y: number }[]>([])
  const indexTipHistoryRef = useRef<{ y: number }[]>([])
  const noHandFrameCountRef = useRef(0)

  const loadScript = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = src
      script.crossOrigin = 'anonymous'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load ${src}`))
      document.head.appendChild(script)
    })
  }, [])

  const initMediaPipe = useCallback(async () => {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
      setMediaPipeLoaded(true)
      return true
    } catch (error) {
      console.error('Failed to load MediaPipe:', error)
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

  const detectGesture = useCallback(
    (landmarks: any[]): string | null => {
      const palmCenter = getPalmCenter(landmarks)
      const indexTip = landmarks[8]

      palmCenterHistoryRef.current.push(palmCenter)
      if (palmCenterHistoryRef.current.length > 5) {
        palmCenterHistoryRef.current.shift()
      }

      indexTipHistoryRef.current.push({ y: indexTip.y })
      if (indexTipHistoryRef.current.length > 5) {
        indexTipHistoryRef.current.shift()
      }

      const isFist = detectFist(landmarks)
      const isOpenPalm = detectOpenPalm(landmarks)

      if (isFist) {
        return 'fist'
      }

      if (isOpenPalm && palmCenterHistoryRef.current.length >= 4) {
        const history = palmCenterHistoryRef.current
        const recent = history.slice(-3)
        const earlier = history.slice(0, 3)

        const avgRecentX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length
        const avgEarlierX = earlier.reduce((sum, p) => sum + p.x, 0) / earlier.length

        if (avgEarlierX - avgRecentX > 0.08) {
          return 'swipe-left'
        }
        if (avgRecentX - avgEarlierX > 0.08) {
          return 'swipe-right'
        }
      }

      if (isOpenPalm && indexTipHistoryRef.current.length >= 4) {
        const history = indexTipHistoryRef.current
        const recent = history.slice(-3)
        const earlier = history.slice(0, 3)

        const avgRecentY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length
        const avgEarlierY = earlier.reduce((sum, p) => sum + p.y, 0) / earlier.length

        if (avgEarlierY - avgRecentY > 0.08) {
          return 'volume-up'
        }
        if (avgRecentY - avgEarlierY > 0.08) {
          return 'volume-down'
        }
      }

      return null
    },
    []
  )

  const onResults = useCallback(
    (results: any) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        noHandFrameCountRef.current = 0

        for (const landmarks of results.multiHandLandmarks) {
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

          if (gestureCooldownRef.current <= 0) {
            const gesture = detectGesture(landmarks)
            if (gesture && gesture !== lastGestureRef.current) {
              lastGestureRef.current = gesture
              onGesture(gesture)
              gestureCooldownRef.current = 30
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

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !window.Hands) return

    try {
      const hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        },
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      hands.onResults(onResults)
      handsRef.current = hands

      if (window.Camera) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current })
            }
          },
          width: 640,
          height: 480,
        })
        camera.start()
        cameraRef.current = camera
      }

      setCameraAuthorized(true)
    } catch (error) {
      console.error('Camera error:', error)
      setCameraAuthorized(false)
    }
  }, [onResults])

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const loaded = await initMediaPipe()
      if (!loaded || !mounted) {
        setCameraAuthorized(false)
        return
      }

      const hasPermission = await requestCameraPermission()
      if (!hasPermission || !mounted) {
        setCameraAuthorized(false)
        return
      }

      if (videoRef.current) {
        startCamera()
      }
    }

    init()

    return () => {
      mounted = false
      if (cameraRef.current) {
        cameraRef.current.stop?.()
      }
      if (handsRef.current) {
        handsRef.current.close?.()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [initMediaPipe, requestCameraPermission, startCamera])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = 320
      canvas.height = 240
    }

    resizeCanvas()
  }, [])

  return (
    <div className="gesture-controls">
      <div className="gesture-video-container">
        <video ref={videoRef} className="gesture-video" playsInline muted />
        <canvas ref={canvasRef} className="gesture-canvas" />

        {cameraAuthorized === false && (
          <div className="gesture-error">
            <p>摄像头未授权</p>
          </div>
        )}

        {cameraAuthorized === null && mediaPipeLoaded === false && (
          <div className="gesture-loading">
            <p>正在加载手势识别...</p>
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
          <span>食指上下：音量调节</span>
        </div>
      </div>
    </div>
  )
}

export default GestureControls
