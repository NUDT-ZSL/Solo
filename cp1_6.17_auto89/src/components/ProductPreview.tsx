import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import JSZip from 'jszip'
import {
  useConfigStore,
  MATERIAL_CONFIG,
  AccessoryType,
  ProductType,
  MaterialType,
  ExportedConfig,
} from '@/store'
import {
  createBraceletBaseGeometry,
  createBraceletConnectorCords,
  getBraceletBeadPositions,
  getNecklaceChainData,
  createDetailedPendantGeometry,
  getAccessoryMountPoints,
  createClaspGeometry,
} from '@/utils/models'
import {
  createLeatherTexture,
  createLeatherBumpMap,
  createCordTexture,
  createCordBumpMap,
  createMetalEnvironmentMap,
  createCylinderCompatibleUVs,
} from '@/utils/textures'

const COLOR_TRANSITION_DURATION = 0.3

function ProductPreview() {
  const [fadeKey, setFadeKey] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loadMessage, setLoadMessage] = useState<string | null>(null)
  const currentType = useConfigStore((s) => s.selectedType)
  const configLoaded = useConfigStore((s) => s.configLoaded)
  const loadError = useConfigStore((s) => s.loadError)
  const clearLoadStatus = useConfigStore((s) => s.clearLoadStatus)

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

  useEffect(() => {
    if (configLoaded) {
      setLoadMessage('配置已加载，可继续修改')
      const t = setTimeout(() => {
        setLoadMessage(null)
        clearLoadStatus()
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [configLoaded, clearLoadStatus])

  useEffect(() => {
    if (loadError) {
      setLoadMessage(`加载失败: ${loadError}`)
      const t = setTimeout(() => {
        setLoadMessage(null)
        clearLoadStatus()
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [loadError, clearLoadStatus])

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const handleScreenshot = async () => {
    if (!containerRef.current) return

    const canvas = containerRef.current.querySelector('canvas')
    if (!canvas || !canvasReady) {
      alert('3D场景尚未完成渲染，请稍候再试')
      return
    }

    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2')
      if (gl) {
        const pixels = new Uint8Array(canvas.width * canvas.height * 4)
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        const hasContent = pixels.some((p, i) => (i + 1) % 4 !== 0 && p > 0)
        if (!hasContent) {
          await new Promise((r) => setTimeout(r, 500))
        }
      }
    } catch (_) {
    }

    const exportedConfig = useConfigStore.getState().getExportedConfig()
    const configJSON = JSON.stringify(exportedConfig, null, 2)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    const dataURL = canvas.toDataURL('image/png')
    if (!dataURL || dataURL.length < 100) {
      alert('截图生成失败，场景可能未完全渲染')
      return
    }

    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '')

    const zip = new JSZip()
    zip.file(`handcraft-preview-${timestamp}.png`, base64Data, { base64: true })
    zip.file(`handcraft-config-${timestamp}.json`, configJSON)

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.download = `handcraft-customization-${timestamp}.zip`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleUploadConfig = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      let config: ExportedConfig | null = null

      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        const jsonFile = Object.values(zip.files).find((f) =>
          f.name.endsWith('.json') && !f.dir
        )
        if (jsonFile) {
          const jsonContent = await jsonFile.async('string')
          config = JSON.parse(jsonContent) as ExportedConfig
        } else {
          alert('ZIP包中未找到配置JSON文件')
          return
        }
      } else if (file.name.endsWith('.json')) {
        const text = await file.text()
        config = JSON.parse(text) as ExportedConfig
      } else {
        alert('仅支持 .json 或 .zip 格式的配置文件')
        return
      }

      const result = await useConfigStore.getState().loadConfig(config)
      if (!result.success && result.errors) {
        alert(`配置文件校验失败:\n${result.errors.join('\n')}`)
      }
    } catch (err) {
      console.error('Failed to load config:', err)
      alert('配置文件加载失败，请检查文件格式是否正确')
    }

    e.target.value = ''
  }

  const onCanvasCreated = useCallback(() => {
    setTimeout(() => setCanvasReady(true), 800)
  }, [])

  return (
    <div className="preview-container" ref={containerRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {loadMessage && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: loadError ? '#E8877E' : '#5B8A5B',
            color: '#FFFFFF',
            borderRadius: 8,
            fontSize: 14,
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {loadMessage}
        </div>
      )}

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
        onCreated={onCanvasCreated}
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

  const animStartTimeRef = useRef<number>(0)
  const animatingColorRef = useRef(false)
  const currentColorRef = useRef(new THREE.Color(targetColor))
  const startColorRef = useRef(new THREE.Color(targetColor))
  const endColorRef = useRef(new THREE.Color(targetColor))

  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const target = new THREE.Color(targetColor)
    if (!target.equals(currentColorRef.current)) {
      startColorRef.current = currentColorRef.current.clone()
      endColorRef.current = target.clone()
      animStartTimeRef.current = performance.now()
      animatingColorRef.current = true
    }
  }, [targetColor])

  const envMap = useMemo(() => createMetalEnvironmentMap(), [])
  const materialConfig = MATERIAL_CONFIG[materialType]

  const { mapTexture, bumpMap } = useMemo(() => {
    const baseColor = '#' + currentColorRef.current.getHexString()
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
  }, [materialType, targetColor])

  const productMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: currentColorRef.current.clone(),
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
  }, [materialType, isFading, materialConfig, mapTexture, bumpMap, envMap])

  const accessoryMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: currentColorRef.current.clone(),
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
      transparent: true,
    })
  }, [materialType, materialConfig])

  useFrame(() => {
    const now = performance.now()

    if (animatingColorRef.current) {
      const elapsed = (now - animStartTimeRef.current) / 1000
      const t = Math.min(elapsed / COLOR_TRANSITION_DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)

      const interpolated = new THREE.Color().lerpColors(
        startColorRef.current,
        endColorRef.current,
        eased
      )

      currentColorRef.current.copy(interpolated)
      productMaterial.color.copy(interpolated)
      accessoryMaterial.color.copy(interpolated)

      if (t >= 1) {
        animatingColorRef.current = false
        forceUpdate((n) => n + 1)
      }
    }

    if (groupRef.current) {
      const targetOpacity = isFading ? 0.3 : 1
      if (Math.abs(productMaterial.opacity - targetOpacity) > 0.001) {
        productMaterial.opacity = THREE.MathUtils.lerp(
          productMaterial.opacity,
          targetOpacity,
          0.15
        )
      }
    }
  })

  return (
    <group ref={groupRef}>
      <BaseMesh
        type={selectedType}
        material={productMaterial}
        materialType={materialType}
        envMap={envMap}
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
  envMap,
}: {
  type: ProductType
  material: THREE.Material
  materialType: MaterialType
  envMap: THREE.CubeTexture
}) {
  if (type === 'bracelet') {
    return <BraceletModel material={material} materialType={materialType} envMap={envMap} />
  }
  if (type === 'necklace') {
    return <NecklaceModel material={material} materialType={materialType} envMap={envMap} />
  }
  return <PendantModel material={material} materialType={materialType} envMap={envMap} />
}

