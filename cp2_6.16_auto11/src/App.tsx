import { useRef, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Earth from '@/components/Earth'
import WindParticles from '@/components/WindParticles'
import CityMarkers from '@/components/CityMarkers'
import ControlPanel from '@/components/ControlPanel'
import InfoLayer from '@/components/InfoLayer'
import { useStore } from '@/store/useStore'
import { lerp, clampRotationY, clampZoom, INTERPOLATION_FACTOR, easeOut } from '@/controls/Interaction'

const ROTATION_SENSITIVITY = 0.005
const ZOOM_SENSITIVITY = 0.5
const TOUCH_ROTATION_SENSITIVITY = 0.008
const TOUCH_ZOOM_SENSITIVITY = 0.02

function SceneController() {
  const groupRef = useRef<THREE.Group>(null)
  const resetProgressRef = useRef(0)
  const resetStartRef = useRef<{ rotX: number; rotY: number; zoom: number } | null>(null)

  const currentRotXRef = useRef(0)
  const currentRotYRef = useRef(0)
  const currentZoomRef = useRef(5)
  const targetRotXRef = useRef(0)
  const targetRotYRef = useRef(0)
  const targetZoomRef = useRef(5)
  const isResettingRef = useRef(false)

  console.log('SceneController rendering')

  useEffect(() => {
    console.log('SceneController useEffect running')
    const state = useStore.getState()
    targetRotXRef.current = state.targetRotationX
    targetRotYRef.current = state.targetRotationY
    targetZoomRef.current = state.targetZoomLevel
    isResettingRef.current = state.isResetting
    currentRotXRef.current = state.rotationX
    currentRotYRef.current = state.rotationY
    currentZoomRef.current = state.zoomLevel
    console.log('Initial state:', state)

    const unsubscribe = useStore.subscribe((s) => {
      targetRotXRef.current = s.targetRotationX
      targetRotYRef.current = s.targetRotationY
      targetZoomRef.current = s.targetZoomLevel
      isResettingRef.current = s.isResetting
      console.log('Store updated, isResetting:', s.isResetting)
    })

    return () => {
      console.log('SceneController useEffect cleanup')
      unsubscribe()
    }
  }, [])

  useFrame((_state, delta) => {
    if (!groupRef.current) return

    const state = useStore.getState()
    let newRotX: number, newRotY: number, newZoom: number

    if (isResettingRef.current) {
      if (!resetStartRef.current) {
        resetStartRef.current = {
          rotX: currentRotXRef.current,
          rotY: currentRotYRef.current,
          zoom: currentZoomRef.current,
        }
        resetProgressRef.current = 0
        console.log('Reset animation started from:', resetStartRef.current,
          'to:', targetRotXRef.current, targetRotYRef.current, targetZoomRef.current)
      }

      resetProgressRef.current = Math.min(1, resetProgressRef.current + delta / 0.5)
      const t = easeOut(resetProgressRef.current)
      const start = resetStartRef.current

      newRotX = start.rotX + (targetRotXRef.current - start.rotX) * t
      newRotY = start.rotY + (targetRotYRef.current - start.rotY) * t
      newZoom = start.zoom + (targetZoomRef.current - start.zoom) * t

      console.log('Reset progress:', resetProgressRef.current, 't:', t, 'values:', newRotX, newRotY, newZoom)

      if (resetProgressRef.current >= 1) {
        console.log('Reset animation completed!')
        newRotX = targetRotXRef.current
        newRotY = targetRotYRef.current
        newZoom = targetZoomRef.current
        state.setRotation(newRotX, newRotY)
        state.setZoom(newZoom)
        state.setResetting(false)
        resetProgressRef.current = 0
        resetStartRef.current = null
        isResettingRef.current = false
      }
    } else {
      resetStartRef.current = null
      newRotX = currentRotXRef.current + (targetRotXRef.current - currentRotXRef.current) * INTERPOLATION_FACTOR
      newRotY = currentRotYRef.current + (targetRotYRef.current - currentRotYRef.current) * INTERPOLATION_FACTOR
      newZoom = currentZoomRef.current + (targetZoomRef.current - currentZoomRef.current) * INTERPOLATION_FACTOR

      const drx = Math.abs(targetRotXRef.current - newRotX)
      const dry = Math.abs(targetRotYRef.current - newRotY)
      const dz = Math.abs(targetZoomRef.current - newZoom)
      if (drx < 0.001 && dry < 0.001 && dz < 0.01) {
        newRotX = targetRotXRef.current
        newRotY = targetRotYRef.current
        newZoom = targetZoomRef.current
      }

      state.setRotation(newRotX, newRotY)
      state.setZoom(newZoom)
    }

    currentRotXRef.current = newRotX
    currentRotYRef.current = newRotY
    currentZoomRef.current = newZoom

    groupRef.current.rotation.y = newRotX
    groupRef.current.rotation.x = clampRotationY(newRotY)
  })

  return (
    <group ref={groupRef}>
      <Earth />
      <WindParticles />
      <CityMarkers />
    </group>
  )
}

function CameraController() {
  const { camera } = useThree()
  const zoomLevel = useStore((s) => s.zoomLevel)

  useFrame(() => {
    if (camera.position.length() > 0) {
      const dir = camera.position.clone().normalize()
      const targetPos = dir.multiplyScalar(zoomLevel)
      camera.position.lerp(targetPos, 0.1)
      camera.lookAt(0, 0, 0)
    }
  })

  return null
}

function InteractionHandler() {
  const { gl } = useThree()
  const setTargetRotation = useStore((s) => s.setTargetRotation)
  const setTargetZoom = useStore((s) => s.setTargetZoom)
  const targetRotationX = useStore((s) => s.targetRotationX)
  const targetRotationY = useStore((s) => s.targetRotationY)
  const targetZoomLevel = useStore((s) => s.targetZoomLevel)

  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const lastTouchDist = useRef(0)
  const isTouching = useRef(false)

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    isDragging.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (!isDragging.current) return

      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }

      const newRotX = targetRotationX - dx * ROTATION_SENSITIVITY
      const rawRotY = targetRotationY + dy * ROTATION_SENSITIVITY
      const newRotY = clampRotationY(rawRotY)

      setTargetRotation(newRotX, newRotY)
    },
    [setTargetRotation, targetRotationX, targetRotationY],
  )

  const onPointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? ZOOM_SENSITIVITY : -ZOOM_SENSITIVITY
      const newZoom = clampZoom(targetZoomLevel + delta)
      setTargetZoom(newZoom)
    },
    [setTargetZoom, targetZoomLevel],
  )

  const onTouchStart = useCallback((e: TouchEvent) => {
    isTouching.current = true
    if (e.touches.length === 1) {
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [])

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && isTouching.current) {
        const dx = e.touches[0].clientX - lastPointer.current.x
        const dy = e.touches[0].clientY - lastPointer.current.y
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }

        const newRotX = targetRotationX - dx * TOUCH_ROTATION_SENSITIVITY
        const rawRotY = targetRotationY + dy * TOUCH_ROTATION_SENSITIVITY
        const newRotY = clampRotationY(rawRotY)
        setTargetRotation(newRotX, newRotY)
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (lastTouchDist.current > 0) {
          const scale = 1 - (dist - lastTouchDist.current) * TOUCH_ZOOM_SENSITIVITY
          const newZoom = clampZoom(targetZoomLevel * scale)
          setTargetZoom(newZoom)
        }
        lastTouchDist.current = dist
      }
    },
    [setTargetRotation, setTargetZoom, targetRotationX, targetRotationY, targetZoomLevel],
  )

  const onTouchEnd = useCallback(() => {
    isTouching.current = false
    lastTouchDist.current = 0
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [gl, onPointerDown, onPointerMove, onPointerUp, onWheel, onTouchStart, onTouchMove, onTouchEnd])

  return null
}

