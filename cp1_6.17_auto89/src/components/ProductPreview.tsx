import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import JSZip from 'jszip'
import {
  useConfigStore,
  MATERIAL_CONFIG,
  AccessoryType,
  ProductType,
  MaterialType,
} from '@/store'
import {
  createBraceletBaseGeometry,
  getBraceletBeadPositions,
  createChainLinkGeometry,
  getNecklaceChainPositions,
  createPendantGeometry,
  getAccessoryMountPoints,
} from '@/utils/models'
import {
  createLeatherTexture,
  createLeatherBumpMap,
  createCordTexture,
  createCordBumpMap,
  createMetalEnvironmentMap,
} from '@/utils/textures'

function ProductPreview() {
  const [fadeKey, setFadeKey] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const currentType = useConfigStore((s) => s.selectedType)
  const controlsRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    const exportedConfig = useConfigStore.getState().getExportedConfig()
    const configJSON = JSON.stringify(exportedConfig, null, 2)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    const dataURL = canvas.toDataURL('image/png')
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '')

    const zip = new JSZip()
    zip.file(`handcraft-preview-${timestamp}.png`, base64Data, { base64: true })
    zip.file(`handcraft-config-${timestamp}.json`, configJSON)

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.download = `handcraft-customization-${timestamp}.zip`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleUploadConfig = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        const jsonFile = Object.values(zip.files).find((f) =>
          f.name.endsWith('.json')
        )
        if (jsonFile) {
          const jsonContent = await jsonFile.async('string')
          const config = JSON.parse(jsonContent)
          useConfigStore.getState().loadConfig(config)
        }
      } else if (file.name.endsWith('.json')) {
        const text = await file.text()
        const config = JSON.parse(text)
        useConfigStore.getState().loadConfig(config)
      }
    } catch (err) {
      console.error('Failed to load config:', err)
      alert('配置文件加载失败，请检查文件格式')
    }

    e.target.value = ''
  }

  return (
    <div className="preview-container" ref={containerRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 10, zIndex: 10 }}>
        <button className="action-btn" onClick={handleUploadConfig}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 11.5a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11a.5.5 0 0 0 .5.5zM.5 14a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 0-1H1a.5.5 0 0 0-.5.5z" />
          </svg>
          导入配置
        </button>
        <button className="action-btn" onClick={handleScreenshot}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4a1 1 0 0 1 1-1h1.2l.8-1h4l.8 1H13a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm6 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
          </svg>
          截图保存
        </button>
      </div>

      <Canvas
        className="preview-canvas"
        camera={{ position: [0, 0.5, 5], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#FFFFFF']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} castShadow />
        <directionalLight position={[-5, 3, 5]} intensity={0.4} />
        <directionalLight position={[0, -3, 3]} intensity={0.2} />

        <ProductModel key={fadeKey} isFading={isFading} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={10}
          target={[0, 0, 0]}
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
        <button className="action-btn" onClick={handleUploadConfig}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 11.5a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11a.5.5 0 0 0 .5.5zM.5 14a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 0-1H1a.5.5 0 0 0-.5.5z" />
          </svg>
          导入配置
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
  const materialType = useConfigStore((s) => s.material)
  const targetColor = useConfigStore((s) => s.color)
  const accessories = useConfigStore((s) => s.accessories)
  const accessoryStates = useConfigStore((s) => s.accessoryStates)
  const groupRef = useRef<THREE.Group>(null)

  const [currentColor, setCurrentColor] = useState(targetColor)
  const colorProgressRef = useRef(1)
  const startColorRef = useRef(new THREE.Color(targetColor))
  const endColorRef = useRef(new THREE.Color(targetColor))

  useEffect(() => {
    if (currentColor !== targetColor) {
      startColorRef.current = new THREE.Color(currentColor)
      endColorRef.current = new THREE.Color(targetColor)
      colorProgressRef.current = 0
    }
  }, [targetColor, currentColor])

  const envMap = useMemo(() => createMetalEnvironmentMap(), [])
  const materialConfig = MATERIAL_CONFIG[materialType]

  const { mapTexture, bumpMap } = useMemo(() => {
    const baseColor = currentColor
    if (materialType === 'leather') {
      return {
        mapTexture: createLeatherTexture(baseColor),
        bumpMap: createLeatherBumpMap(),
      }
    } else if (materialType === 'cord') {
      return {
        mapTexture: createCordTexture(baseColor),
        bumpMap: createCordBumpMap(),
      }
    }
    return { mapTexture: null, bumpMap: null }
  }, [materialType, currentColor])

  const productMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColor),
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
      transparent: true,
      opacity: isFading ? 0.3 : 1,
    })

    if (mapTexture) mat.map = mapTexture
    if (bumpMap) {
      mat.bumpMap = bumpMap
      mat.bumpScale = materialConfig.bumpScale
    }
    if (materialType === 'metal') {
      mat.envMap = envMap
      mat.envMapIntensity = 0.8
    }

    return mat
  }, [currentColor, materialType, isFading, materialConfig, mapTexture, bumpMap, envMap])

  const accessoryMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColor),
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
      transparent: true,
    })
  }, [currentColor, materialType, materialConfig])

  useFrame((_, delta) => {
    if (colorProgressRef.current < 1) {
      colorProgressRef.current = Math.min(colorProgressRef.current + delta / 0.3, 1)
      const t = colorProgressRef.current
      const eased = 1 - Math.pow(1 - t, 3)
      const interpolated = new THREE.Color().lerpColors(
        startColorRef.current,
        endColorRef.current,
        eased
      )
      const hexStr = '#' + interpolated.getHexString()
      setCurrentColor(hexStr.toUpperCase())

      productMaterial.color.copy(interpolated)
      accessoryMaterial.color.copy(interpolated)
      if (productMaterial.map) {
        productMaterial.map.dispose()
      }
    }

    if (groupRef.current) {
      const targetOpacity = isFading ? 0.3 : 1
      productMaterial.opacity = THREE.MathUtils.lerp(
        productMaterial.opacity,
        targetOpacity,
        delta * 10
      )
    }
  })

  return (
    <group ref={groupRef}>
      <BaseMesh
        type={selectedType}
        material={productMaterial}
        materialType={materialType}
      />
      {accessories.map((acc, idx) => (
        <AccessoryMesh
          key={`${acc}-${idx}`}
          type={acc}
          productType={selectedType}
          state={accessoryStates[acc]}
          index={idx}
          baseMaterial={accessoryMaterial}
        />
      ))}
    </group>
  )
}

