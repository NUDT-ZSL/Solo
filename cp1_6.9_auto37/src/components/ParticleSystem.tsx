import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface ParticleSpawn {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  birthTime: number
  lifetime: number
}

interface ParticleSystemProps {
  particles?: ParticleSpawn[]
}

const MAX_PARTICLES = 500

interface LiveParticle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  color: THREE.Color
  size: number
  birth: number
  life: number
  rot: number
  rotSpeed: number
}

export default function ParticleSystem({ particles = [] }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const liveParticles = useRef<Map<number, LiveParticle>>(new Map())
  const processedIds = useRef<Set<number>>(new Set())

  const { positions, colors, sizes, opacities } = useMemo(() => {
    return {
      positions: new Float32Array(MAX_PARTICLES * 3),
      colors: new Float32Array(MAX_PARTICLES * 3),
      sizes: new Float32Array(MAX_PARTICLES),
      opacities: new Float32Array(MAX_PARTICLES),
    }
  }, [])

  useEffect(() => {
    for (const p of particles) {
      if (processedIds.current.has(p.id)) continue
      processedIds.current.add(p.id)
      liveParticles.current.set(p.id, {
        pos: p.position.clone(),
        vel: p.velocity.clone(),
        color: p.color.clone(),
        size: p.size,
        birth: p.birthTime,
        life: p.lifetime,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 4,
      })
    }
    if (processedIds.current.size > 2000) {
      processedIds.current.clear()
    }
  }, [particles])

  useFrame(() => {
    const now = performance.now()
    const posAttr = positions
    const colAttr = colors
    const sizeAttr = sizes
    const opAttr = opacities

    let activeCount = 0

    const toRemove: number[] = []
    for (const [id, lp] of liveParticles.current.entries()) {
      const age = now - lp.birth
      if (age > lp.life) {
        toRemove.push(id)
        continue
      }

      const dt = 1 / 60
      lp.vel.y -= 4 * dt
      lp.vel.multiplyScalar(0.985)
      lp.pos.addScaledVector(lp.vel, dt)
      lp.rot += lp.rotSpeed * dt

      const t = age / lp.life
      const alpha = 1 - t
      const brightness = 1 + (1 - t) * 0.8

      const i3 = activeCount * 3
      posAttr[i3] = lp.pos.x
      posAttr[i3 + 1] = lp.pos.y
      posAttr[i3 + 2] = lp.pos.z

      colAttr[i3] = Math.min(1, lp.color.r * brightness)
      colAttr[i3 + 1] = Math.min(1, lp.color.g * brightness)
      colAttr[i3 + 2] = Math.min(1, lp.color.b * brightness)

      sizeAttr[activeCount] = lp.size * (1 + (1 - t) * 0.5)
      opAttr[activeCount] = alpha

      activeCount++
      if (activeCount >= MAX_PARTICLES) break
    }

    for (const id of toRemove) {
      liveParticles.current.delete(id)
    }

    for (let i = activeCount; i < MAX_PARTICLES; i++) {
      const i3 = i * 3
      posAttr[i3] = 0
      posAttr[i3 + 1] = -1000
      posAttr[i3 + 2] = 0
      colAttr[i3] = 0
      colAttr[i3 + 1] = 0
      colAttr[i3 + 2] = 0
      sizeAttr[i] = 0
      opAttr[i] = 0
    }

    if (geometryRef.current) {
      const g = geometryRef.current
      ;(g.attributes.position as THREE.BufferAttribute).needsUpdate = true
      ;(g.attributes.color as THREE.BufferAttribute).needsUpdate = true
      ;(g.attributes.size as THREE.BufferAttribute).needsUpdate = true
      ;(g.attributes.opacity as THREE.BufferAttribute).needsUpdate = true
      g.setDrawRange(0, MAX_PARTICLES)
    }
  })

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef} attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-opacity"
          args={[opacities, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        attach="material"
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        uniforms={{
          uTexture: { value: particleTexture },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        }}
        vertexShader={`
          attribute float size;
          attribute float opacity;
          varying vec3 vColor;
          varying float vOpacity;
          uniform float uPixelRatio;
          void main() {
            vColor = color;
            vOpacity = opacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 200.0 * uPixelRatio / -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform sampler2D uTexture;
          varying vec3 vColor;
          varying float vOpacity;
          void main() {
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            if (texColor.a < 0.01) discard;
            gl_FragColor = vec4(vColor * 1.5, vOpacity * texColor.a);
          }
        `}
      />
    </points>
  )
}
