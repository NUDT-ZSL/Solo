import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import type { CubeInstance } from '../types'

type ManualAnimCube = {
  pos: [number, number, number]
  color: string
  scale: number
}

type TowerProps = {
  autoCubes: CubeInstance[]
  manualAnimCubes: ManualAnimCube[]
  totalCubes: number
  transitionT: number
}

const MAX_INSTANCES = 2000

function buildColor(hex: string, opacity: number): THREE.Color {
  const c = new THREE.Color(hex)
  if (opacity < 1) {
    c.multiplyScalar(0.95 + opacity * 0.05)
  }
  return c
}

export default function Tower({
  autoCubes,
  manualAnimCubes,
  totalCubes,
  transitionT,
}: TowerProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null)
  const dummyObj = useMemo(() => new THREE.Object3D(), [])

  const totalInstances = Math.min(MAX_INSTANCES, autoCubes.length + manualAnimCubes.length)

  useEffect(() => {
    const mesh = instancedMeshRef.current
    if (!mesh) return

    let idx = 0

    for (let i = 0; i < autoCubes.length && idx < MAX_INSTANCES; i++, idx++) {
      const cube = autoCubes[i]
      dummyObj.position.set(cube.position[0], cube.position[1], cube.position[2])
      dummyObj.rotation.set(cube.rotation[0], cube.rotation[1], cube.rotation[2])
      const s = cube.scale * (0.85 + 0.15 * transitionT)
      dummyObj.scale.setScalar(s)
      dummyObj.updateMatrix()
      mesh.setMatrixAt(idx, dummyObj.matrix)

      const opacity = cube.opacity
      const baseColor = buildColor(cube.color, opacity)
      const layerBoost = 1 + cube.layer * 0.015
      baseColor.multiplyScalar(Math.min(1.2, layerBoost))
      mesh.setColorAt(idx, baseColor)
    }

    for (let i = 0; i < manualAnimCubes.length && idx < MAX_INSTANCES; i++, idx++) {
      const m = manualAnimCubes[i]
      dummyObj.position.set(m.pos[0], m.pos[1], m.pos[2])
      dummyObj.rotation.set(0, 0, 0)
      dummyObj.scale.setScalar(m.scale)
      dummyObj.updateMatrix()
      mesh.setMatrixAt(idx, dummyObj.matrix)

      const color = new THREE.Color(m.color)
      color.multiplyScalar(1.1)
      mesh.setColorAt(idx, color)
    }

    for (let i = idx; i < MAX_INSTANCES; i++) {
      dummyObj.position.set(0, -1000, 0)
      dummyObj.scale.setScalar(0.0001)
      dummyObj.updateMatrix()
      mesh.setMatrixAt(i, dummyObj.matrix)
      mesh.setColorAt(i, new THREE.Color(0, 0, 0))
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = MAX_INSTANCES
  }, [autoCubes, manualAnimCubes, dummyObj, transitionT])

  const emissiveCubes = useMemo(() => {
    return autoCubes
      .map((c, i) => ({ cube: c, index: i }))
      .filter(({ cube }) => cube.layer >= 4)
      .slice(-80)
  }, [autoCubes])

  return (
    <group>
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, MAX_INSTANCES]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          metalness={0.25}
          roughness={0.35}
          emissiveIntensity={0.12}
          transparent
          opacity={0.98}
          depthWrite
        />
      </instancedMesh>

      {emissiveCubes.map(({ cube, index }) => (
        <mesh
          key={`glow-${cube.id}`}
          position={[cube.position[0], cube.position[1], cube.position[2]]}
          rotation={[cube.rotation[0], cube.rotation[1], cube.rotation[2]]}
          scale={cube.scale * 1.08}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={cube.color}
            transparent
            opacity={0.06 + 0.02 * (cube.layer % 3)}
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {manualAnimCubes.map((m, i) => (
        <mesh
          key={`halo-${i}-${m.pos[0].toFixed(2)}`}
          position={[m.pos[0], m.pos[1], m.pos[2]]}
          scale={m.scale * 2.4}
        >
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color={m.color}
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