function SimTimeUpdater() {
  const setSimTime = useStore((s) => s.setSimTime)

  useEffect(() => {
    function updateTime() {
      const now = new Date(Date.UTC(2024, 4, 15, 14, 30, 0))
      const offset = (Date.now() % 86400000) / 1000
      now.setSeconds(now.getSeconds() + Math.floor(offset))
      const year = now.getUTCFullYear()
      const month = String(now.getUTCMonth() + 1).padStart(2, '0')
      const day = String(now.getUTCDate()).padStart(2, '0')
      const hour = String(now.getUTCHours()).padStart(2, '0')
      const min = String(now.getUTCMinutes()).padStart(2, '0')
      setSimTime(`模拟时间：${year}-${month}-${day} ${hour}:${min} UTC`)
    }
    updateTime()
    const id = setInterval(updateTime, 5000)
    return () => clearInterval(id)
  }, [setSimTime])

  return null
}

function Lights() {
  console.log('Lights rendering')
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={0.7} color="#c8d8f0" />
      <pointLight position={[-5, -2, 3]} intensity={0.2} color="#1e88e5" />
    </>
  )
}

export default function App() {
  console.log('App rendering')

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a1a', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: '#0a0a1a' }}
        onCreated={({ gl }) => {
          console.log('Canvas onCreated')
          gl.setClearColor('#0a0a1a')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.2
        }}
      >
        <Lights />
        <SceneController />
        <CameraController />
        <InteractionHandler />
        <SimTimeUpdater />
      </Canvas>
      <ControlPanel />
      <InfoLayer />
    </div>
  )
}
