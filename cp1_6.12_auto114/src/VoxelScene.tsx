import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useVoxelStore } from './store'
import { generateVoxelData, VoxelGeometryData } from './voxelEngine'

const VoxelPointCloud: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const { slices, sliceSpacing, opacity, clipPlaneEnabled, clipPlaneZ, setVoxelCount, setBoundingBox } =
    useVoxelStore()

  const voxelData = useMemo<VoxelGeometryData>(() => {
    const data = generateVoxelData(slices, sliceSpacing, opacity)
    return data
  }, [slices, sliceSpacing, opacity])

  useEffect(() => {
    setVoxelCount(voxelData.count)
    setBoundingBox(voxelData.boundingBox)
  }, [voxelData.count, voxelData.boundingBox, setVoxelCount, setBoundingBox])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(voxelData.positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(voxelData.colors, 3))
    return geo
  }, [voxelData])

  const clipPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  }, [])

  useEffect(() => {
    if (!pointsRef.current) return

    const halfD = (slices.length * sliceSpacing) / 2
    const clipWorldZ = clipPlaneZ * sliceSpacing - halfD
    clipPlane.constant = -clipWorldZ
  }, [clipPlaneZ, sliceSpacing, slices.length, clipPlane])

  const material = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    return mat
  }, [opacity])

  useEffect(() => {
    if (clipPlaneEnabled) {
      material.clippingPlanes = [clipPlane]
      material.clipShadows = true
    } else {
      material.clippingPlanes = []
    }
    material.needsUpdate = true
  }, [clipPlaneEnabled, clipPlane, material])

  return (
    <points ref={pointsRef} geometry={geometry} material={material}>
    </points>
  )
}

const ClipPlaneMesh: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { slices, sliceSpacing, clipPlaneEnabled, clipPlaneZ, setClipPlaneZ } = useVoxelStore()
  const { camera } = useThree()

  const planeSize = useMemo(() => {
    if (slices.length === 0) return { width: 100, height: 100 }
    const firstSlice = slices[0]
    return {
      width: firstSlice.width * 1.2,
      height: firstSlice.height * 1.2,
    }
  }, [slices])

  const halfD = slices.length > 0 ? (slices.length * sliceSpacing) / 2 : 5
  const zPos = clipPlaneZ * sliceSpacing - halfD

  const isDragging = useRef(false)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const planeIntersector = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))

  useEffect(() => {
    if (!clipPlaneEnabled || !meshRef.current) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'CANVAS') {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
        mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

        raycaster.current.setFromCamera(mouse.current, camera)
        const intersects = raycaster.current.intersectObject(meshRef.current!)
        if (intersects.length > 0) {
          isDragging.current = true
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const target = e.target as HTMLElement
      if (target.tagName === 'CANVAS') {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
        mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

        raycaster.current.setFromCamera(mouse.current, camera)
        planeIntersector.current.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, zPos)
        )

        const intersectPoint = new THREE.Vector3()
        raycaster.current.ray.intersectPlane(planeIntersector.current, intersectPoint)

        if (intersectPoint) {
          const maxZ = slices.length > 0 ? slices.length - 1 : 10
          let newZ = (intersectPoint.z + halfD) / sliceSpacing
          newZ = Math.max(0, Math.min(maxZ, newZ))
          setClipPlaneZ(newZ)
        }
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging.current) {
        isDragging.current = false
        const target = e.target as HTMLElement
        if (target.releasePointerCapture) {
          target.releasePointerCapture(e.pointerId)
        }
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [clipPlaneEnabled, camera, zPos, sliceSpacing, slices.length, halfD, setClipPlaneZ])

  if (!clipPlaneEnabled) return null

  return (
    <mesh ref={meshRef} position={[0, 0, zPos]} rotation={[0, 0, 0]}>
      <planeGeometry args={[planeSize.width, planeSize.height]} />
      <meshBasicMaterial
        color="#FF6B35"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(planeSize.width, planeSize.height)]} />
        <lineBasicMaterial color="#FF6B35" linewidth={2} />
      </lineSegments>
    </mesh>
  )
}

const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight
        position={[50, 50, 50]}
        intensity={0.8}
        color="#ffffff"
        castShadow
      />
      <directionalLight
        position={[-30, -20, 40]}
        intensity={0.4}
        color="#aaccff"
      />
    </>
  )
}

const CameraController: React.FC = () => {
  const { slices, sliceSpacing } = useVoxelStore()
  const { camera } = useThree()

  useEffect(() => {
    if (slices.length === 0) {
      camera.position.set(0, 0, 100)
      return
    }

    const firstSlice = slices[0]
    const maxDim = Math.max(firstSlice.width, firstSlice.height, slices.length * sliceSpacing)
    const distance = maxDim * 1.5
    camera.position.set(distance * 0.7, distance * 0.5, distance)
    camera.lookAt(0, 0, 0)
  }, [slices, sliceSpacing, camera])

  return null
}

export const VoxelScene: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 100], fov: 60 }}
      gl={{ antialias: true, alpha: false, localClippingEnabled: true }}
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <CameraController />
      <Lighting />
      <VoxelPointCloud />
      <ClipPlaneMesh />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.02}
        zoomSpeed={0.8}
        panSpeed={0.5}
        minDistance={30}
        maxDistance={500}
        enablePan={true}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />
      <gridHelper args={[200, 20, '#444', '#333']} position={[0, -100, 0]} />
    </Canvas>
  )
}
