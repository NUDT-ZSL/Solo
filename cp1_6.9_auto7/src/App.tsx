import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Scene, SceneHandle } from './Scene'
import { ControlPanel } from './ControlPanel'

interface CameraControllerProps {
  onCameraReady?: (camera: THREE.PerspectiveCamera) => void
}

function CameraController({ onCameraReady }: CameraControllerProps) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera && onCameraReady) {
      onCameraReady(camera as THREE.PerspectiveCamera)
    }
  }, [camera, onCameraReady])
  return null
}

function App() {
  const [magnetStrength, setMagnetStrength] = useState(2.0)
  const [flowRate, setFlowRate] = useState(1.0)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [isAutoEvolving, setIsAutoEvolving] = useState(false)

  const sceneRef = useRef<SceneHandle>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null) as React.MutableRefObject<HTMLCanvasElement | null>
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const lastClickTimeRef = useRef(0)
  const isDraggingRef = useRef(false)
  const downPosRef = useRef({ x: 0, y: 0 })

  const screenToWorld = useCallback((clientX: number, clientY: number): THREE.Vector3 | null => {
    if (!canvasRef.current || !cameraRef.current) return null
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -((clientY - rect.top) / rect.height) * 2 + 1
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current)
    const dir = raycaster.ray.direction.clone()
    const origin = raycaster.ray.origin.clone()
    const targetDistance = 6
    const pos = origin.add(dir.multiplyScalar(targetDistance))
    return pos
  }, [])

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = window.setTimeout(() => {
      setIsAutoEvolving(true)
    }, 3000)
  }, [])

  const stopIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    setIsAutoEvolving(false)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - downPosRef.current.x
      const dy = e.clientY - downPosRef.current.y
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return
    }
    const worldPos = screenToWorld(e.clientX, e.clientY)
    if (worldPos && sceneRef.current) {
      sceneRef.current.updateMagnet(worldPos)
    }
    stopIdleTimer()
  }, [screenToWorld, stopIdleTimer])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true
    downPosRef.current = { x: e.clientX, y: e.clientY }
    stopIdleTimer()
  }, [stopIdleTimer])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const now = performance.now()
    const isDoubleClick = now - lastClickTimeRef.current < 500
    lastClickTimeRef.current = now
    const worldPos = screenToWorld(e.clientX, e.clientY)
    if (worldPos && sceneRef.current) {
      const strength = isDoubleClick ? magnetStrength * 2 : magnetStrength
      sceneRef.current.addExplosion(worldPos, strength)
    }
    stopIdleTimer()
  }, [screenToWorld, stopIdleTimer, magnetStrength])

  const handleWheel = useCallback(() => {
    stopIdleTimer()
  }, [stopIdleTimer])

  const handleReset = useCallback(() => {
    setResetTrigger(Date.now())
    stopIdleTimer()
    if (sceneRef.current) {
      sceneRef.current.resetParticles()
    }
  }, [stopIdleTimer])

  const handleCameraReady = useCallback((camera: THREE.PerspectiveCamera) => {
    cameraRef.current = camera
    camera.position.set(0, 0, 10)
    camera.fov = 60
    camera.near = 0.1
    camera.far = 100
    camera.updateProjectionMatrix()
  }, [])

  useEffect(() => {
    startIdleTimer()
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current)
      }
    }
  }, [startIdleTimer])

  const onCreated = useCallback((state: any) => {
    canvasRef.current = state.gl.domElement
    state.gl.domElement.style.cursor = 'crosshair'
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        inset: 0,
        background: '#000000',
        overflow: 'hidden'
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60, near: 0.1, far: 100 }}
        onCreated={onCreated}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={() => { isDraggingRef.current = false }}
        onClick={handleClick}
        onWheel={handleWheel}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={[1, Math.min(window.devicePixelRatio || 1, 2)]}
      >
        <CameraController onCameraReady={handleCameraReady} />
        <color attach="background" args={['#000000']} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={0.5}
          maxDistance={10}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
          minPolarAngle={Math.PI / 2 - (30 * Math.PI) / 180}
          maxPolarAngle={Math.PI / 2 + (30 * Math.PI) / 180}
          minAzimuthAngle={-Math.PI}
          maxAzimuthAngle={Math.PI}
          enablePan={false}
        />
        <Scene
          ref={sceneRef}
          magnetStrength={magnetStrength}
          flowRate={flowRate}
          resetTrigger={resetTrigger}
          autoEvolve={isAutoEvolving}
          onAutoEvolveChange={setIsAutoEvolving}
        />
      </Canvas>

      <ControlPanel
        magnetStrength={magnetStrength}
        onMagnetStrengthChange={setMagnetStrength}
        flowRate={flowRate}
        onFlowRateChange={setFlowRate}
        onReset={handleReset}
        isAutoEvolving={isAutoEvolving}
      />

      <div
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          color: 'rgba(150, 180, 255, 0.4)',
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
          fontSize: 12,
          pointerEvents: 'none',
          lineHeight: 1.6,
          textShadow: '0 0 8px rgba(0, 0, 0, 0.8)',
          zIndex: 500,
          maxWidth: 280
        }}
      >
        <div style={{ color: 'rgba(102, 153, 255, 0.6)', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
          磁流体雕塑
        </div>
        <div>移动鼠标：操控磁场</div>
        <div>拖拽旋转：切换视角</div>
        <div>滚轮：缩放空间</div>
        <div>点击：爆炸脉冲</div>
      </div>
    </div>
  )
}

export default App
