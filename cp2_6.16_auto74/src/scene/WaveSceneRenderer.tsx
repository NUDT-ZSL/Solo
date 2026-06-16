import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { ParticleState } from '../types'

const TERRAIN_SIZE = 36
const TERRAIN_SEGMENTS = 36
const TERRAIN_HEIGHT = 2

interface WaveSceneRendererProps {
  particles: ParticleState | null
  particleCount: number
}

function generateTerrainHeights(size: number, segments: number): Float32Array {
  const heights = new Float32Array((segments + 1) * (segments + 1))
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= segments; j++) {
      const idx = i * (segments + 1) + j
      heights[idx] = Math.random() * TERRAIN_HEIGHT
    }
  }
  return heights
}

function generateTerrainColors(heights: Float32Array): Float32Array {
  const colors = new Float32Array(heights.length * 3)
  const lowColor = new THREE.Color('#3d5a80')
  const highColor = new THREE.Color('#98c1d9')

  for (let i = 0; i < heights.length; i++) {
    const t = heights[i] / TERRAIN_HEIGHT
    const color = lowColor.clone().lerp(highColor, t)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  return colors
}

function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const lodRef = useRef<THREE.LOD>(null)

  const terrainData = useMemo(() => {
    const heights = generateTerrainHeights(TERRAIN_SIZE, TERRAIN_SEGMENTS)
    const colors = generateTerrainColors(heights)
    return { heights, colors }
  }, [])

  const createTerrainGeometry = (segments: number) => {
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const positions = geometry.attributes.position
    const stride = segments + 1
    const sourceStride = TERRAIN_SEGMENTS + 1
    const scale = TERRAIN_SEGMENTS / segments

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const idx = i * (segments + 1) + j
        const sourceI = Math.floor(i * scale)
        const sourceJ = Math.floor(j * scale)
        const sourceIdx = sourceI * sourceStride + sourceJ
        positions.setY(idx, terrainData.heights[sourceIdx])
      }
    }

    geometry.computeVertexNormals()
    geometry.setAttribute('color', new THREE.BufferAttribute(terrainData.colors.slice(0, (segments + 1) * (segments + 1) * 3), 3))

    return geometry
  }

  const lodLevels = useMemo(() => {
    return [
      { distance: 0, segments: TERRAIN_SEGMENTS },
      { distance: 30, segments: 18 },
      { distance: 50, segments: 9 },
    ]
  }, [])

  const lodMeshes = useMemo(() => {
    return lodLevels.map((level) => {
      const geometry = createTerrainGeometry(level.segments)
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        flatShading: true,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.receiveShadow = true
      return { mesh, distance: level.distance }
    })
  }, [lodLevels])

  useEffect(() => {
    if (lodRef.current) {
      lodMeshes.forEach(({ mesh, distance }) => {
        lodRef.current!.addLevel(mesh, distance)
      })
    }
    return () => {
      lodMeshes.forEach(({ mesh }) => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
    }
  }, [lodMeshes])

  return (
    <group>
      <lod ref={lodRef} />

      <gridHelper
        args={[TERRAIN_SIZE, 12, '#293241', '#293241']}
        position={[0, 0.01, 0]}
      >
        <meshBasicMaterial
          attach="material"
          color="#293241"
          transparent
          opacity={0.2}
        />
      </gridHelper>
    </group>
  )
}

function EarthquakeSource() {
  return (
    <mesh position={[0, 2, 0]}>
      <ellipsoidGeometry args={[1, 0.5, 0.75, 32, 16]} />
      <meshStandardMaterial
        color="#ffb703"
        transparent
        opacity={0.5}
        emissive="#ffb703"
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

interface WaveParticlesProps {
  particles: ParticleState | null
  particleCount: number
}

function WaveParticles({ particles, particleCount }: WaveParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)

  const initialGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const opacities = new Float32Array(particleCount)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 2
      positions[i * 3 + 2] = 0
      colors[i * 3] = 0
      colors[i * 3 + 1] = 0.2
      colors[i * 3 + 2] = 1.0
      opacities[i] = 0
      sizes[i] = 1.2 + Math.random() * 1.8
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    return geometry
  }, [])

  useEffect(() => {
    geometryRef.current = initialGeometry
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose()
      }
    }
  }, [initialGeometry])

  useFrame(() => {
    if (!pointsRef.current || !particles || !geometryRef.current) return

    const positionAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute
    const opacityAttr = geometryRef.current.getAttribute('opacity') as THREE.BufferAttribute
    const sizeAttr = geometryRef.current.getAttribute('size') as THREE.BufferAttribute

    const count = Math.min(particleCount, particles.position.length / 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positionAttr.setX(i, particles.position[i3])
      positionAttr.setY(i, particles.position[i3 + 1])
      positionAttr.setZ(i, particles.position[i3 + 2])

      colorAttr.setX(i, particles.color[i3])
      colorAttr.setY(i, particles.color[i3 + 1])
      colorAttr.setZ(i, particles.color[i3 + 2])

      opacityAttr.setX(i, particles.opacity[i])
      sizeAttr.setX(i, particles.size[i])
    }

    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    opacityAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={initialGeometry}>
      <shaderMaterial
        vertexShader={`
          attribute float size;
          attribute float opacity;
          varying vec3 vColor;
          varying float vOpacity;
          void main() {
            vColor = color;
            vOpacity = opacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vOpacity;
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            float alpha = (1.0 - dist * 2.0) * vOpacity;
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function SceneContent({ particles, particleCount }: WaveParticlesProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#98c1d9" />

      <Terrain />
      <EarthquakeSource />
      <WaveParticles particles={particles} particleCount={particleCount} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={60}
        maxPolarAngle={Math.PI * 0.47}
        minPolarAngle={0}
        enablePan={true}
        panSpeed={0.5}
      />
    </>
  )
}

export default function WaveSceneRenderer({ particles, particleCount }: WaveSceneRendererProps) {
  return (
    <Canvas
      camera={{ position: [