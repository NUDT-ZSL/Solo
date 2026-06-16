import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { ParticleState } from '../types'

interface WaveSceneRendererProps {
  particleState: ParticleState | null
  particleCount: number
}

function createTerrainGeometry(segments: number) {
  const size = 36
  const geo = new THREE.PlaneGeometry(size, size, segments - 1, segments - 1)
  geo.rotateX(-Math.PI / 2)

  const positions = geo.attributes.position
  const colorArray = new Float32Array(positions.count * 3)

  const colorLow = new THREE.Color('#3d5a80')
  const colorHigh = new THREE.Color('#98c1d9')

  for (let i = 0; i < positions.count; i++) {
    const height = Math.random() * 2
    positions.setY(i, height)

    const t = height / 2
    const color = colorLow.clone().lerp(colorHigh, t)
    colorArray[i * 3] = color.r
    colorArray[i * 3 + 1] = color.g
    colorArray[i * 3 + 2] = color.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
  geo.computeVertexNormals()

  return geo
}

function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireframeRef = useRef<THREE.LineSegments>(null)

  const { geometry, wireframeGeometry } = useMemo(() => {
    const geo = createTerrainGeometry(36)
    const wireGeo = new THREE.WireframeGeometry(geo)
    return { geometry: geo, wireframeGeometry: wireGeo }
  }, [])

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <lineSegments ref={wireframeRef} geometry={wireframeGeometry}>
        <lineBasicMaterial color="#293241" transparent opacity={0.2} />
      </lineSegments>
    </group>
  )
}

function EarthquakeSource() {
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(1, 32, 32)
  }, [])

  return (
    <mesh position={[0, 2, 0]} geometry={geometry} scale={[2, 1.5, 1]}>
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

interface ParticleSystemProps {
  particleState: ParticleState | null
  particleCount: number
}

function ParticleSystem({ particleState, particleCount }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)

  const initialGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(2800 * 3)
    const colors = new Float32Array(2800 * 3)
    const opacities = new Float32Array(2800)
    const sizes = new Float32Array(2800)

    for (let i = 0; i < 2800; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 2
      positions[i * 3 + 2] = 0
      colors[i * 3] = 0
      colors[i * 3 + 1] = 0.2
      colors[i * 3 + 2] = 1
      opacities[i] = 0
      sizes[i] = 1.2 + Math.random() * 1.8
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    return geo
  }, [])

  useEffect(() => {
    if (pointsRef.current) {
      geometryRef.current = pointsRef.current.geometry as THREE.BufferGeometry
    }
  }, [])

  useFrame(() => {
    if (!particleState || !geometryRef.current) return

    const posAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute
    const opacityAttr = geometryRef.current.getAttribute('opacity') as THREE.BufferAttribute
    const sizeAttr = geometryRef.current.getAttribute('size') as THREE.BufferAttribute

    const posArray = posAttr.array as Float32Array
    const colorArray = colorAttr.array as Float32Array
    const opacityArray = opacityAttr.array as Float32Array
    const sizeArray = sizeAttr.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] = particleState.position[i * 3]
      posArray[i * 3 + 1] = particleState.position[i * 3 + 1]
      posArray[i * 3 + 2] = particleState.position[i * 3 + 2]

      colorArray[i * 3] = particleState.color[i * 3]
      colorArray[i * 3 + 1] = particleState.color[i * 3 + 1]
      colorArray[i * 3 + 2] = particleState.color[i * 3 + 2]

      opacityArray[i] = particleState.opacity[i]
      sizeArray[i] = particleState.size[i]
    }

    for (let i = particleCount; i < 2800; i++) {
      opacityArray[i] = 0
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    opacityAttr.needsUpdate = true
    sizeAttr.needsUpdate = true

    geometryRef.current.setDrawRange(0, particleCount)
  })

  return (
    <points ref={pointsRef} geometry={initialGeometry}>
      <pointsMaterial
        vertexColors
        transparent
        size={2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function CameraController() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 15, 25)
    camera.lookAt(0, 2, 0)
  }, [camera])

  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={60}
      minPolarAngle={0}
      maxPolarAngle={Math.PI * 85 / 180}
      enablePan={true}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
    />
  )
}

function SceneContent({ particleState, particleCount }: WaveSceneRendererProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      <fog attach="fog" args={['#0a0e27', 30, 80]} />

      <Terrain />

      <EarthquakeSource />
      <ParticleSystem particleState={particleState} particleCount={particleCount} />

      <CameraController />
    </>
  )
}

export function WaveSceneRenderer({ particleState, particleCount }: WaveSceneRendererProps) {
  return (
    <Canvas
      camera={{ position: [0, 15, 25], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0e27' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0e27')
      }}
    >
      <SceneContent
        particleState={particleState}
        particleCount={particleCount}
      />
    </Canvas>
  )
}
