import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useCityStore, getTemperatureColor, BlockData, GRID_SIZE_CONST } from './store'

const GRID_SIZE = GRID_SIZE_CONST
const CELL_SIZE = 1
const GRID_OFFSET = -(GRID_SIZE * CELL_SIZE) / 2 + CELL_SIZE / 2

interface BlockMeshProps {
  block: BlockData
  x: number
  z: number
  onClick: () => void
  isTransitioning: boolean
}

function BlockMesh({ block, x, z, onClick, isTransitioning }: BlockMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [displayY, setDisplayY] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [scaleY, setScaleY] = useState(0)
  const animRef = useRef(0)
  const prevTypeRef = useRef<typeof block.type>(null)
  const prevHeightRef = useRef(0)

  const color = block.type ? getTemperatureColor(block.temperature) : '#888888'
  const baseColor = block.type === 'building' ? '#666666' : block.type === 'green' ? '#228B22' : '#0066CC'

  const worldX = x * CELL_SIZE + GRID_OFFSET
  const worldZ = z * CELL_SIZE + GRID_OFFSET

  useFrame((_, delta) => {
    if (!meshRef.current) return

    const targetY = block.height / 2
    const targetScaleY = block.type ? 1 : 0

    if (prevTypeRef.current !== block.type || prevHeightRef.current !== block.height) {
      animRef.current = 0
      prevTypeRef.current = block.type
      prevHeightRef.current = block.height
    }

    if (isTransitioning) {
      animRef.current = Math.min(1, animRef.current + delta * 2)
      const t = animRef.current
      const easeOut = 1 - Math.pow(1 - t, 3)
      setOpacity(easeOut)
    } else {
      if (animRef.current < 1) {
        animRef.current = Math.min(1, animRef.current + delta * 5)
        const t = animRef.current
        const easeOut = 1 - Math.pow(1 - t, 3)
        const bounce = 1 + Math.sin(easeOut * Math.PI) * 0.15
        setDisplayY(targetY * easeOut * bounce)
        setScaleY(targetScaleY * easeOut * bounce)
      }
      setOpacity(1)
    }

    if (meshRef.current) {
      meshRef.current.position.y = displayY
      meshRef.current.scale.y = scaleY
    }
  })

  if (block.type === null) return null

  const showTemperature = block.temperature > 0

  return (
    <group position={[worldX, 0, worldZ]}>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
        castShadow
        receiveShadow
      >
        {block.type === 'building' ? (
          <boxGeometry args={[CELL_SIZE * 0.9, block.height, CELL_SIZE * 0.9]} />
        ) : (
          <boxGeometry args={[CELL_SIZE * 0.95, 0.3, CELL_SIZE * 0.95]} />
        )}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={block.type === 'water' ? 0.4 * opacity : opacity}
        />
      </mesh>

      {showTemperature && (
        <Html
          position={[0, block.height + 0.5, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              fontSize: '12px',
              color: 'white',
              backgroundColor: 'rgba(51, 51, 51, 0.7)',
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              opacity,
              transition: 'opacity 0.3s ease'
            }}
          >
            {block.temperature.toFixed(1)}°C
          </div>
        </Html>
      )}
    </group>
  )
}

function GridPlane() {
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = []
    const fullSize = GRID_SIZE * CELL_SIZE
    const half = fullSize / 2

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE - half
      lines.push(
        <line key={`v-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([pos, 0.01, -half, pos, 0.01, half])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#B0B0B0" linewidth={1} />
        </line>
      )
      lines.push(
        <line key={`h-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-half, 0.01, pos, half, 0.01, pos])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#B0B0B0" linewidth={1} />
        </line>
      )
    }
    return lines
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial color="#E8DCC6" />
      </mesh>
      {gridLines}
    </group>
  )
}

function TemperatureColorBar() {
  return (
    <Html position={[GRID_SIZE * CELL_SIZE / 2 + 2, 5, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>温度 (°C)</div>
        <div style={{
          width: '20px',
          height: '160px',
          background: 'linear-gradient(to top, #0000FF 0%, #00FFFF 25%, #FFFF00 50%, #FF8800 75%, #FF0000 100%)',
          borderRadius: '4px'
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#666', gap: '40px' }}>
          <span>45</span>
          <span>32</span>
          <span>18</span>
        </div>
      </div>
    </Html>
  )
}

function SceneContent() {
  const { grid, toggleBlock, isTransitioning } = useCityStore()

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <GridPlane />
      <TemperatureColorBar />
      {grid.map((row, x) =>
        row.map((block, z) => (
          <BlockMesh
            key={`${x}-${z}-${block.key}`}
            block={block}
            x={x}
            z={z}
            onClick={() => toggleBlock(x, z)}
            isTransitioning={isTransitioning}
          />
        ))
      )}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={50}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  )
}

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [15, 20, 15], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#f5f1e8']} />
      <fog attach="fog" args={['#f5f1e8', 30, 80]} />
      <SceneContent />
    </Canvas>
  )
}