function BraceletModel({
  material,
  materialType,
  envMap,
}: {
  material: THREE.Material
  materialType: MaterialType
  envMap: THREE.CubeTexture
}) {
  const baseGeometry = useMemo(() => {
    const g = createBraceletBaseGeometry()
    return materialType === 'cord' ? createCylinderCompatibleUVs(g) : g
  }, [materialType])

  const { geometry: cordGeometry, positions: beadPositions } = useMemo(
    () => createBraceletConnectorCords(),
    []
  )

  const processedCordGeo = useMemo(
    () => (materialType === 'cord' ? createCylinderCompatibleUVs(cordGeometry) : cordGeometry),
    [cordGeometry, materialType]
  )

  const beadMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: materialType === 'metal' ? '#E8E8E8' : '#F0D9B5',
      roughness: 0.15,
      metalness: 0.85,
      envMap: envMap,
      envMapIntensity: 0.9,
    })
    return m
  }, [materialType, envMap])

  const cordMaterial = useMemo(() => {
    const m = (material as THREE.MeshStandardMaterial).clone()
    return m
  }, [material])

  return (
    <group rotation={[Math.PI / 2.5, 0, 0]}>
      <mesh geometry={baseGeometry} material={material} />
      <mesh geometry={processedCordGeo} material={cordMaterial} />
      {beadPositions.map((pos, i) => (
        <mesh key={i} position={pos} material={beadMaterial}>
          <sphereGeometry args={[0.11, 32, 32]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 1.45]}>
        <torusGeometry args={[0.1, 0.025, 16, 32]} />
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.95}
          roughness={0.12}
          envMap={envMap}
          envMapIntensity={1.0}
        />
      </mesh>
    </group>
  )
}

