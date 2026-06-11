import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { OutfitSelection, SelectedClothing } from '@/types'
import { getStyleById } from '@/data/wardrobe'

interface MannequinProps {
  outfit: OutfitSelection
  animatingItems: Set<string>
}

function MannequinBody() {
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f5e6d3',
        roughness: 0.8,
        metalness: 0.1
      }),
    []
  )

  return (
    <group>
      <mesh position={[0, 1.2, 0]} material={bodyMaterial} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 1.2, 32]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={bodyMaterial} castShadow>
        <cylinderGeometry args={[0.35, 0.32, 0.8, 32]} />
      </mesh>
      <mesh position={[0, -0.9, 0]} material={bodyMaterial} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 0.8, 32]} />
      </mesh>
      <mesh position={[-0.35, -0.9, 0]} material={bodyMaterial} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 0.8, 32]} />
      </mesh>
      <mesh position={[0.55, 0.8, 0]} rotation={[0, 0, -0.3]} material={bodyMaterial} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.9, 32]} />
      </mesh>
      <mesh position={[-0.55, 0.8, 0]} rotation={[0, 0, 0.3]} material={bodyMaterial} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.9, 32]} />
      </mesh>
      <mesh position={[0, 2.2, 0]} material={bodyMaterial} castShadow>
        <sphereGeometry args={[0.28, 32, 32]} />
      </mesh>
      <mesh position={[0, -1.4, 0.05]} material={bodyMaterial} castShadow>
        <boxGeometry args={[0.18, 0.2, 0.3]} />
      </mesh>
      <mesh position={[-0.35, -1.4, 0.05]} material={bodyMaterial} castShadow>
        <boxGeometry args={[0.18, 0.2, 0.3]} />
      </mesh>
    </group>
  )
}

interface ClothingMeshProps {
  selected: SelectedClothing | null
  category: string
  isAnimating: boolean
  onAnimationComplete: () => void
}