function BaseMesh({
  type,
  material,
  materialType,
}: {
  type: ProductType
  material: THREE.Material
  materialType: MaterialType
}) {
  if (type === 'bracelet') {
    return <BraceletModel material={material} materialType={materialType} />
  }
  if (type === 'necklace') {
    return <NecklaceModel material={material} materialType={materialType} />
  }
  return <PendantModel material={material} materialType={materialType} />
}

function BraceletModel({
  material,
  materialType,
}: {
  material: THREE.Material
  materialType: MaterialType
}) {
  const baseGeometry = useMemo(() => createBraceletBaseGeometry(), [])
  const beadPositions = useMemo(() => getBraceletBeadPositions(22), [])

  const beadMaterial = useMemo(() => {
    const m = (material as THREE.MeshStandardMaterial).clone()
    m.roughness = 0.15
    m.metalness = 0.8
    m.color = new THREE.Color(materialType === 'metal' ? '#E8E8E8' : '#F0D9B5')
    return m
  }, [material, materialType])

  return (
    <group rotation={[Math.PI / 2.5, 0, 0]}>
      <mesh geometry={baseGeometry} material={material} />
      {beadPositions.map((pos, i) => (
        <mesh key={i} position={pos} material={beadMaterial}>
          <sphereGeometry args={[0.11, 24, 24]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 1.45]}>
        <torusGeometry args={[0.1, 0.025, 12, 24]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  )
}

function NecklaceModel({
  material,
  materialType,
}: {
  material: THREE.Material
  materialType: MaterialType
}) {
  const linkGeometry = useMemo(() => createChainLinkGeometry(), [])
  const linkData = useMemo(() => getNecklaceChainPositions(), [])

  const chainMaterial = useMemo(() => {
    if (materialType === 'metal') {
      const m = new THREE.MeshStandardMaterial({
        color: '#D0D0D0',
        metalness: 0.95,
        roughness: 0.12,
        envMap: (material as THREE.MeshStandardMaterial).envMap,
        envMapIntensity: 1.0,
      })
      return m
    }
    return material
  }, [material, materialType])

  return (
    <group>
      {linkData.map((link, i) => (
        <mesh
          key={i}
          geometry={linkGeometry}
          material={chainMaterial}
          position={link.position}
          rotation={link.rotation}
        />
      ))}
      <group position={[0, -2.0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial
            color={materialType === 'metal' ? '#B08050' : '#D4A574'}
            roughness={0.35}
            metalness={0.6}
          />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[0.06, 0.02, 10, 16]} />
          <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
    </group>
  )
}

function PendantModel({
  material,
  materialType,
}: {
  material: THREE.Material
  materialType: MaterialType
}) {
  const pendantGeometry = useMemo(() => createPendantGeometry(), [])

  const gemMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: (material as THREE.MeshStandardMaterial).color.clone(),
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
      envMap: (material as THREE.MeshStandardMaterial).envMap,
      envMapIntensity: 1.2,
    })
    return m
  }, [material])

  const settingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: materialType === 'metal' ? '#C0C0C0' : '#8B6914',
      roughness: 0.2,
      metalness: 0.9,
      envMap: (material as THREE.MeshStandardMaterial).envMap,
      envMapIntensity: 0.8,
    })
  }, [material, materialType])

  return (
    <group>
      <mesh geometry={pendantGeometry}>
        <meshStandardMaterial
          color={(material as THREE.MeshStandardMaterial).color}
          roughness={(material as THREE.MeshStandardMaterial).roughness}
          metalness={(material as THREE.MeshStandardMaterial).metalness}
          map={(material as THREE.MeshStandardMaterial).map}
          bumpMap={(material as THREE.MeshStandardMaterial).bumpMap}
          bumpScale={(material as THREE.MeshStandardMaterial).bumpScale}
          envMap={(material as THREE.MeshStandardMaterial).envMap}
          envMapIntensity={0.7}
        />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <torusGeometry args={[0.15, 0.04, 12, 24]} />
        {settingMaterial && <primitive object={settingMaterial} attach="material" />}
      </mesh>
      <mesh position={[0.45, 0.55, 0.15]}>
        <octahedronGeometry args={[0.07, 0]} />
        <primitive object={gemMaterial} attach="material" />
      </mesh>
      <mesh position={[-0.45, 0.55, 0.15]}>
        <octahedronGeometry args={[0.07, 0]} />
        <primitive object={gemMaterial} attach="material" />
      </mesh>
    </group>
  )
}

