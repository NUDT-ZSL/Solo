import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { OutfitSelection, SelectedClothing } from '@/types'
import { getStyleById } from '@/data/wardrobe'

const COLOR_LERP_SPEED = 2.0
const FADE_IN_SPEED = 3.0
const FADE_OUT_SPEED = 5.0

function MannequinBody() {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5e6d3', roughness: 0.85, metalness: 0.05 }), [])

  return (
    <group>
      <mesh position={[0, 1.15, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.28, 0.33, 1.1, 24]} />
      </mesh>
      <mesh position={[0, 0.15, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.32, 0.3, 0.7, 24]} />
      </mesh>
      <mesh position={[0.18, -0.85, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.85, 16]} />
      </mesh>
      <mesh position={[-0.18, -0.85, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.85, 16]} />
      </mesh>
      <mesh position={[0.42, 0.7, 0]} rotation={[0, 0, -0.2]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.7, 12]} />
      </mesh>
      <mesh position={[-0.42, 0.7, 0]} rotation={[0, 0, 0.2]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.7, 12]} />
      </mesh>
      <mesh position={[0, 1.95, 0]} material={bodyMat} castShadow>
        <sphereGeometry args={[0.22, 24, 24]} />
      </mesh>
      <mesh position={[0.1, -1.4, 0.03]} material={bodyMat} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
      </mesh>
      <mesh position={[-0.1, -1.4, 0.03]} material={bodyMat} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
      </mesh>
    </group>
  )
}

interface ClothingMeshProps {
  selected: SelectedClothing | null
  category: string
}

