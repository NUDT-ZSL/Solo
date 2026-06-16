import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import ParticleCloudMesh from './components/ParticleCloudMesh'
import LightTrailMesh, { LightTrailMeshHandle } from './components/LightTrailMesh'
import ControlPanel from './modules/interaction/ControlPanel'
import { themes } from './modules/particleSystem/ParticleCloud'

function CameraController({
  onTrailAdd,
  resetTrigger
}: {
  onTrailAdd: (position: THREE.Vector3) => void
  resetTrigger: number
}) {
  const { camera, gl } = useThree()
  const isDragging = useRef(false)
  const previousMouse = useRef({ x: 0, y: 0 })
  const theta = useRef(0)
  const phi = useRef(Math.PI / 2)
  const radius = useRef(150)
  const target = useRef(new THREE.Vector3(0, 0, 0))
  const minRadius = 30
  const maxRadius = 300
  const rotateSpeed = 0.005
  const zoomSpeed = 0.001
  const mouse = useRef(new THREE.Vector2())
  const raycaster = useRef(new THREE.Raycaster())

  const updateCamera = useCallback(() => {
    const x = target.current.x + radius.current * Math.sin(phi.current) * Math.cos(theta.current)
    const y = target.current.y + radius.current * Math.cos(phi.current)
    const z = target.current.z + radius.current * Math.sin(phi.current) * Math.sin(theta.current)

    camera.position.set(x, y, z)
    camera.lookAt(target.current)
  }, [camera])

  useEffect(() => {
    updateCamera()
  }, [updateCamera])

  useEffect(() => {
    const canvas = gl.domElement

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      isDragging.current = true
      previousMouse.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (isDragging.current) {
        const deltaX = e.clientX - previousMouse.current.x
        const deltaY = e.clientY - previousMouse.current.y

        theta.current -= deltaX * rotateSpeed
        phi.current -= deltaY * rotateSpeed

        phi.current = Math.max(0.01, Math.min(Math.PI - 0.01, phi.current))

        previousMouse.current = { x: e.clientX, y: e.clientY }
        updateCamera()

        raycaster.current.setFromCamera(mouse.current, camera)
        const trailDistance = 100
        const direction = new THREE.Vector3()
        raycaster.current.ray.direction.normalize()
        direction.copy(raycaster.current.ray.direction).multiplyScalar(trailDistance)
        const trailPosition = new THREE.Vector3()
        trailPosition.copy(raycaster.current.ray.origin).add(direction)
        onTrailAdd(trailPosition)
      }
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = 1 + e.deltaY * zoomSpeed
      radius.current *= zoomFactor
      radius.current = Math.max(minRadius, Math.min(maxRadius, radius.current))
      updateCamera()
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [camera, gl, onTrailAdd, updateCamera])

  useEffect(() => {
    if (resetTrigger > 0) {
      theta.current = 0
      phi.current = Math.PI / 2
      radius.current = 150
      target.current.set(0, 0, 0)
      updateCamera()
    }
  }, [resetTrigger, updateCamera])

  return null
}

function Scene({
  particleCount,
  theme,
  resetTrigger
}: {
  particleCount: number
  theme: string
  resetTrigger: number
}) {
  const lightTrailRef = useRef<LightTrailMeshHandle>(null)

  const handleTrailAdd = useCallback((position: THREE.Vector3) => {
    if (lightTrailRef.current) {
      lightTrailRef.current.addParticle(position.clone())
    }
  }, [])

  const themeColors = themes[theme] || themes.default

  return (
    <>
      <CameraController onTrailAdd={handleTrailAdd} resetTrigger={resetTrigger} />
      <ParticleCloudMesh count={particleCount} theme={themeColors} />
      <LightTrailMesh ref={lightTrailRef} maxCount={800} lifetime={3} />
    </>
  )
}

function App() {
  const [theme, setTheme] = useState('default')
  const [particleCount, setParticleCount] = useState(50000)
  const [resetTrigger, setResetTrigger] = useState(0)

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 150], fov: 60, near: 0.1, far: 1000 }}
        style={{ background: '#0a0a1a' }}
        gl={{ antialias: true }}
      >
        <Scene particleCount={particleCount} theme={theme} resetTrigger={resetTrigger} />
      </Canvas>

      <ControlPanel
        theme={theme}
        particleCount={particleCount}
        onThemeChange={setTheme}
        onParticleCountChange={setParticleCount}
        onResetView={handleResetView}
      />
    </div>
  )
}

export default App