function AccessoryMesh({
  type,
  productType,
  state,
  index,
  baseMaterial,
}: {
  type: AccessoryType
  productType: ProductType
  state: 'idle' | 'adding' | 'removing'
  index: number
  baseMaterial: THREE.Material
}) {
  const groupRef = useRef<THREE.Group>(null)
  const animProgress = useRef(state === 'removing' ? 1 : 0)
  const [progress, setProgress] = useState(state === 'removing' ? 1 : 0)

  useEffect(() => {
    animProgress.current = state === 'adding' ? 0 : state === 'removing' ? 1 : animProgress.current
    setProgress(animProgress.current)
  }, [state])

  const targetPosition = useMemo(
    () => getAccessoryMountPoints(productType, type, index),
    [productType, type, index]
  )

  const startOffset = useMemo(
    () => new THREE.Vector3(5, 3, 5),
    []
  )

  useFrame((_, delta) => {
    let target = animProgress.current
    if (state === 'adding') target = 1
    else if (state === 'removing') target = 0

    const speed = delta / 0.4
    if (animProgress.current < target) {
      animProgress.current = Math.min(animProgress.current + speed, target)
    } else if (animProgress.current > target) {
      animProgress.current = Math.max(animProgress.current - speed, target)
    }
    setProgress(animProgress.current)

    if (groupRef.current) {
      const eased = 1 - Math.pow(1 - animProgress.current, 3)
      const pos = new THREE.Vector3().lerpVectors(startOffset, targetPosition, eased)
      groupRef.current.position.copy(pos)
      groupRef.current.scale.setScalar(Math.max(0.01, eased))

      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          const mat = mesh.material as THREE.MeshStandardMaterial
          if (mat && mat.opacity !== undefined) {
            mat.opacity = eased
            mat.transparent = eased < 1
          }
        }
      })
    }
  })

  if (type === 'bead') {
    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial
            color="#E8B4B8"
            roughness={0.2}
            metalness={0.2}
            transparent
            opacity={progress}
          />
        </mesh>
        <mesh position={[0.38, 0, 0]}>
          <sphereGeometry args={[0.12, 28, 28]} />
          <meshStandardMaterial
            color="#4A90D9"
            roughness={0.25}
            metalness={0.15}
            transparent
            opacity={progress}
          />
        </mesh>
        <mesh position={[-0.38, 0, 0]}>
          <sphereGeometry args={[0.12, 28, 28]} />
          <meshStandardMaterial
            color="#5B8A5B"
            roughness={0.25}
            metalness={0.15}
            transparent
            opacity={progress}
          />
        </mesh>
        <mesh position={[0, 0, 0.3]}>
          <sphereGeometry args={[0.1, 24, 24]} />
          <meshStandardMaterial
            color="#F5A623"
            roughness={0.2}
            metalness={0.2}
            transparent
            opacity={progress}
          />
        </mesh>
      </group>
    )
  }

  if (type === 'charm') {
    const heartGeometry = useMemo(() => createHeartGeometry(0.28), [])
    return (
      <group ref={groupRef}>
        <mesh geometry={heartGeometry}>
          <meshStandardMaterial
            color="#E8877E"
            roughness={0.4}
            metalness={0.25}
            transparent
            opacity={progress}
          />
        </mesh>
        <mesh position={[0, 0.33, 0]}>
          <torusGeometry args={[0.07, 0.022, 12, 20]} />
          <meshStandardMaterial
            color="#C0C0C0"
            metalness={0.9}
            roughness={0.15}
            transparent
            opacity={progress}
          />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 4]}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.22, 14]} />
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.95}
          roughness={0.1}
          transparent
          opacity={progress}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[0.13, 0.042, 14, 28, Math.PI * 1.5]} />
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.95}
          roughness={0.1}
          transparent
          opacity={progress}
        />
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
    depth: size * 0.35,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: size * 0.05,
    bevelThickness: size * 0.05,
  })
  geometry.center()
  return geometry
}

export default ProductPreview