function ClothingMesh({ selected, category }: ClothingMeshProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const targetOpacity = useRef(selected ? 1 : 0)
  const targetColor = useRef(new THREE.Color(selected?.color || '#ffffff'))
  const currentOpacity = useRef(selected ? 1 : 0)
  const prevSelectedRef = useRef<SelectedClothing | null>(selected)
  const [visible, setVisible] = useState(!!selected)

  const style = selected ? getStyleById(selected.styleId) : null

  useEffect(() => {
    const prev = prevSelectedRef.current
    if (selected && !prev) {
      setVisible(true)
      currentOpacity.current = 0
      targetOpacity.current = 1
      targetColor.current.set(selected.color)
    } else if (!selected && prev) {
      targetOpacity.current = 0
    } else if (selected && prev && selected.styleId !== prev.styleId) {
      targetOpacity.current = 0
      const timer = setTimeout(() => {
        targetColor.current.set(selected.color)
        targetOpacity.current = 1
        setVisible(true)
      }, 250)
      return () => clearTimeout(timer)
    } else if (selected && prev && selected.color !== prev.color) {
      targetColor.current.set(selected.color)
    }
    prevSelectedRef.current = selected
  }, [selected])

  useFrame((_, delta) => {
    if (!matRef.current) return

    const diff = targetOpacity.current - currentOpacity.current
    if (Math.abs(diff) > 0.001) {
      const speed = diff > 0 ? FADE_IN_SPEED : FADE_OUT_SPEED
      currentOpacity.current += diff * Math.min(speed * delta, 1)
    } else {
      currentOpacity.current = targetOpacity.current
    }

    matRef.current.opacity = currentOpacity.current
    matRef.current.visible = currentOpacity.current > 0.01

    if (currentOpacity.current <= 0.01 && targetOpacity.current <= 0) {
      setVisible(false)
    }

    matRef.current.color.lerp(targetColor.current, Math.min(COLOR_LERP_SPEED * delta, 1))
  })

  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0.05 }), [])

  const renderShape = () => {
    if (!style) return null
    const y = style.yPosition
    const s = style.scale

    switch (style.shape) {
      case 'tshirt':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.03]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.32, 0.36, 0.65, 24]} />
            </mesh>
            <mesh position={[0, 0.33, 0.04]} material={matRef.current} castShadow>
              <torusGeometry args={[0.12, 0.03, 8, 24, Math.PI]} />
            </mesh>
            <mesh position={[0.38, 0.05, 0.02]} rotation={[0, 0, -0.3]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.08, 0.07, 0.45, 12]} />
            </mesh>
            <mesh position={[-0.38, 0.05, 0.02]} rotation={[0, 0, 0.3]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.08, 0.07, 0.45, 12]} />
            </mesh>
          </group>
        )
      case 'shirt':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.04]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.3, 0.35, 0.7, 24]} />
            </mesh>
            <mesh position={[0.4, 0, 0.03]} rotation={[0, 0, -0.25]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.07, 0.065, 0.55, 12]} />
            </mesh>
            <mesh position={[-0.4, 0, 0.03]} rotation={[0, 0, 0.25]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.07, 0.065, 0.55, 12]} />
            </mesh>
            <mesh position={[0.06, 0.35, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.04, 0.4, 0.02]} />
            </mesh>
            <mesh position={[-0.06, 0.35, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.04, 0.4, 0.02]} />
            </mesh>
            <mesh position={[0, 0.38, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.2, 0.08, 0.03]} />
            </mesh>
          </group>
        )
      case 'sweater':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.05]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.35, 0.38, 0.72, 24]} />
            </mesh>
            <mesh position={[0.42, -0.02, 0.04]} rotation={[0, 0, -0.25]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.09, 0.08, 0.6, 12]} />
            </mesh>
            <mesh position={[-0.42, -0.02, 0.04]} rotation={[0, 0, 0.25]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.09, 0.08, 0.6, 12]} />
            </mesh>
            <mesh position={[0, 0.36, 0.07]} material={matRef.current} castShadow>
              <torusGeometry args={[0.14, 0.04, 8, 24, Math.PI]} />
            </mesh>
            <mesh position={[0.42, -0.32, 0.04]} material={matRef.current} castShadow>
              <torusGeometry args={[0.07, 0.015, 8, 16]} />
            </mesh>
            <mesh position={[-0.42, -0.32, 0.04]} material={matRef.current} castShadow>
              <torusGeometry args={[0.07, 0.015, 8, 16]} />
            </mesh>
          </group>
        )
      case 'jacket':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.06, -0.02, 0.06]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.33, 0.37, 0.75, 24, 1, false, 0, Math.PI * 1.7]} />
            </mesh>
            <mesh position={[-0.06, -0.02, 0.06]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.33, 0.37, 0.75, 24, 1, false, Math.PI * 0.3, Math.PI * 1.7]} />
            </mesh>
            <mesh position={[0.44, -0.05, 0.04]} rotation={[0, 0, -0.2]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.085, 0.075, 0.6, 12]} />
            </mesh>
            <mesh position={[-0.44, -0.05, 0.04]} rotation={[0, 0, 0.2]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.085, 0.075, 0.6, 12]} />
            </mesh>
            <mesh position={[0.06, 0.3, 0.12]} material={matRef.current} castShadow>
              <boxGeometry args={[0.04, 0.5, 0.02]} />
            </mesh>
            <mesh position={[-0.06, 0.3, 0.12]} material={matRef.current} castShadow>
              <boxGeometry args={[0.04, 0.5, 0.02]} />
            </mesh>
            <mesh position={[0, 0.38, 0.09]} material={matRef.current} castShadow>
              <boxGeometry args={[0.28, 0.12, 0.04]} />
            </mesh>
          </group>
        )
      case 'coat':
        return (
          <group position={[0, y - 0.3, 0]} scale={s}>
            <mesh position={[0, 0, 0.07]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.34, 0.42, 1.6, 24]} />
            </mesh>
            <mesh position={[0.46, -0.1, 0.05]} rotation={[0, 0, -0.15]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.09, 0.08, 0.8, 12]} />
            </mesh>
            <mesh position={[-0.46, -0.1, 0.05]} rotation={[0, 0, 0.15]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.09, 0.08, 0.8, 12]} />
            </mesh>
            <mesh position={[0.08, 0.6, 0.14]} material={matRef.current} castShadow>
              <boxGeometry args={[0.04, 0.9, 0.02]} />
            </mesh>
            <mesh position={[-0.08, 0.6, 0.14]} material={matRef.current} castShadow>
              <boxGeometry args={[0.04, 0.9, 0.02]} />
            </mesh>
            <mesh position={[0, 0.8, 0.1]} material={matRef.current} castShadow>
              <boxGeometry args={[0.35, 0.15, 0.06]} />
            </mesh>
            <mesh position={[0, -0.7, 0.09]} material={matRef.current} castShadow>
              <torusGeometry args={[0.3, 0.02, 8, 24, Math.PI]} />
            </mesh>
          </group>
        )
      case 'pants':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0.12, 0.03]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.3, 0.32, 0.2, 24]} />
            </mesh>
            <mesh position={[0.12, -0.35, 0.02]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.13, 0.1, 0.8, 16]} />
            </mesh>
            <mesh position={[-0.12, -0.35, 0.02]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.13, 0.1, 0.8, 16]} />
            </mesh>
          </group>
        )
      case 'skirt':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.03]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.2, 0.38, 0.55, 32]} />
            </mesh>
            <mesh position={[0, 0.28, 0.04]} material={matRef.current} castShadow>
              <torusGeometry args={[0.2, 0.02, 8, 24]} />
            </mesh>
          </group>
        )
      case 'shorts':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0.12, 0.03]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.3, 0.32, 0.2, 24]} />
            </mesh>
            <mesh position={[0.12, -0.05, 0.02]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.13, 0.11, 0.35, 16]} />
            </mesh>
            <mesh position={[-0.12, -0.05, 0.02]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.13, 0.11, 0.35, 16]} />
            </mesh>
          </group>
        )
      case 'sneakers':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.12, 0.02, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.16, 0.1, 0.28]} />
            </mesh>
            <mesh position={[-0.12, 0.02, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.16, 0.1, 0.28]} />
            </mesh>
            <mesh position={[0.12, -0.05, 0.06]} material={accentMat} castShadow>
              <boxGeometry args={[0.18, 0.04, 0.3]} />
            </mesh>
            <mesh position={[-0.12, -0.05, 0.06]} material={accentMat} castShadow>
              <boxGeometry args={[0.18, 0.04, 0.3]} />
            </mesh>
            <mesh position={[0.12, 0.05, 0.18]} material={matRef.current} castShadow>
              <sphereGeometry args={[0.06, 12, 12]} />
            </mesh>
            <mesh position={[-0.12, 0.05, 0.18]} material={matRef.current} castShadow>
              <sphereGeometry args={[0.06, 12, 12]} />
            </mesh>
          </group>
        )
      case 'boots':
        return (
          <group position={[0, y + 0.05, 0]} scale={s}>
            <mesh position={[0.12, 0.12, 0.06]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.08, 0.09, 0.4, 12]} />
            </mesh>
            <mesh position={[-0.12, 0.12, 0.06]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.08, 0.09, 0.4, 12]} />
            </mesh>
            <mesh position={[0.12, -0.1, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.16, 0.06, 0.28]} />
            </mesh>
            <mesh position={[-0.12, -0.1, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.16, 0.06, 0.28]} />
            </mesh>
            <mesh position={[0.12, -0.14, 0.14]} material={matRef.current} castShadow>
              <boxGeometry args={[0.17, 0.04, 0.06]} />
            </mesh>
            <mesh position={[-0.12, -0.14, 0.14]} material={matRef.current} castShadow>
              <boxGeometry args={[0.17, 0.04, 0.06]} />
            </mesh>
          </group>
        )
      case 'heels':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.12, 0, 0.08]} material={matRef.current} castShadow>
              <boxGeometry args={[0.12, 0.06, 0.22]} />
            </mesh>
            <mesh position={[-0.12, 0, 0.08]} material={matRef.current} castShadow>
              <boxGeometry args={[0.12, 0.06, 0.22]} />
            </mesh>
            <mesh position={[0.12, 0.02, 0.16]} rotation={[-0.2, 0, 0]} material={matRef.current} castShadow>
              <boxGeometry args={[0.11, 0.04, 0.1]} />
            </mesh>
            <mesh position={[-0.12, 0.02, 0.16]} rotation={[-0.2, 0, 0]} material={matRef.current} castShadow>
              <boxGeometry args={[0.11, 0.04, 0.1]} />
            </mesh>
            <mesh position={[0.12, -0.08, 0.14]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
            </mesh>
            <mesh position={[-0.12, -0.08, 0.14]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
            </mesh>
          </group>
        )
      case 'loafers':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.12, -0.02, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.14, 0.07, 0.26]} />
            </mesh>
            <mesh position={[-0.12, -0.02, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.14, 0.07, 0.26]} />
            </mesh>
            <mesh position={[0.12, 0.01, 0.14]} material={matRef.current} castShadow>
              <boxGeometry args={[0.1, 0.03, 0.1]} />
            </mesh>
            <mesh position={[-0.12, 0.01, 0.14]} material={matRef.current} castShadow>
              <boxGeometry args={[0.1, 0.03, 0.1]} />
            </mesh>
            <mesh position={[0.12, -0.06, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.15, 0.03, 0.28]} />
            </mesh>
            <mesh position={[-0.12, -0.06, 0.06]} material={matRef.current} castShadow>
              <boxGeometry args={[0.15, 0.03, 0.28]} />
            </mesh>
          </group>
        )
      case 'hat':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.18, 24]} />
            </mesh>
            <mesh position={[0, -0.06, 0]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.35, 0.36, 0.04, 24]} />
            </mesh>
            <mesh position={[0, 0.09, 0]} material={matRef.current} castShadow>
              <sphereGeometry args={[0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
            </mesh>
          </group>
        )
      case 'bag':
        return (
          <group position={[0.5, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.08]} material={matRef.current} castShadow>
              <boxGeometry args={[0.26, 0.2, 0.1]} />
            </mesh>
            <mesh position={[0, 0.15, 0.08]} material={matRef.current} castShadow>
              <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
            </mesh>
            <mesh position={[0, 0.1, 0.13]} material={matRef.current} castShadow>
              <boxGeometry args={[0.08, 0.02, 0.02]} />
            </mesh>
          </group>
        )
      case 'necklace':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.2]} material={matRef.current} castShadow>
              <torusGeometry args={[0.16, 0.01, 8, 48, Math.PI]} />
            </mesh>
            <mesh position={[0, -0.14, 0.22]} material={matRef.current} castShadow>
              <octahedronGeometry args={[0.03, 0]} />
            </mesh>
            <mesh position={[0, -0.1, 0.21]} material={matRef.current} castShadow>
              <cylinderGeometry args={[0.003, 0.003, 0.06, 6]} />
            </mesh>
          </group>
        )
      case 'bracelet':
        return (
          <group position={[0.5, y, 0]} scale={s}>
            <mesh position={[0, 0, 0]} rotation={[0.3, 0, 0]} material={matRef.current} castShadow>
              <torusGeometry args={[0.06, 0.012, 8, 32]} />
            </mesh>
          </group>
        )
      case 'scarf':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.14]} material={matRef.current} castShadow>
              <torusGeometry args={[0.17, 0.04, 8, 24, Math.PI * 1.6]} />
            </mesh>
            <mesh position={[0.12, -0.15, 0.1]} rotation={[0.2, 0, 0.3]} material={matRef.current} castShadow>
              <boxGeometry args={[0.1, 0.3, 0.025]} />
            </mesh>
            <mesh position={[-0.1, -0.12, 0.08]} rotation={[0.15, 0, -0.2]} material={matRef.current} castShadow>
              <boxGeometry args={[0.1, 0.25, 0.025]} />
            </mesh>
          </group>
        )
      default:
        return null
    }
  }

  return (
    <group ref={groupRef} visible={visible || currentOpacity.current > 0.01}>
      <meshStandardMaterial
        ref={matRef}
        color={selected?.color || '#ffffff'}
        roughness={0.55}
        metalness={0.08}
        transparent
        opacity={currentOpacity.current}
        side={THREE.DoubleSide}
      />
      {renderShape()}
    </group>
  )
}

function Scene({ outfit }: { outfit: OutfitSelection }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={45} />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2 + 0.2}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={0.6}
      />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 3, 2]} intensity={0.5} />
      <directionalLight position={[0, -2, -3]} intensity={0.3} />
      <Environment preset="city" />
      <group>
        <MannequinBody />
        <ClothingMesh selected={outfit.top} category="top" />
        <ClothingMesh selected={outfit.bottom} category="bottom" />
        <ClothingMesh selected={outfit.shoes} category="shoes" />
        <ClothingMesh selected={outfit.accessory} category="accessory" />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} receiveShadow>
        <circleGeometry args={[2.5, 64]} />
        <meshStandardMaterial color="#e8e0d5" roughness={0.9} />
      </mesh>
    </>
  )
}

interface ModelViewerProps {
  outfit: OutfitSelection
}

export default function ModelViewer({ outfit }: ModelViewerProps) {
  return (
    <div className="model-container w-full h-full rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5da 100%)' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Scene outfit={outfit} />
      </Canvas>
    </div>
  )
}
