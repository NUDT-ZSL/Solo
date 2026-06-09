import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EmotionData, EMOTION_COLORS, EMOTION_LABELS } from '../utils/emotionDataGenerator'

export interface ParticleClickInfo {
  id: string
  type: string
  intensity: number
  position: THREE.Vector3
  color: string
  timestamp: number
}

interface Props {
  data: EmotionData[]
  onParticleClick: (info: ParticleClickInfo) => void
  paused: boolean
}

const MAX_PARTICLES = 1200
const ENTER_DURATION = 1500
const EXIT_DURATION = 1000
const PULSE_DURATION = 200
const RIPPLE_DURATION = 1000

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  }
}

interface ParticleState {
  id: string
  data: EmotionData
  targetX: number
  targetY: number
  targetZ: number
  startX: number
  startY: number
  startZ: number
  baseSize: number
  color: { r: number; g: number; b: number }
  status: 'entering' | 'normal' | 'exiting'
  statusStart: number
  pulseStart: number
  removalMarked: boolean
}

interface Ripple {
  id: string
  position: THREE.Vector3
  color: { r: number; g: number; b: number }
  startTime: number
}

const FloatingParticles: React.FC<Props> = ({ data, onParticleClick, paused }) => {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera, gl } = useThree()
  const [ripples, setRipples] = useState<Ripple[]>([])

  const particleMap = useRef<Map<string, number>>(new Map())
  const particleStates = useRef<ParticleState[]>([])
  const removedIds = useRef<Set<string>>(new Set())

  const positions = useRef(new Float32Array(MAX_PARTICLES * 3))
  const colors = useRef(new Float32Array(MAX_PARTICLES * 3))
  const sizes = useRef(new Float32Array(MAX_PARTICLES))
  const opacities = useRef(new Float32Array(MAX_PARTICLES))

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions.current, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors.current, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes.current, 1))
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities.current, 1))
    return geo
  }, [])

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  const getDataIndex = useCallback((id: string): number => {
    return particleMap.current.get(id) ?? -1
  }, [])

  const findEmptySlot = useCallback((): number => {
    const used = new Set(particleMap.current.values())
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!used.has(i)) return i
    }
    return -1
  }, [])

  const initParticle = useCallback((item: EmotionData, index: number, isNew: boolean) => {
    const colorHex = EMOTION_COLORS[item.type]
    const color = hexToRgb(colorHex)

    const targetX = item.polarity * 5
    const targetY = (item.intensity - 0.5) * 6
    const targetZ = (Math.random() - 0.5) * 4

    let startX: number, startY: number, startZ: number
    if (isNew) {
      const side = Math.random() > 0.5 ? 1 : -1
      startX = side * 6
      startY = (Math.random() - 0.5) * 6
      startZ = (Math.random() - 0.5) * 4
    } else {
      startX = targetX
      startY = targetY
      startZ = targetZ
    }

    const baseSize = 1.5 + Math.random() * 2.5

    const state: ParticleState = {
      id: item.id,
      data: item,
      targetX,
      targetY,
      targetZ,
      startX,
      startY,
      startZ,
      baseSize,
      color,
      status: isNew ? 'entering' : 'normal',
      statusStart: performance.now(),
      pulseStart: -1,
      removalMarked: false
    }

    particleStates.current[index] = state
    particleMap.current.set(item.id, index)
    removedIds.current.delete(item.id)

    positions.current[index * 3] = startX
    positions.current[index * 3 + 1] = startY
    positions.current[index * 3 + 2] = startZ

    colors.current[index * 3] = color.r
    colors.current[index * 3 + 1] = color.g
    colors.current[index * 3 + 2] = color.b

    sizes.current[index] = isNew ? 0.5 : baseSize
    opacities.current[index] = isNew ? 0 : 1
  }, [])

  useEffect(() => {
    particleStates.current = []
    particleMap.current.clear()
    removedIds.current.clear()

    const maxInit = Math.min(data.length, MAX_PARTICLES)
    for (let i = 0; i < maxInit; i++) {
      initParticle(data[i], i, false)
    }

    for (let i = maxInit; i < MAX_PARTICLES; i++) {
      opacities.current[i] = 0
      sizes.current[i] = 0
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.attributes.aSize.needsUpdate = true
    geometry.attributes.aOpacity.needsUpdate = true
  }, [])

  const activeDataIds = useRef(new Set<string>())

  useEffect(() => {
    if (paused) return

    activeDataIds.current = new Set(data.map(d => d.id))

    for (const state of particleStates.current) {
      if (!state || state.removalMarked) continue
      if (!activeDataIds.current.has(state.id) && state.status !== 'exiting') {
        state.status = 'exiting'
        state.statusStart = performance.now()
        state.removalMarked = true
        removedIds.current.add(state.id)
      }
    }

    for (const item of data) {
      if (particleMap.current.has(item.id)) continue

      const slot = findEmptySlot()
      if (slot === -1) {
        for (let i = 0; i < particleStates.current.length; i++) {
          const s = particleStates.current[i]
          if (s && s.removalMarked) {
            particleMap.current.delete(s.id)
            initParticle(item, i, true)
            break
          }
        }
      } else {
        initParticle(item, slot, true)
      }
    }
  }, [data, paused, findEmptySlot, initParticle])

  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())

  const handlePointerDown = useCallback((event: any) => {
    const rect = gl.domElement.getBoundingClientRect()
    pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(pointer.current, camera)

    if (pointsRef.current) {
      const intersects = raycaster.current.intersectObject(pointsRef.current)
      if (intersects.length > 0) {
        const idx = intersects[0].index
        if (idx !== undefined) {
          const state = particleStates.current[idx]
          if (state && !state.removalMarked && opacities.current[idx] > 0.1) {
            state.pulseStart = performance.now()

            const pos = new THREE.Vector3(
              positions.current[idx * 3],
              positions.current[idx * 3 + 1],
              positions.current[idx * 3 + 2]
            )

            const rippleId = `ripple-${Date.now()}-${Math.random()}`
            setRipples(prev => [
              ...prev,
              {
                id: rippleId,
                position: pos.clone(),
                color: { ...state.color },
                startTime: performance.now()
              }
            ])

            const colorHex = EMOTION_COLORS[state.data.type]
            onParticleClick({
              id: state.id,
              type: EMOTION_LABELS[state.data.type],
              intensity: state.data.intensity,
              position: pos.clone(),
              color: colorHex,
              timestamp: performance.now()
            })

            setTimeout(() => {
              setRipples(prev => prev.filter(r => r.id !== rippleId))
            }, RIPPLE_DURATION + 100)
          }
        }
      }
    }
  }, [camera, gl, onParticleClick])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointerdown', handlePointerDown)
    return () => canvas.removeEventListener('pointerdown', handlePointerDown)
  }, [gl, handlePointerDown])

  useFrame(() => {
    const now = performance.now()
    let needsUpdate = false

    for (let i = 0; i < particleStates.current.length; i++) {
      const state = particleStates.current[i]
      if (!state) continue

      let size = state.baseSize
      let opacity = 1
      let x = state.targetX
      let y = state.targetY
      let z = state.targetZ

      if (state.status === 'entering') {
        const t = Math.min(1, (now - state.statusStart) / ENTER_DURATION)
        const e = easeOut(t)
        x = state.startX + (state.targetX - state.startX) * e
        y = state.startY + (state.targetY - state.startY) * e
        z = state.startZ + (state.targetZ - state.startZ) * e
        size = state.baseSize * (0.3 + 0.7 * e)
        opacity = e
        if (t >= 1) state.status = 'normal'
      } else if (state.status === 'exiting') {
        const t = Math.min(1, (now - state.statusStart) / EXIT_DURATION)
        opacity = 1 - t
        size = state.baseSize * (1 - t * 0.5)
        if (t >= 1) {
          particleMap.current.delete(state.id)
          particleStates.current[i] = undefined as any
          opacities.current[i] = 0
          sizes.current[i] = 0
          needsUpdate = true
          continue
        }
      }

      if (state.pulseStart > 0) {
        const t = (now - state.pulseStart) / PULSE_DURATION
        if (t < 1) {
          const pulse = 1 + 2 * (1 - t)
          size *= pulse
        } else {
          state.pulseStart = -1
        }
      }

      if (positions.current[i * 3] !== x) { positions.current[i * 3] = x; needsUpdate = true }
      if (positions.current[i * 3 + 1] !== y) { positions.current[i * 3 + 1] = y; needsUpdate = true }
      if (positions.current[i * 3 + 2] !== z) { positions.current[i * 3 + 2] = z; needsUpdate = true }
      if (sizes.current[i] !== size) { sizes.current[i] = size; needsUpdate = true }
      if (opacities.current[i] !== opacity) { opacities.current[i] = opacity; needsUpdate = true }
    }

    if (needsUpdate) {
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aSize.needsUpdate = true
      geometry.attributes.aOpacity.needsUpdate = true
    }
  })

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={shaderMaterial} />
      {ripples.map(ripple => (
        <RippleMesh key={ripple.id} ripple={ripple} />
      ))}
    </>
  )
}

const RippleMesh: React.FC<{ ripple: Ripple }> = ({ ripple }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const startTime = ripple.startTime

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(ripple.color.r, ripple.color.g, ripple.color.b),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  }, [ripple.color])

  const geometry = useMemo(() => new THREE.RingGeometry(0.48, 0.5, 8), [])

  useFrame(({ camera }) => {
    if (!meshRef.current) return
    const now = performance.now()
    const t = Math.min(1, (now - startTime) / RIPPLE_DURATION)

    const scale = 1 + t * 5
    meshRef.current.scale.set(scale, scale, 1)
    material.opacity = 0.8 * (1 - t)

    meshRef.current.quaternion.copy(camera.quaternion)
    meshRef.current.position.copy(ripple.position)
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}

export default FloatingParticles
