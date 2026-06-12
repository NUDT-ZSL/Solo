import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { LayerSlice } from './LayerSlice'
import FossilViewer from './FossilViewer'
import { useStrataStore } from '@/store/useStrataStore'
import type { Layer } from '@/types'
import { useRef, useEffect, useMemo, useCallback } from 'react'

function CameraReset() {
  const { camera } = useThree()
  const cameraResetTrigger = useStrataStore((s) => s.cameraResetTrigger)
  const defaultPos = useMemo(() => new THREE.Vector3(0, 80, 200), [])
  const isResetting = useRef(false)
  const resetStart = useRef(0)
  const duration = 0.5

  useEffect(() => {
    if (cameraResetTrigger > 0) {
      isResetting.current = true
      resetStart.current = performance.now() / 1000
    }
  }, [cameraResetTrigger])

  useFrame(() => {
    if (!isResetting.current) return

    const elapsed = performance.now() / 1000 - resetStart.current
    const t = Math.min(elapsed / duration, 1)
    camera.position.lerp(defaultPos, t < 1 ? 0.1 : 1)

    if (t >= 1) {
      camera.position.copy(defaultPos)
      isResetting.current = false
    }
  })

  return null
}

function StrataLayers() {
  const layers = useStrataStore((s) => s.layers)
  const selectedLayerId = useStrataStore((s) => s.selectedLayerId)
  const selectLayer = useStrataStore((s) => s.selectLayer)
  const timeline = useStrataStore((s) => s.timeline)
  const viewingFossil = useStrataStore((s) => s.viewingFossil)

  const layerData = useMemo(() => {
    let cumulativeHeight = 0
    return layers.map((layer: Layer) => {
      const targetY = cumulativeHeight
      cumulativeHeight += layer.thickness / 50 + 1
      const isVisible = timeline >= (layer.order / 6) * 100
      const isSelected = layer._id === selectedLayerId
      return { layer, targetY, isVisible, isSelected }
    })
  }, [layers, timeline, selectedLayerId])

  return (
    <>
      {layerData.map(({ layer, targetY, isVisible, isSelected }) => (
        <LayerSlice
          key={layer._id}
          layer={layer}
          isSelected={isSelected}
          onClick={() => selectLayer(layer._id === selectedLayerId ? null : layer._id)}
          visible={isVisible}
          targetY={targetY}
        />
      ))}
      {viewingFossil && <FossilViewer />}
    </>
  )
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 80, 200], fov: 50 }}
      shadows
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} castShadow />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={50 * 0.5}
        maxDistance={50 * 3}
        autoRotate
        autoRotateSpeed={0.1}
      />
      <CameraReset />
      <StrataLayers />
    </Canvas>
  )
}
