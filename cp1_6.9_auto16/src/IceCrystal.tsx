import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CrystalData {
  position: THREE.Vector3
  baseHeight: number
  segments: number
  rotation: number
  thickness: number
  currentHeight: number
  targetHeight: number
}

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: THREE.Color
  type: 'burst' | 'melt'
}

interface IceCrystalProps {
  temperature: number
}

const CRYSTAL_COUNT = 500
const MAX_PARTICLES = 500

export default function IceCrystal({ temperature }: IceCrystalProps) {
  const { camera, gl, scene } = useThree()
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const baseGlowRef = useRef<THREE.Points>(null)
  const particlesRef = useRef<Particle[]>([])
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [hoveredCrystals, setHoveredCrystals] = useState<Set<number>>(new Set())
  const lastHoverTime = useRef<Map<number, number>>(new Map())
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tempMatrix = useMemo(() => new THREE.Matrix4(), [])

  const crystals = useMemo<CrystalData[]>(() => {
    const arr: CrystalData[] = []
    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.sqrt(Math.random()) * 25
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const distance = 1 + Math.random() * 2
      arr.push({
        position: new THREE.Vector3(x, 0, z),
        baseHeight: 2 + Math.random() * 6,
        segments: 3 + Math.floor(Math.random() * 3),
        rotation: Math.random() * Math.PI * 2,
        thickness: 0.08 + Math.random() * 0.08,
        currentHeight: 0,
        targetHeight: 0,
      })
    }
    return arr
  }, [])

  const crystalGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1)
    const positions = geo.attributes.position
    const normals = geo.attributes.normal
    for (let i = 0; i < positions.count; i++) {
      const nx = (Math.random() - 0.5) * 0.1
      const ny = (Math.random() - 0.5) * 0.1
      const nz = (Math.random() - 0.5) * 0.1
      positions.setXYZ(
        i,
        positions.getX(i) + nx,
        positions.getY(i) + ny,
        positions.getZ(i) + nz
      )
      normals.setXYZ(
        i,
        normals.getX(i) + nx * 2,
        normals.getY(i) + ny * 2,
        normals.getZ(i) + nz * 2
      )
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.7,
      ior: 1.31,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      emissive: 0x113366,
      emissiveIntensity: 0.05,
    })
    return mat
  }, [])

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_PARTICLES * 3)
    const colors = new Float32Array(MAX_PARTICLES * 3)
    const sizes = new Float32Array(MAX_PARTICLES)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [])

  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [])

  const glowGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(CRYSTAL_COUNT * 3)
    const colors = new Float32Array(CRYSTAL_COUNT * 3)
    const sizes = new Float32Array(CRYSTAL_COUNT)
    crystals.forEach((c, i) => {
      positions[i * 3] = c.position.x
      positions[i * 3 + 1] = 0.02
      positions[i * 3 + 2] = c.position.z
      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
      sizes[i] = 3.0
    })
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [crystals])

  const glowMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        } catch (e) {}
      }
    }
    gl.domElement.addEventListener('mousemove', handleMouseMove)
    return () => gl.domElement.removeEventListener('mousemove', handleMouseMove)
  }, [gl])

  const playCrackSound = () => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    const duration = 0.1
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    const freq = 2000 + Math.random() * 1000
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * freq * i / ctx.sampleRate)
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 1500

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start()
  }

  const spawnBurstParticles = (position: THREE.Vector3, count: number) => {
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= MAX_PARTICLES) break
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 4
      particlesRef.current.push({
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.abs(Math.cos(phi)) * speed + 1,
          Math.sin(phi) * Math.sin(theta) * speed
        ),
        life: 0.8,
        maxLife: 0.8,
        size: 0.1 + Math.random() * 0.1,
        color: new THREE.Color(0xAADDFF),
        type: 'burst',
      })
    }
  }

  const spawnMeltParticle = (crystal: CrystalData) => {
    if (particlesRef.current.length >= MAX_PARTICLES) return
    particlesRef.current.push({
      position: new THREE.Vector3(
        crystal.position.x + (Math.random() - 0.5) * crystal.thickness * 2,
        crystal.currentHeight + Math.random() * 0.5,
        crystal.position.z + (Math.random() - 0.5) * crystal.thickness * 2
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        -1 - Math.random() * 1.5,
        (Math.random() - 0.5) * 0.5
      ),
      life: 1.5,
      maxLife: 1.5,
      size: 0.1 + Math.random() * 0.2,
      color: new THREE.Color(0xFFFFFF),
      type: 'melt',
    })
  }

  useFrame((state, delta) => {
    const mesh = instancedMeshRef.current
    if (!mesh) return

    const tempFactor = temperature < -20 ? 0 : temperature > 0 ? 1 : (temperature + 20) / 20
    const opacity = 0.9 - tempFactor * 0.5
    material.opacity = opacity
    material.transmission = 0.9 - tempFactor * 0.3

    const growthFactor = temperature >= 0
      ? 1 + (0 + 20) * 0.05
      : Math.max(0.2, 1 + (temperature + 20) * 0.05)

    const now = performance.now()
    const newHovered = new Set<number>()

    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const crystal = crystals[i]
      crystal.targetHeight = crystal.baseHeight * growthFactor

      if (temperature > 0 && crystal.currentHeight > 0.5) {
        crystal.currentHeight = Math.max(0.3, crystal.currentHeight - 0.02 * 60 * delta)
        if (Math.random() < 0.02) {
          spawnMeltParticle(crystal)
        }
      } else {
        const diff = crystal.targetHeight - crystal.currentHeight
        crystal.currentHeight += diff * Math.min(1, delta * 2)
      }

      const segHeight = crystal.currentHeight / crystal.segments

      for (let s = 0; s < crystal.segments; s++) {
        const instanceIdx = i * 4 + s
        if (instanceIdx >= CRYSTAL_COUNT * 4) continue

        const segT = (s + 1) / crystal.segments
        const segThickness = crystal.thickness * (1 - segT * 0.5)
        const y = s * segHeight + segHeight / 2

        dummy.position.set(crystal.position.x, y, crystal.position.z)
        dummy.rotation.set(0, crystal.rotation + s * 0.2, 0)
        dummy.scale.set(segThickness, segHeight * 0.98, segThickness)
        dummy.updateMatrix()
        mesh.setMatrixAt(instanceIdx, dummy.matrix)
      }

      const remainingIdx = CRYSTAL_COUNT * 3 + i
      dummy.position.set(crystal.position.x, -100, crystal.position.z)
      dummy.scale.setScalar(0)
      dummy.updateMatrix()
      mesh.setMatrixAt(remainingIdx, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true

    if (hoveredCrystals.size > 0 || true) {
      raycaster.current.setFromCamera(mouse.current, camera)
      const intersects = raycaster.current.intersectObject(mesh)
      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId
        if (instanceId !== undefined) {
          const crystalIdx = Math.floor(instanceId / 4)
          newHovered.add(crystalIdx)

          const lastTime = lastHoverTime.current.get(crystalIdx) || 0
          if (now - lastTime > 500) {
            lastHoverTime.current.set(crystalIdx, now)
            playCrackSound()
            const point = intersects[0].point
            spawnBurstParticles(point, 20 + Math.floor(Math.random() * 11))
          }
        }
      }
    }
    setHoveredCrystals(newHovered)

    const particles = particlesRef.current
    const posAttr = particleGeometry.attributes.position as THREE.BufferAttribute
    const colorAttr = particleGeometry.attributes.color as THREE.BufferAttribute
    const sizeAttr = particleGeometry.attributes.size as THREE.BufferAttribute

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life -= delta
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }
      if (p.type === 'burst') {
        p.velocity.y -= 5 * delta
      }
      p.position.addScaledVector(p.velocity, delta)
      p.velocity.multiplyScalar(1 - delta * 0.8)
    }

    const posArray = posAttr.array as Float32Array
    const colorArray = colorAttr.array as Float32Array
    const sizeArray = sizeAttr.array as Float32Array

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < particles.length) {
        const p = particles[i]
        const alpha = p.life / p.maxLife
        posArray[i * 3] = p.position.x
        posArray[i * 3 + 1] = p.position.y
        posArray[i * 3 + 2] = p.position.z
        colorArray[i * 3] = p.color.r * alpha
        colorArray[i * 3 + 1] = p.color.g * alpha
        colorArray[i * 3 + 2] = p.color.b * alpha
        sizeArray[i] = p.size * (p.type === 'burst' ? (0.5 + alpha * 0.5) : alpha)
      } else {
        posArray[i * 3 + 1] = -1000
        sizeArray[i] = 0
      }
    }
    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    particleGeometry.setDrawRange(0, Math.min(particles.length, MAX_PARTICLES))

    if (baseGlowRef.current) {
      const glowTime = state.clock.elapsedTime
      const glowColors = glowGeometry.attributes.color as THREE.BufferAttribute
      const glowSizes = glowGeometry.attributes.size as THREE.BufferAttribute
      const gColorArr = glowColors.array as Float32Array
      const gSizeArr = glowSizes.array as Float32Array
      for (let i = 0; i < CRYSTAL_COUNT; i++) {
        const pulse = 0.85 + Math.sin(glowTime * 2 + i * 0.3) * 0.15
        const tempPulse = 0.3 + pulse * 0.3
        gColorArr[i * 3] = tempPulse
        gColorArr[i * 3 + 1] = tempPulse * 1.05
        gColorArr[i * 3 + 2] = tempPulse * 1.2
        gSizeArr[i] = 1.5 * (0.8 + pulse * 0.4)
      }
      glowColors.needsUpdate = true
      glowSizes.needsUpdate = true
    }
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[28, 64]} />
        <meshPhysicalMaterial
          color={0x0A1628}
          roughness={0.05}
          metalness={0.4}
          transparent
          opacity={0.7}
          transmission={0.3}
        />
      </mesh>

      <gridHelper
        args={[56, 56, 0x88CCFF, 0x88CCFF]}
        position={[0, 0.001, 0]}
      >
        <meshBasicMaterial transparent opacity={0.2} color={0x88CCFF} wireframe />
      </gridHelper>

      <points ref={baseGlowRef} geometry={glowGeometry} material={glowMaterial} />

      <instancedMesh
        ref={instancedMeshRef}
        args={[crystalGeometry, material, CRYSTAL_COUNT * 4]}
        castShadow
        receiveShadow
      />

      <points ref={pointsRef} geometry={particleGeometry} material={particleMaterial} />
    </group>
  )
}
