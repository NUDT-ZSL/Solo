import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type CrystalShape = 'hexagon' | 'cone' | 'irregular'

export interface CrystalProps {
  id: number
  seedX: number
  seedZ: number
  height: number
  maxHeight: number
  shapeType: CrystalShape
  hue: number
  saturation: number
  lightness: number
  opacity: number
  isFullyGrown: boolean
  pulsePhase: number
  pulseSpeed: number
  vibrateActive: boolean
  vibratePhase: number
  vibrateFreq: number
  brightnessBoost: number
  resonanceShift: number
  onRaycast: (mesh: THREE.Mesh, data: { id: number; topY: number; posX: number; posZ: number }) => void
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function Crystal({
  id,
  seedX,
  seedZ,
  height,
  maxHeight,
  shapeType,
  hue,
  saturation,
  lightness,
  opacity,
  isFullyGrown,
  pulsePhase,
  pulseSpeed,
  vibrateActive,
  vibratePhase,
  vibrateFreq,
  brightnessBoost,
  resonanceShift,
  onRaycast,
}: CrystalProps) {
  const groupRef = useRef<THREE.Group>(null)
  const mainMeshRef = useRef<THREE.Mesh>(null)
  const glowMeshRef = useRef<THREE.Mesh>(null)
  const topMeshRef = useRef<THREE.Mesh>(null)

  const actualHeight = Math.max(0.01, Math.min(height, maxHeight))
  const growProgress = easeInOutQuad(Math.min(1, height / maxHeight))

  const { bodyGeom, topGeom, glowGeom } = useMemo(() => {
    let body: THREE.BufferGeometry
    let top: THREE.BufferGeometry | null = null
    let glow: THREE.BufferGeometry

    if (shapeType === 'hexagon') {
      const bodyR = 0.16 + seedX * 0.03
      body = new THREE.CylinderGeometry(bodyR, bodyR * 0.9, 1, 6, 1)
      top = new THREE.ConeGeometry(bodyR * 0.85, 0.35, 6, 1)
      glow = new THREE.CylinderGeometry(bodyR * 1.08, bodyR * 1.02, 1, 6, 1)
    } else if (shapeType === 'cone') {
      const bodyR = 0.2 + seedZ * 0.025
      body = new THREE.CylinderGeometry(bodyR * 0.9, bodyR, 1, 8, 1)
      top = new THREE.ConeGeometry(bodyR * 0.88, 0.45, 8, 1)
      glow = new THREE.CylinderGeometry(bodyR * 1.1, bodyR * 1.04, 1, 8, 1)
    } else {
      const bodyR = 0.14 + Math.abs(seedX - seedZ) * 0.04
      body = new THREE.CylinderGeometry(bodyR * 0.7, bodyR * 1.1, 1, 5, 1)
      top = new THREE.ConeGeometry(bodyR * 0.75, 0.4, 5, 1)
      glow = new THREE.CylinderGeometry(bodyR * 1.12, bodyR * 1.06, 1, 5, 1)
    }

    return { bodyGeom: body, topGeom: top, glowGeom: glow }
  }, [shapeType, seedX, seedZ])

  const baseColor = useMemo(() => {
    return new THREE.Color().setHSL(hue / 360, saturation, lightness)
  }, [hue, saturation, lightness])

  const innerColor = useMemo(() => {
    return new THREE.Color().setHSL(hue / 360, Math.min(1, saturation + 0.1), Math.min(0.95, lightness + 0.2))
  }, [hue, saturation, lightness])

  useFrame(() => {
    if (!groupRef.current) return

    let scaleY = actualHeight
    let scaleXZ = 1
    let offsetY = actualHeight / 2

    if (isFullyGrown) {
      const pulse = Math.sin(pulsePhase * pulseSpeed) * 0.05
      scaleXZ = 1 + pulse
      scaleY = actualHeight * (1 + pulse * 0.3)
    }

    if (vibrateActive) {
      const vib = Math.sin(vibratePhase * vibrateFreq * Math.PI * 2) * 0.02
      offsetY += vib
    } else if (resonanceShift !== 0) {
      offsetY += Math.sin(vibratePhase * 8) * 0.012
    }

    groupRef.current.scale.set(scaleXZ, scaleY, scaleXZ)
    groupRef.current.position.set(seedX, offsetY, seedZ)

    const effHue = (hue + resonanceShift + 360) % 360
    const effLight = Math.min(0.95, lightness * brightnessBoost + (brightnessBoost > 1 ? 0.15 : 0))
    const displayColor = new THREE.Color().setHSL(effHue / 360, saturation, effLight)

    if (mainMeshRef.current) {
      const mat = mainMeshRef.current.material as THREE.MeshPhysicalMaterial
      mat.color.copy(displayColor)
      mat.opacity = opacity * (0.6 + growProgress * 0.4)
      mat.emissive.copy(displayColor)
      mat.emissiveIntensity = 0.35 * brightnessBoost
    }

    if (glowMeshRef.current) {
      const mat = glowMeshRef.current.material as THREE.MeshBasicMaterial
      mat.color.copy(displayColor)
      mat.opacity = opacity * 0.25 * brightnessBoost
    }

    if (topMeshRef.current) {
      const mat = topMeshRef.current.material as THREE.MeshPhysicalMaterial
      const topColor = new THREE.Color().setHSL(effHue / 360, saturation, Math.min(0.95, effLight + 0.1))
      mat.color.copy(topColor)
      mat.emissive.copy(topColor)
      mat.emissiveIntensity = 0.5 * brightnessBoost
    }
  })

  const handleUpdate = (self: THREE.Mesh) => {
    if (onRaycast && self) {
      const pos = new THREE.Vector3()
      self.getWorldPosition(pos)
      const worldTop = pos.y + actualHeight
      onRaycast(self, { id, topY: worldTop, posX: seedX, posZ: seedZ })
    }
  }

  return (
    <group ref={groupRef}>
      <mesh
        ref={mainMeshRef}
        geometry={bodyGeom}
        castShadow
        onUpdate={handleUpdate as any}
        userData={{ crystalId: id }}
      >
        <meshPhysicalMaterial
          color={baseColor}
          transparent
          opacity={opacity}
          roughness={0.08}
          metalness={0.1}
          transmission={0.6}
          thickness={0.5}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive={baseColor}
          emissiveIntensity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={glowMeshRef} geometry={glowGeom} userData={{ crystalId: id, isGlow: true }}>
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={opacity * 0.2}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {topGeom && (
        <mesh
          ref={topMeshRef}
          geometry={topGeom}
          position={[0, 0.5 + 0.175, 0]}
          userData={{ crystalId: id }}
        >
          <meshPhysicalMaterial
            color={innerColor}
            transparent
            opacity={Math.min(1, opacity + 0.1)}
            roughness={0.05}
            metalness={0.15}
            transmission={0.7}
            thickness={0.4}
            ior={1.5}
            emissive={innerColor}
            emissiveIntensity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

export default Crystal