function NecklaceModel({
  material,
  materialType,
  envMap,
}: {
  material: THREE.Material
  materialType: MaterialType
  envMap: THREE.CubeTexture
}) {
  const { linkGeometry, transforms } = useMemo(() => getNecklaceChainData(), [])

  const chainMaterial = useMemo(() => {
    if (materialType === 'metal') {
      const m = new THREE.MeshStandardMaterial({
        color: '#D0D0D0',
        metalness: 0.96,
        roughness: 0.1,
        envMap: envMap,
        envMapIntensity: 1.1,
      })
      return m
    }
    return material
  }, [material, materialType, envMap])

  const claspGeo = useMemo(() => createClaspGeometry(), [])

  return (
    <group>
      {transforms.map((tf, i) => (
        <mesh
          key={i}
          geometry={linkGeometry}
          material={chainMaterial}
          position={tf.position}
          rotation={tf.rotation}
        />
      ))}
      <mesh geometry={claspGeo} position={[0, 1.4, 0.05]} rotation={[0, 0, 0]}>
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.95}
          roughness={0.12}
          envMap={envMap}
          envMapIntensity={1.0}
        />
      </mesh>
      <group position={[0, -2.1, 0.1]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial
            color={materialType === 'metal' ? '#B08050' : '#D4A574'}
            roughness={0.3}
            metalness={0.65}
            envMap={envMap}
            envMapIntensity={0.7}
          />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <torusGeometry args={[0.065, 0.022, 12, 24]} />
          <meshStandardMaterial
            color="#C0C0C0"
            metalness={0.95}
            roughness={0.12}
            envMap={envMap}
            envMapIntensity={1.0}
          />
        </mesh>
      </group>
    </group>
  )
}

