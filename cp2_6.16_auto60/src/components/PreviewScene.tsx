import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { eventBus } from '@/utils/eventBus'
import { EventType, IWalletSettings, WalletStyle } from '@/types'
import { buildWalletModel } from '@/utils/meshBuilder'
import { exportSnapshot } from '@/utils/snapshotExport'
import { useWallet } from '@/context/WalletContext'

interface WalletMeshProps {
  settings: IWalletSettings
  onMeshReady: (group: THREE.Group) => void
}

const WalletMesh: React.FC<WalletMeshProps> = ({ settings, onMeshReady }) => {
  const groupRef = useRef<THREE.Group>(null)
  const [walletGroup, setWalletGroup] = useState<THREE.Group | null>(null)
  const [transitionOpacity, setTransitionOpacity] = useState(1)
  const [isStyleChanging, setIsStyleChanging] = useState(false)
  const styleChangeProgress = useRef(0)
  const lastStyle = useRef(settings.style)

  useEffect(() => {
    const newGroup = buildWalletModel(settings.style, settings.color, settings.texture, settings.stitchType)
    if (groupRef.current) {
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0])
      }
      newGroup.children.forEach((child) => {
        groupRef.current!.add(child)
      })
    }
    setWalletGroup(newGroup)
    onMeshReady(newGroup)

    setTransitionOpacity(0)
    const fadeTimer = setTimeout(() => setTransitionOpacity(1), 50)

    return () => clearTimeout(fadeTimer)
  }, [settings.color, settings.texture, settings.stitchType, onMeshReady])

  useEffect(() => {
    if (settings.style !== lastStyle.current) {
      setIsStyleChanging(true)
      styleChangeProgress.current = 0
      lastStyle.current = settings.style

      const newGroup = buildWalletModel(settings.style, settings.color, settings.texture, settings.stitchType)
      if (groupRef.current) {
        while (groupRef.current.children.length > 0) {
          groupRef.current.remove(groupRef.current.children[0])
        }
        newGroup.children.forEach((child) => {
          groupRef.current!.add(child)
        })
      }
      setWalletGroup(newGroup)
      onMeshReady(newGroup)
    }
  }, [settings.style, settings.color, settings.texture, settings.stitchType, onMeshReady])

  useFrame((_, delta) => {
    if (isStyleChanging) {
      styleChangeProgress.current += delta / 0.6
      if (styleChangeProgress.current >= 1) {
        styleChangeProgress.current = 1
        setIsStyleChanging(false)
      }

      const t = styleChangeProgress.current
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      if (groupRef.current) {
        groupRef.current.rotation.y = easeT * Math.PI * 2
        const scale = 0.8 + 0.2 * easeT
        groupRef.current.scale.setScalar(scale)
      }
    }

    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial
          if (mat.opacity !== undefined) {
            mat.transparent = true
            const targetOpacity = transitionOpacity
            mat.opacity += (targetOpacity - mat.opacity) * 0.1
          }
        }
      })
    }
  })

  return <group ref={groupRef} />
}

interface SceneContentProps {
  settings: IWalletSettings
  onMeshReady: (group: THREE.Group) => void
}

const SceneContent: React.FC<SceneContentProps> = ({ settings, onMeshReady }) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[150, 150, 100]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-100, 80, -150]}
        intensity={0.5}
      />

      <WalletMesh settings={settings} onMeshReady={onMeshReady} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -60, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <shadowMaterial opacity={0.3} />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={150}
        maxDistance={500}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  )
}

const PreviewScene: React.FC = () => {
  const { settings } = useWallet()
  const { scene, camera } = useThree()
  const walletGroupRef = useRef<THREE.Group | null>(null)
  const [currentSettings, setCurrentSettings] = useState(settings)

  useEffect(() => {
    const handleSettingsChange = (newSettings: IWalletSettings) => {
      setCurrentSettings(newSettings)
    }

    eventBus.on(EventType.SETTINGS_CHANGE, handleSettingsChange)
    return () => eventBus.off(EventType.SETTINGS_CHANGE, handleSettingsChange)
  }, [])

  const handleMeshReady = useCallback((group: THREE.Group) => {
    walletGroupRef.current = group
  }, [])

  useEffect(() => {
    const handleExport = () => {
      if (walletGroupRef.current) {
        exportSnapshot(scene, camera, currentSettings)
      }
    }

    window.addEventListener('exportSnapshot', handleExport)
    return () => window.removeEventListener('exportSnapshot', handleExport)
  }, [scene, camera, currentSettings])

  return (
    <div style={styles.canvasContainer}>
      <Canvas
        shadows
        camera={{ position: [200, 150, 250], fov: 45 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: '#0d0d0d' }}
      >
        <SceneContent settings={currentSettings} onMeshReady={handleMeshReady} />
      </Canvas>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  canvasContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '400px',
  },
}

export default PreviewScene