function ClothingMesh({ selected, category, isAnimating, onAnimationComplete }: ClothingMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [opacity, setOpacity] = useState(selected ? 1 : 0)
  const [currentColor, setCurrentColor] = useState(selected?.color || '#ffffff')
  const [prevSelected, setPrevSelected] = useState<SelectedClothing | null>(null)
  const [fadeDirection, setFadeDirection] = useState<'in' | 'out' | null>(null)

  const style = selected ? getStyleById(selected.styleId) : null

  useEffect(() => {
    if (selected && !prevSelected) {
      setFadeDirection('in')
      setOpacity(0)
      setCurrentColor(selected.color)
      const timer = setTimeout(() => {
        setOpacity(1)
        setFadeDirection(null)
        onAnimationComplete()
      }, 50)
      return () => clearTimeout(timer)
    } else if (!selected && prevSelected) {
      setFadeDirection('out')
      setOpacity(1)
      const timer = setTimeout(() => {
        setOpacity(0)
        setFadeDirection(null)
        onAnimationComplete()
      }, 200)
      return () => clearTimeout(timer)
    } else if (selected && prevSelected && selected.styleId !== prevSelected.styleId) {
      setFadeDirection('out')
      setOpacity(1)
      const timer1 = setTimeout(() => {
        setOpacity(0)
        setCurrentColor(selected.color)
        setFadeDirection('in')
        const timer2 = setTimeout(() => {
          setOpacity(1)
          setFadeDirection(null)
          onAnimationComplete()
        }, 50)
        return () => clearTimeout(timer2)
      }, 200)
      return () => clearTimeout(timer1)
    } else if (selected && prevSelected && selected.color !== prevSelected.color) {
      setCurrentColor(selected.color)
      onAnimationComplete()
    }
    setPrevSelected(selected)
  }, [selected, prevSelected, onAnimationComplete])

  useFrame((_, delta) => {
    if (meshRef.current && fadeDirection) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      if (fadeDirection === 'in') {
        material.opacity = Math.min(1, material.opacity + delta * 3)
      } else if (fadeDirection === 'out') {
        material.opacity = Math.max(0, material.opacity - delta * 5)
      }
    }
  })

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: currentColor,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: opacity
    })
    return mat
  }, [currentColor, opacity])

  useEffect(() => {
    material.color.set(currentColor)
  }, [currentColor, material])

  if (!style || !selected) {
    return <group ref={meshRef as any} />
  }

  const renderShape = () => {
    const y = style.yPosition
    const s = style.scale

    switch (style.shape) {
      case 'tshirt':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.02]} material={material} castShadow>
              <boxGeometry args={[0.9, 0.75, 0.08]} />
            </mesh>
            <mesh position={[0.45, -0.2, 0.02]} rotation={[0, 0, -0.15]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.6, 0.06]} />
            </mesh>
            <mesh position={[-0.45, -0.2, 0.02]} rotation={[0, 0, 0.15]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.6, 0.06]} />
            </mesh>
          </group>
        )
      case 'shirt':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.03]} material={material} castShadow>
              <boxGeometry args={[0.85, 0.8, 0.06]} />
            </mesh>
            <mesh position={[0.42, -0.25, 0.03]} rotation={[0, 0, -0.12]} material={material} castShadow>
              <boxGeometry args={[0.22, 0.7, 0.05]} />
            </mesh>
            <mesh position={[-0.42, -0.25, 0.03]} rotation={[0, 0, 0.12]} material={material} castShadow>
              <boxGeometry args={[0.22, 0.7, 0.05]} />
            </mesh>
            <mesh position={[0, 0.4, 0.05]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.15, 0.04]} />
            </mesh>
          </group>
        )
      case 'sweater':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.04]} material={material} castShadow>
              <boxGeometry args={[0.95, 0.85, 0.1]} />
            </mesh>
            <mesh position={[0.48, -0.25, 0.04]} rotation={[0, 0, -0.12]} material={material} castShadow>
              <cylinderGeometry args={[0.12, 0.1, 0.75, 16]} />
            </mesh>
            <mesh position={[-0.48, -0.25, 0.04]} rotation={[0, 0, 0.12]} material={material} castShadow>
              <cylinderGeometry args={[0.12, 0.1, 0.75, 16]} />
            </mesh>
            <mesh position={[0, 0.42, 0.06]} material={material} castShadow>
              <torusGeometry args={[0.15, 0.08, 8, 16, Math.PI]} />
            </mesh>
          </group>
        )
      case 'jacket':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, -0.05, 0.05]} material={material} castShadow>
              <boxGeometry args={[1, 0.95, 0.12]} />
            </mesh>
            <mesh position={[0.52, -0.3, 0.05]} rotation={[0, 0, -0.1]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.8, 0.08]} />
            </mesh>
            <mesh position={[-0.52, -0.3, 0.05]} rotation={[0, 0, 0.1]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.8, 0.08]} />
            </mesh>
            <mesh position={[0.12, -0.1, 0.11]} material={material} castShadow>
              <boxGeometry args={[0.06, 0.6, 0.02]} />
            </mesh>
            <mesh position={[-0.12, -0.1, 0.11]} material={material} castShadow>
              <boxGeometry args={[0.06, 0.6, 0.02]} />
            </mesh>
          </group>
        )
      case 'coat':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, -0.2, 0.06]} material={material} castShadow>
              <boxGeometry args={[1.05, 1.5, 0.14]} />
            </mesh>
            <mesh position={[0.55, -0.5, 0.06]} rotation={[0, 0, -0.08]} material={material} castShadow>
              <boxGeometry args={[0.28, 1.0, 0.1]} />
            </mesh>
            <mesh position={[-0.55, -0.5, 0.06]} rotation={[0, 0, 0.08]} material={material} castShadow>
              <boxGeometry args={[0.28, 1.0, 0.1]} />
            </mesh>
            <mesh position={[0, 0.5, 0.08]} material={material} castShadow>
              <boxGeometry args={[1.1, 0.2, 0.08]} />
            </mesh>
          </group>
        )
      case 'pants':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.12, -0.3, 0.02]} material={material} castShadow>
              <boxGeometry args={[0.28, 0.8, 0.08]} />
            </mesh>
            <mesh position={[-0.12, -0.3, 0.02]} material={material} castShadow>
              <boxGeometry args={[0.28, 0.8, 0.08]} />
            </mesh>
            <mesh position={[0, 0.15, 0.02]} material={material} castShadow>
              <boxGeometry args={[0.6, 0.2, 0.08]} />
            </mesh>
          </group>
        )
      case 'skirt':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, -0.1, 0.02]} material={material} castShadow>
              <cylinderGeometry args={[0.2, 0.35, 0.5, 32]} />
            </mesh>
          </group>
        )
      case 'shorts':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.12, -0.1, 0.02]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.4, 0.08]} />
            </mesh>
            <mesh position={[-0.12, -0.1, 0.02]} material={material} castShadow>
              <boxGeometry args={[0.25, 0.4, 0.08]} />
            </mesh>
            <mesh position={[0, 0.12, 0.02]} material={material} castShadow>
              <boxGeometry args={[0.55, 0.15, 0.08]} />
            </mesh>
          </group>
        )
      case 'sneakers':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.18, 0, 0.08]} material={material} castShadow>
              <boxGeometry args={[0.2, 0.12, 0.32]} />
            </mesh>
            <mesh position={[-0.18, 0, 0.08]} material={material} castShadow>
              <boxGeometry args={[0.2, 0.12, 0.32]} />
            </mesh>
            <mesh position={[0.18, -0.08, 0.08]} material={new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })} castShadow>
              <boxGeometry args={[0.22, 0.06, 0.34]} />
            </mesh>
            <mesh position={[-0.18, -0.08, 0.08]} material={new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })} castShadow>
              <boxGeometry args={[0.22, 0.06, 0.34]} />
            </mesh>
          </group>
        )
      case 'boots':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.18, 0.1, 0.08]} material={material} castShadow>
              <boxGeometry args={[0.18, 0.35, 0.28]} />
            </mesh>
            <mesh position={[-0.18, 0.1, 0.08]} material={material} castShadow>
              <boxGeometry args={[0.18, 0.35, 0.28]} />
            </mesh>
            <mesh position={[0.18, -0.12, 0.08]} material={new THREE.MeshStandardMaterial({ color: '#2d2d2d', roughness: 0.7 })} castShadow>
              <boxGeometry args={[0.2, 0.08, 0.3]} />
            </mesh>
            <mesh position={[-0.18, -0.12, 0.08]} material={new THREE.MeshStandardMaterial({ color: '#2d2d2d', roughness: 0.7 })} castShadow>
              <boxGeometry args={[0.2, 0.08, 0.3]} />
            </mesh>
          </group>
        )
      case 'heels':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.18, 0.02, 0.1]} material={material} castShadow>
              <boxGeometry args={[0.15, 0.08, 0.25]} />
            </mesh>
            <mesh position={[-0.18, 0.02, 0.1]} material={material} castShadow>
              <boxGeometry args={[0.15, 0.08, 0.25]} />
            </mesh>
            <mesh position={[0.18, -0.06, 0.18]} material={material} castShadow>
              <boxGeometry args={[0.08, 0.18, 0.06]} />
            </mesh>
            <mesh position={[-0.18, -0.06, 0.18]} material={material} castShadow>
              <boxGeometry args={[0.08, 0.18, 0.06]} />
            </mesh>
          </group>
        )
      case 'loafers':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0.18, -0.02, 0.08]} material={material} castShadow>
              <boxGeometry args={[0.18, 0.08, 0.3]} />
            </mesh>
            <mesh position={[-0.18, -0.02, 0.08]} material={material} castShadow>
              <boxGeometry args={[0.18, 0.08, 0.3]} />
            </mesh>
            <mesh position={[0.18, 0.02, 0.15]} material={material} castShadow>
              <boxGeometry args={[0.14, 0.04, 0.12]} />
            </mesh>
            <mesh position={[-0.18, 0.02, 0.15]} material={material} castShadow>
              <boxGeometry args={[0.14, 0.04, 0.12]} />
            </mesh>
          </group>
        )
      case 'hat':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0]} material={material} castShadow>
              <cylinderGeometry args={[0.25, 0.25, 0.15, 32]} />
            </mesh>
            <mesh position={[0, -0.05, 0]} material={material} castShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.03, 32]} />
            </mesh>
          </group>
        )
      case 'bag':
        return (
          <group position={[0.55, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.1]} material={material} castShadow>
              <boxGeometry args={[0.3, 0.25, 0.12]} />
            </mesh>
            <mesh position={[0, 0.18, 0.1]} material={material} castShadow>
              <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} />
            </mesh>
          </group>
        )
      case 'necklace':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.22]} material={material} castShadow>
              <torusGeometry args={[0.18, 0.015, 8, 32, Math.PI]} />
            </mesh>
            <mesh position={[0, -0.15, 0.25]} material={material} castShadow>
              <sphereGeometry args={[0.04, 16, 16]} />
            </mesh>
          </group>
        )
      case 'bracelet':
        return (
          <group position={[0.65, y, 0]} scale={s}>
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0.3]} material={material} castShadow>
              <torusGeometry args={[0.07, 0.015, 8, 32]} />
            </mesh>
          </group>
        )
      case 'scarf':
        return (
          <group position={[0, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.15]} material={material} castShadow>
              <boxGeometry args={[0.45, 0.3, 0.04]} />
            </mesh>
            <mesh position={[0.15, -0.2, 0.12]} rotation={[0, 0, 0.2]} material={material} castShadow>
              <boxGeometry args={[0.12, 0.35, 0.03]} />
            </mesh>
          </group>
        )
      default:
        return null
    }
  }

  return <group ref={meshRef as any}>{renderShape()}</group>
}