function PendantModel({
  material,
  materialType,
  envMap,
}: {
  material: THREE.Material
  materialType: MaterialType
  envMap: THREE.CubeTexture
}) {
  const { bodyGeometry, holeGeometry, settingPositions, accentPositions } = useMemo(
    () => createDetailedPendantGeometry(),
    []
  )

  const gemMaterial = useMemo(() => {
    const baseColor = (material as THREE.MeshStandardMaterial).color
    const m = new THREE.MeshStandardMaterial({
      color: baseColor.clone(),
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
      envMap: envMap,
      envMapIntensity: 1.3,
    })
    return m
  }, [material, envMap])

  const settingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: materialType === 'metal' ? '#C0C0C0' : '#8B6914',
      roughness: 0.18,
      metalness: 0.92,
      envMap: envMap,
      envMapIntensity: 0.85,
    })
  }, [materialType, envMap])

  const holeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: materialType === 'metal' ? '#A8A8A8' : '#6B4914',
      roughness: 0.25,
      metalness: 0.85,
      envMap: envMap,
      envMapIntensity: 0.7,
    })
  }, [materialType, envMap])

  const accentMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#E8B4B8',
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92,
      envMap: envMap,
      envMapIntensity: 1.2,
    })
  }, [envMap])

  return (
    <group>
      <mesh geometry={bodyGeometry}>
        <meshStandardMaterial
          color={(material as THREE.MeshStandardMaterial).color}
          roughness={(material as THREE.MeshStandardMaterial).roughness}
          metalness={(material as THREE.MeshStandardMaterial).metalness}
          map={(material as THREE.MeshStandardMaterial).map}
          bumpMap={(material as THREE.MeshStandardMaterial).bumpMap}
          bumpScale={(material as THREE.MeshStandardMaterial).bumpScale}
          envMap={envMap}
          envMapIntensity={0.75}
        />
      </mesh>
      <mesh geometry={holeGeometry} material={holeMaterial} />
      {settingPositions.map((pos, i) => (
        <mesh key={`setting-${i}`} position={pos} material={settingMaterial}>
          <sphereGeometry args={[0.045, 16, 16]} />
        </mesh>
      ))}
      {accentPositions.map((pos, i) => (
        <mesh key={`accent-${i}`} position={pos} material={accentMaterial}>
          <octahedronGeometry args={[0.075, 0]} />
        </mesh>
      ))}
      <mesh position={[0, 1.12, 0]} material={settingMaterial}>
        <torusGeometry args={[0.16, 0.042, 16, 32]} />
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
  const animProgressRef = useRef(state === 'removing' ? 1 : 0)
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (state === 'adding') {
      animProgressRef.current = 0
    } else if (state === 'removing') {
      animProgressRef.current = 1
    }
  }, [state])

  const targetPosition = useMemo(
    () => getAccessoryMountPoints(productType, type, index),
    [productType, type, index]
  )

  const startOffset = useMemo(() => new THREE.Vector3(5.5, 3.5, 5.5), [])

  useFrame((_, delta) => {
    let target = animProgressRef.current
    if (state === 'adding') target = 1
    else if (state === 'removing') target = 0

    const speed = delta / 0.4
    if (animProgressRef.current < target) {
      animProgressRef.current = Math.min(animProgressRef.current + speed, target)
    } else if (animProgressRef.current > target) {
      animProgressRef.current = Math.max(animProgressRef.current - speed, target)
    }

    if (groupRef.current) {
      const t = animProgressRef.current
      const eased = 1 - Math.pow(1 - t, 3)
      const pos = new THREE.Vector3().lerpVectors(startOffset, targetPosition, eased)
      groupRef.current.position.copy(pos)
      groupRef.current.scale.setScalar(Math.max(0.001, eased))

      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial
            if (mat && 'opacity' in mat) {
              mat.opacity = eased
              mat.transparent = eased < 0.999
            }
          })
        }
      })

      forceRender((n) => (n + 1) % 1000)
    }
  })

  if (type === 'bead') {
    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#E8B4B8" roughness={0.18} metalness={0.22} transparent />
        </mesh>
        <mesh position={[0.38, 0, 0]}>
          <sphereGeometry args={[0.12, 28, 28]} />
          <meshStandardMaterial color="#4A90D9" roughness={0.22} metalness={0.18} transparent />
        </mesh>
        <mesh position={[-0.38, 0, 0]}>
          <sphereGeometry args={[0.12, 28, 28]} />
          <meshStandardMaterial color="#5B8A5B" roughness={0.22} metalness={0.18} transparent />
        </mesh>
        <mesh position={[0, 0, 0.32]}>
          <sphereGeometry args={[0.1, 24, 24]} />
          <meshStandardMaterial color="#F5A623" roughness={0.18} metalness={0.22} transparent />
        </mesh>
      </group>
    )
  }

  if (type === 'charm') {
    const heartGeometry = useMemo(() => createHeartGeometry(0.28), [])
    return (
      <group ref={groupRef}>
        <mesh geometry={heartGeometry}>
          <meshStandardMaterial color="#E8877E" roughness={0.38} metalness={0.28} transparent />
        </mesh>
        <mesh position={[0, 0.33, 0]}>
          <torusGeometry args={[0.07, 0.022, 12, 20]} />
          <meshStandardMaterial
            color="#C0C0C0"
            metalness={0.92}
            roughness={0.14}
            transparent
          />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 4]}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.22, 14]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.96} roughness={0.1} transparent />
      </mesh>
      <mesh>
        <torusGeometry args={[0.13, 0.042, 14, 28, Math.PI * 1.5]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.96} roughness={0.1} transparent />
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
