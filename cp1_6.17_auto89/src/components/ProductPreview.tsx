import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore, MATERIAL_CONFIG, AccessoryType, ProductType } from '@/store'

function ProductPreview() {
  const [fadeKey, setFadeKey] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const currentType = useConfigStore((s) => s.selectedType)
  const controlsRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsFading(true)
    const timer = setTimeout(() => {
      setFadeKey((k) => k + 1)
      setIsFading(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [currentType])

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const handleScreenshot = async () => {
    if (!containerRef.current) return

    const canvas = containerRef.current.querySelector('canvas')
    if (!canvas) return

    const configJSON = useConfigStore.getState().getConfigJSON()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    const dataURL = canvas.toDataURL('image/png')
    const linkImg = document.createElement('a')
    linkImg.download = `handcraft-preview-${timestamp}.png`
    linkImg.href = dataURL
    linkImg.click()

    const blob = new Blob([configJSON], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const linkJson = document.createElement('a')
    linkJson.download = `handcraft-config-${timestamp}.json`
    linkJson.href = url
    linkJson.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="preview-container" ref={containerRef}>
      <button className="action-btn screenshot" onClick={handleScreenshot}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4a1 1 0 0 1 1-1h1.2l.8-1h4l.8 1H13a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm6 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
        </svg>
        截图保存
      </button>

      <Canvas
        className="preview-canvas"
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#FFFFFF']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, -5, 5]} intensity={0.3} />

        <ProductModel key={fadeKey} isFading={isFading} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={10}
        />
        <Environment preset="studio" />
      </Canvas>

      <div className="preview-controls">
        <button className="action-btn" onClick={handleResetView}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 2 8v1a.5.5 0 0 0 1 0V7H1.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-1 0V8A5 5 0 0 1 8 3z" />
          </svg>
          重置视角
        </button>
        <button className="action-btn" onClick={handleScreenshot}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4a1 1 0 0 1 1-1h1.2l.8-1h4l.8 1H13a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm6 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
          </svg>
          截图保存
        </button>
      </div>
    </div>
  )
}

function ProductModel({ isFading }: { isFading: boolean }) {
  const selectedType = useConfigStore((s) => s.selectedType)
  const material = useConfigStore((s) => s.material)
  const color = useConfigStore((s) => s.color)
  const accessories = useConfigStore((s) => s.accessories)
  const groupRef = useRef<THREE.Group>(null)

  const materialConfig = MATERIAL_CONFIG[material]

  const productMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
      transparent: true,
      opacity: isFading ? 0.3 : 1,
    })
  }, [color, material, isFading, materialConfig])

  useFrame((_, delta) => {
    if (groupRef.current) {
      const currentOpacity = productMaterial.opacity
      const targetOpacity = isFading ? 0.3 : 1
      productMaterial.opacity = THREE.MathUtils.lerp(currentOpacity, targetOpacity, delta * 10)
    }
  })

  return (
    <group ref={groupRef}>
      <BaseMesh type={selectedType} material={productMaterial} />
      {accessories.map((acc) => (
        <AccessoryMesh key={acc} type={acc} productType={selectedType} />
      ))}
    </group>
  )
}

