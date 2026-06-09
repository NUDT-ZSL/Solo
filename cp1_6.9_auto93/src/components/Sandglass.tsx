import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SandglassProps {
  remainingTime: number
  targetTime: number
  isResetting: boolean
  onDoubleClickReset: () => void
}

const HOURGLASS_HEIGHT = 400
const RADIUS_MAX = 80
const RADIUS_NECK = 8
const BREATH_CYCLE = 2.0
const ROTATION_SPEED = 0.5 * (Math.PI / 180)
const FLASH_DURATION = 0.3
const FLASH_COUNT = 3

export default function Sandglass({
  remainingTime,
  targetTime,
  isResetting,
  onDoubleClickReset,
}: SandglassProps) {
  const topConeRef = useRef<THREE.LineSegments>(null)
  const bottomConeRef = useRef<THREE.LineSegments>(null)
  const topRingRef = useRef<THREE.Mesh>(null)
  const bottomRingRef = useRef<THREE.Mesh>(null)
  const centerRingRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const flashStartTimeRef = useRef<number>(0)

  const { topWireframe, bottomWireframe } = useMemo(() => {
    const topGeo = new THREE.CylinderGeometry(
      RADIUS_NECK,
      RADIUS_MAX,
      HOURGLASS_HEIGHT / 2,
      32,
      8
    )
    topGeo.translate(0, HOURGLASS_HEIGHT / 4, 0)

    const bottomGeo = new THREE.CylinderGeometry(
      RADIUS_MAX,
      RADIUS_NECK,
      HOURGLASS_HEIGHT / 2,
      32,
      8
    )
    bottomGeo.translate(0, -HOURGLASS_HEIGHT / 4, 0)

    const topWf = new THREE.WireframeGeometry(topGeo)
    const bottomWf = new THREE.WireframeGeometry(bottomGeo)

    topGeo.dispose()
    bottomGeo.dispose()

    return { topWireframe: topWf, bottomWireframe: bottomWf }
  }, [])

  const materialRef = useRef<THREE.LineBasicMaterial>(
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      linewidth: 1.5,
    })
  )

  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    })
  )

  useFrame((state) => {
    const currentTime = state.clock.getElapsedTime()

    if (groupRef.current) {
      groupRef.current.rotation.y = currentTime * ROTATION_SPEED
    }

    const timePercent = targetTime > 0 ? remainingTime / targetTime : 1
    const breathPhase = (currentTime % BREATH_CYCLE) / BREATH_CYCLE
    const breathValue = 0.5 + 0.5 * Math.sin(breathPhase * Math.PI * 2)
    const targetOpacity = 0.2 + (0.7 - 0.2) * (0.3 + 0.7 * timePercent) * (0.6 + 0.4 * breathValue)

    let finalOpacity = targetOpacity

    if (isResetting && flashStartTimeRef.current === 0) {
      flashStartTimeRef.current = currentTime
    }
    if (!isResetting) {
      flashStartTimeRef.current = 0
    }

    if (isResetting && flashStartTimeRef.current > 0) {
      const elapsed = currentTime - flashStartTimeRef.current
      const totalFlashTime = FLASH_DURATION * FLASH_COUNT
      if (elapsed < totalFlashTime) {
        const flashIndex = Math.floor(elapsed / FLASH_DURATION)
        const flashProgress = (elapsed % FLASH_DURATION) / FLASH_DURATION
        const flashCycle = flashIndex < FLASH_COUNT ? 1 - Math.abs(flashProgress * 2 - 1) : 0
        finalOpacity = flashCycle * 1.0
      }
    }

    materialRef.current.opacity = finalOpacity * 0.4
    ringMaterialRef.current.opacity = finalOpacity * 0.6

    materialRef.current.needsUpdate = true
    ringMaterialRef.current.needsUpdate = true
  })

  return (
    <group
      ref={groupRef}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClickReset()
      }}
    >
      <lineSegments ref={topConeRef} geometry={topWireframe} material={materialRef.current}>
        <lineBasicMaterial
          attach="material"
          color="rgba(255,255,255,0.4)"
          transparent
          linewidth={1.5}
          opacity={0.4}
        />
      </lineSegments>
      <lineSegments ref={bottomConeRef} geometry={bottomWireframe} material={materialRef.current}>
        <lineBasicMaterial
          attach="material"
          color="rgba(255,255,255,0.4)"
          transparent
          linewidth={1.5}
          opacity={0.4}
        />
      </lineSegments>

      <mesh ref={topRingRef} position={[0, HOURGLASS_HEIGHT / 2, 0]}>
        <torusGeometry args={[RADIUS_MAX, 3, 16, 64]} />
        <meshBasicMaterial
          color="#8ab4f8"
          transparent
          opacity={0.6}
        />
      </mesh>

      <mesh ref={bottomRingRef} position={[0, -HOURGLASS_HEIGHT / 2, 0]}>
        <torusGeometry args={[RADIUS_MAX, 3, 16, 64]} />
        <meshBasicMaterial
          color="#ffb080"
          transparent
          opacity={0.6}
        />
      </mesh>

      <mesh ref={centerRingRef} position={[0, 0, 0]}>
        <torusGeometry args={[RADIUS_NECK + 2, 2, 12, 32]} />
        <meshBasicMaterial
          color="#e0e0ff"
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}
