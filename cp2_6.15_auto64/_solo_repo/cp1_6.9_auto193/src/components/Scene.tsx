import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { SandParticle, SparkParticle, FlowLine, BrushStroke } from '../utils/physics'
import { applyBrush, stepGravity, mergeParticles, interpolateParticles } from '../utils/physics'

interface SceneProps {
  particles: SandParticle[]
  setParticles: React.Dispatch<React.SetStateAction<SandParticle[]>>
  brushSize: number
  isResetting: boolean
  resetProgress: number
  initialParticles: SandParticle[]
  onFPSUpdate: (fps: number) => void
}

function SandPoints({ particles }: { particles: SandParticle[] }) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(particles.length * 3)
    const col = new Float32Array(particles.length * 3)
    const siz = new Float32Array(particles.length)

    particles.forEach((p, i) => {
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      const color = new THREE.Color(p.color)
      col[i * 3] = color.r
      col[i * 3 + 1] = color.g
      col[i * 3 + 2] = color.b
      siz[i] = p.radius * 0.8
    })

    return { positions: pos, colors: col, sizes: siz }
  }, [particles])

  useEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry as THREE.BufferGeometry
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
      const colAttr = geo.getAttribute('color') as THREE.BufferAttribute
      for (let i = 0; i < particles.length; i++) {
        posAttr.setXYZ(i, particles[i].x, particles[i].y, particles[i].z)
        const color = new THREE.Color(particles[i].color)
        colAttr.setXYZ(i, color.r, color.g, color.b)
      }
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      geo.computeVertexNormals()
    }
  }, [particles])

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.2}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={true}
      />
    </points>
  )
}

function SparkPoints({ sparks }: { sparks: SparkParticle[] }) {
  const { positions, colors, opacities } = useMemo(() => {
    const pos = new Float32Array(sparks.length * 3)
    const col = new Float32Array(sparks.length * 3)
    const opa = new Float32Array(sparks.length)

    sparks.forEach((s, i) => {
      pos[i * 3] = s.x
      pos[i * 3 + 1] = s.y
      pos[i * 3 + 2] = s.z
      col[i * 3] = 1
      col[i * 3 + 1] = 0.843
      col[i * 3 + 2] = 0
      opa[i] = s.life / s.maxLife
    })

    return { positions: pos, colors: col, opacities: opa }
  }, [sparks])

  if (sparks.length === 0) return null

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function FlowLines({ lines }: { lines: FlowLine[] }) {
  const geomRef = useRef<THREE.BufferGeometry>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(lines.length * 6)
    lines.forEach((l, i) => {
      pos[i * 6] = l.x1
      pos[i * 6 + 1] = l.y1
      pos[i * 6 + 2] = l.z1
      pos[i * 6 + 3] = l.x2
      pos[i * 6 + 4] = l.y2
      pos[i * 6 + 5] = l.z2
    })
    return pos
  }, [lines])

  if (lines.length === 0) return null

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.3}
        linewidth={0.3}
      />
    </lineSegments>
  )
}

function MouseLight() {
  const lightRef = useRef<THREE.PointLight>(null)
  const { mouse } = useThree()

  useFrame(() => {
    if (lightRef.current) {
      const radius = 10
      const theta = (mouse.x * 0.5 + 0.5) * Math.PI
      const phi = (0.5 - mouse.y * 0.3) * Math.PI
      lightRef.current.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) + 5,
        radius * Math.sin(phi) * Math.sin(theta)
      )
    }
  })

  return (
    <pointLight
      ref={lightRef}
      intensity={0.8}
      color="#fff5e6"
      distance={50}
      decay={2}
    />
  )
}

interface InteractionHandlerProps {
  setParticles: React.Dispatch<React.SetStateAction<SandParticle[]>>
  brushSize: number
  setSparks: React.Dispatch<React.SetStateAction<SparkParticle[]>>
  setFlowLines: React.Dispatch<React.SetStateAction<FlowLine[]>>
  onFPSUpdate: (fps: number) => void
  particlesRef: React.MutableRefObject<SandParticle[]>
}