function BaseMesh({
  type,
  material,
}: {
  type: ProductType
  material: THREE.Material
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  if (type === 'bracelet') {
    return (
      <mesh ref={meshRef} material={material} rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[1.3, 0.25, 32, 64]} />
      </mesh>
    )
  }

  if (type === 'necklace') {
    return (
      <group>
        <mesh material={material} rotation={[Math.PI / 8, 0, 0]}>
          <torusGeometry args={[1.8, 0.06, 16, 80]} />
        </mesh>
        <mesh position={[0, -1.5, 0]} material={material}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      <mesh material={material}>
        <octahedronGeometry args={[0.9, 0]} />
      </mesh>
      <mesh position={[0, 1.1, 0]} material={material}>
        <torusGeometry args={[0.15, 0.04, 12, 24]} />
      </mesh>
    </group>
  )
}

function AccessoryMesh({
  type,
  productType,
}: {
  type: AccessoryType
  productType: ProductType
}) {
  const meshRef = useRef<THREE.Group>(null)
  const [appearProgress, setAppearProgress] = useState(0)

  useEffect(() => {
    setAppearProgress(0)
    let frameId: number
    const startTime = performance.now()
    const duration = 400

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setAppearProgress(easeOut)
      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [type, productType])

  const position = useMemo(() => {
    const base = getAccessoryPosition(type, productType)
    const startOffset = new THREE.Vector3(5, 3, 5)
    return new THREE.Vector3().lerpVectors(startOffset, base, appearProgress)
  }, [type, productType, appearProgress])

  const heartGeometry = useMemo(() => createHeartGeometry(0.3), [])

  const scale = appearProgress
  const opacity = appearProgress

  if (type === 'bead') {
    return (
      <group ref={meshRef} position={position} scale={scale}>
        <mesh>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshStandardMaterial
            color="#E8B4B8"
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0.35, 0, 0]}>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial
            color="#4A90D9"
            roughness={0.4}
            metalness={0.1}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[-0.35, 0, 0]}>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial
            color="#5B8A5B"
            roughness={0.4}
            metalness={0.1}
            transparent
            opacity={opacity}
          />
        </mesh>
      </group>
    )
  }

  if (type === 'charm') {
    return (
      <group ref={meshRef} position={position} scale={scale}>
        <mesh geometry={heartGeometry}>
          <meshStandardMaterial
            color="#E8877E"
            roughness={0.5}
            metalness={0.2}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <torusGeometry args={[0.06, 0.02, 12, 20]} />
          <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} transparent opacity={opacity} />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={meshRef} position={position} scale={scale} rotation={[0, 0, Math.PI / 4]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.2, 12]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.15} transparent opacity={opacity} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.12, 0.04, 12, 24, Math.PI * 1.5]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.15} transparent opacity={opacity} />
      </mesh>
    </group>
  )
}

function createHeartGeometry(size: number): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const x = 0, y = 0

  shape.moveTo(x, y + size * 0.5)
  shape.bezierCurveTo(x, y + size * 0.5, x - size * 0.5, y, x - size * 0.5, y - size * 0.25)
  shape.bezierCurveTo(x - size * 0.5, y - size * 0.55, x - size * 0.25, y - size * 0.75, x, y - size * 0.5)
  shape.bezierCurveTo(x + size * 0.25, y - size * 0.75, x + size * 0.5, y - size * 0.55, x + size * 0.5, y - size * 0.25)
  shape.bezierCurveTo(x + size * 0.5, y, x, y + size * 0.5, x, y + size * 0.5)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: size * 0.3,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: size * 0.05,
    bevelThickness: size * 0.05,
  })
  geometry.center()
  return geometry
}

function getAccessoryPosition(type: AccessoryType, productType: ProductType): THREE.Vector3 {
  switch (productType) {
    case 'bracelet':
      if (type === 'bead') return new THREE.Vector3(0, -0.3, 1.3)
      if (type === 'charm') return new THREE.Vector3(0, -0.8, 1.1)
      return new THREE.Vector3(0.9, 0.2, 0.9)
    case 'necklace':
      if (type === 'bead') return new THREE.Vector3(0, -0.5, 1.6)
      if (type === 'charm') return new THREE.Vector3(0, -2.1, 0.2)
      return new THREE.Vector3(1.3, 0.8, 1.3)
    case 'pendant':
      if (type === 'bead') return new THREE.Vector3(0.6, 0.3, 0.3)
      if (type === 'charm') return new THREE.Vector3(-0.5, -0.5, 0.3)
      return new THREE.Vector3(0, 1.35, 0)
    default:
      return new THREE.Vector3(0, 0, 0)
  }
}

export default ProductPreview