function Scene({ outfit, animatingItems }: MannequinProps) {
  const [animating, setAnimating] = useState<Set<string>>(new Set())

  const handleAnimationComplete = (category: string) => {
    setAnimating((prev) => {
      const next = new Set(prev)
      next.delete(category)
      return next
    })
    animatingItems.delete(category)
  }

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
        <ClothingMesh
          selected={outfit.top}
          category="top"
          isAnimating={animating.has('top')}
          onAnimationComplete={() => handleAnimationComplete('top')}
        />
        <ClothingMesh
          selected={outfit.bottom}
          category="bottom"
          isAnimating={animating.has('bottom')}
          onAnimationComplete={() => handleAnimationComplete('bottom')}
        />
        <ClothingMesh
          selected={outfit.shoes}
          category="shoes"
          isAnimating={animating.has('shoes')}
          onAnimationComplete={() => handleAnimationComplete('shoes')}
        />
        <ClothingMesh
          selected={outfit.accessory}
          category="accessory"
          isAnimating={animating.has('accessory')}
          onAnimationComplete={() => handleAnimationComplete('accessory')}
        />
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
  const animatingItems = useRef<Set<string>>(new Set())

  useEffect(() => {
    let lastTime = performance.now()
    let frameCount = 0

    const checkFps = () => {
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        const fps = frameCount * 1000 / (now - lastTime)
        if (fps < 28) {
          console.warn(`Low FPS detected: ${fps.toFixed(1)}`)
        }
        frameCount = 0
        lastTime = now
      }
      requestAnimationFrame(checkFps)
    }

    const id = requestAnimationFrame(checkFps)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="model-container w-full h-full rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5da 100%)' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Scene outfit={outfit} animatingItems={animatingItems.current} />
      </Canvas>
    </div>
  )
}