function InteractionHandler({
  setParticles,
  brushSize,
  setSparks,
  setFlowLines,
  onFPSUpdate,
  particlesRef
}: InteractionHandlerProps) {
  const { camera, gl, raycaster, pointer } = useThree()
  const isDragging = useRef(false)
  const isBrushDown = useRef(false)
  const lastBrushPos = useRef({ x: 0, z: 0 })
  const lastFrameTime = useRef(performance.now())
  const frameCount = useRef(0)
  const fpsTimer = useRef(0)

  const groundPlane = useMemo(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    return plane
  }, [])

  useFrame((state, delta) => {
    frameCount.current++
    const now = performance.now()
    const elapsed = now - lastFrameTime.current
    fpsTimer.current += elapsed

    if (fpsTimer.current >= 500) {
      const fps = (frameCount.current / fpsTimer.current) * 1000
      onFPSUpdate(fps)
      frameCount.current = 0
      fpsTimer.current = 0
    }
    lastFrameTime.current = now

    if (isBrushDown.current) {
      raycaster.setFromCamera(pointer, camera)
      const intersect = new THREE.Vector3()
      const hit = raycaster.ray.intersectPlane(groundPlane, intersect)

      if (hit) {
        const stroke: BrushStroke = {
          centerX: intersect.x,
          centerZ: intersect.z,
          dirX: intersect.x - lastBrushPos.current.x,
          dirZ: intersect.z - lastBrushPos.current.z,
          radius: brushSize * 0.8,
          strength: 1.0
        }

        if (Math.abs(stroke.dirX) > 0.01 || Math.abs(stroke.dirZ) > 0.01) {
          setParticles(prev => {
            const result = applyBrush(prev, stroke)
            setSparks(s => [...s, ...result.sparks])
            const gravityResult = stepGravity(result.particles, 3)
            setFlowLines(fl => [...fl, ...gravityResult.flowLines])
            particlesRef.current = gravityResult.particles
            return mergeParticles(gravityResult.particles)
          })
        }

        lastBrushPos.current = { x: intersect.x, z: intersect.z }
      }
    }

    setParticles(prev => {
      if (prev.some(p => p.displaced)) {
        const result = stepGravity(prev, 3)
        setFlowLines(fl => [...fl, ...result.flowLines])
        particlesRef.current = result.particles
        return result.particles
      }
      return prev
    })

    setSparks(prev =>
      prev
        .map(s => ({ ...s, life: s.life - delta, y: s.y + delta * 2 }))
        .filter(s => s.life > 0)
    )

    setFlowLines(prev =>
      prev
        .map(l => ({ ...l, life: l.life - delta }))
        .filter(l => l.life > 0)
    )
  })

  useEffect(() => {
    const canvas = gl.domElement
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 && !e.shiftKey) {
        isBrushDown.current = true
        raycaster.setFromCamera(pointer, camera)
        const intersect = new THREE.Vector3()
        const hit = raycaster.ray.intersectPlane(groundPlane, intersect)
        if (hit) {
          lastBrushPos.current = { x: intersect.x, z: intersect.z }
        }
      } else {
        isDragging.current = true
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) {
        isBrushDown.current = false
      }
      isDragging.current = false
    }

    const onPointerMove = (e: PointerEvent) => {
      if (isBrushDown.current) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointermove', onPointerMove)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointermove', onPointerMove)
    }
  }, [gl.domElement, pointer, camera, raycaster, groundPlane])

  return null
}

function SceneContent({
  particles,
  setParticles,
  brushSize,
  isResetting,
  resetProgress,
  initialParticles,
  onFPSUpdate
}: SceneProps) {
  const [sparks, setSparks] = useState<SparkParticle[]>([])
  const [flowLines, setFlowLines] = useState<FlowLine[]>([])
  const particlesRef = useRef(particles)
  particlesRef.current = particles

  const displayParticles = useMemo(() => {
    if (isResetting && resetProgress < 1) {
      return interpolateParticles(particles, initialParticles, resetProgress)
    }
    return particles
  }, [particles, initialParticles, isResetting, resetProgress])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={0.6}
        color="#fff5e6"
        castShadow
      />
      <directionalLight
        position={[-15, 20, -15]}
        intensity={0.3}
        color="#e6f0ff"
      />
      <MouseLight />

      <SandPoints particles={displayParticles} />
      <SparkPoints sparks={sparks} />
      <FlowLines lines={flowLines} />

      <InteractionHandler
        setParticles={setParticles}
        brushSize={brushSize}
        setSparks={setSparks}
        setFlowLines={setFlowLines}
        onFPSUpdate={onFPSUpdate}
        particlesRef={particlesRef}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={15}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
        enablePan
        mouseButtons={{
          LEFT: undefined,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
      />
    </>
  )
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas
      camera={{ position: [30, 35, 40], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#0a0a1a'), 1)
      }}
      dpr={[1, 2]}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
