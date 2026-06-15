import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppContext } from '../App'

interface ShipControllerProps {
  cameraShake: number
}

const MOVE_SPEED = 8
const MOUSE_SENSITIVITY_X = 0.003
const MOUSE_SENSITIVITY_Y = 0.002
const MAX_PITCH = (80 * Math.PI) / 180
const DAMPING = 0.92

export default function ShipController({ cameraShake }: ShipControllerProps) {
  const { setShipState } = useAppContext()
  const { camera, gl } = useThree()

  const keysRef = useRef<Set<string>>(new Set())
  const yawRef = useRef(0)
  const pitchRef = useRef(-Math.PI / 4)
  const velocityRef = useRef(new THREE.Vector3())
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const shakeOffsetRef = useRef(new THREE.Vector3())
  const prevPositionRef = useRef(new THREE.Vector3())
  const actualSpeedRef = useRef(0)

  useEffect(() => {
    const r = 50
    const theta = Math.PI / 4
    const phi = 0
    camera.position.set(
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi)
    )
    camera.lookAt(0, 0, 0)
    prevPositionRef.current.copy(camera.position)

    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    yawRef.current = Math.atan2(-dir.x, -dir.z)
    pitchRef.current = Math.asin(dir.y)
  }, [camera])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.code)
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.code)
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = true
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = false
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastMouseRef.current.x
    const dy = e.clientY - lastMouseRef.current.y
    lastMouseRef.current = { x: e.clientX, y: e.clientY }

    yawRef.current -= dx * MOUSE_SENSITIVITY_X
    pitchRef.current -= dy * MOUSE_SENSITIVITY_Y
    pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchRef.current))
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [gl, handleKeyDown, handleKeyUp, handleMouseDown, handleMouseUp, handleMouseMove])

  useFrame((_state, delta) => {
    const keys = keysRef.current
    const forward = new THREE.Vector3(
      -Math.sin(yawRef.current) * Math.cos(pitchRef.current),
      Math.sin(pitchRef.current),
      -Math.cos(yawRef.current) * Math.cos(pitchRef.current)
    ).normalize()
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize()
    const up = new THREE.Vector3(0, 1, 0)

    const acceleration = new THREE.Vector3()
    if (keys.has('KeyW')) acceleration.add(forward)
    if (keys.has('KeyS')) acceleration.sub(forward)
    if (keys.has('KeyA')) acceleration.sub(right)
    if (keys.has('KeyD')) acceleration.add(right)
    if (keys.has('Space')) acceleration.add(up)
    if (keys.has('ShiftLeft') || keys.has('ShiftRight')) acceleration.sub(up)

    if (acceleration.lengthSq() > 0) {
      acceleration.normalize().multiplyScalar(MOVE_SPEED * delta)
      velocityRef.current.add(acceleration)
    }

    velocityRef.current.multiplyScalar(DAMPING)

    const prevPos = camera.position.clone()
    camera.position.add(velocityRef.current.clone().multiplyScalar(delta * 60))

    const lookTarget = camera.position.clone().add(forward.multiplyScalar(10))

    if (cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * 2 * cameraShake * Math.sin(performance.now() * 0.01 * 10)
      const shakeY = (Math.random() - 0.5) * 2 * cameraShake * Math.sin(performance.now() * 0.01 * 10 + 1)
      const shakeZ = (Math.random() - 0.5) * 2 * cameraShake * Math.sin(performance.now() * 0.01 * 10 + 2)
      shakeOffsetRef.current.set(shakeX, shakeY, shakeZ)
    } else {
      shakeOffsetRef.current.set(0, 0, 0)
    }

    camera.position.add(shakeOffsetRef.current)
    camera.lookAt(
      lookTarget.x + shakeOffsetRef.current.x,
      lookTarget.y + shakeOffsetRef.current.y,
      lookTarget.z + shakeOffsetRef.current.z
    )

    const actualSpeed = prevPos.distanceTo(camera.position) / Math.max(delta, 0.001)
    actualSpeedRef.current = actualSpeed

    setShipState({
      position: {
        x: parseFloat(camera.position.x.toFixed(2)),
        y: parseFloat(camera.position.y.toFixed(2)),
        z: parseFloat(camera.position.z.toFixed(2)),
      },
      speed: parseFloat(actualSpeed.toFixed(2)),
    })
  })

  return null
}
