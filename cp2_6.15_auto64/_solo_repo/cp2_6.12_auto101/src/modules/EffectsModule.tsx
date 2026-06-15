import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppContext } from '../App'
import {
  DebrisParticle,
  createDebrisParticles,
  updateDebrisParticle,
  getDebrisColor,
} from '../lib/galaxyUtils'

const DEBRIS_COUNT = 100

export default function EffectsModule() {
  const { supernovaPosition } = useAppContext()

  const debrisRef = useRef<DebrisParticle[]>([])
  const activeRef = useRef(false)
  const geomRef = useRef<THREE.BufferGeometry>(null!)

  const initialPositions = useMemo(() => new Float32Array(DEBRIS_COUNT * 3), [])
  const initialColors = useMemo(() => new Float32Array(DEBRIS_COUNT * 3), [])
  const initialSizes = useMemo(() => new Float32Array(DEBRIS_COUNT), [])

  useMemo(() => {
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      initialColors[i * 3] = 1
      initialColors[i * 3 + 1] = 1
      initialColors[i * 3 + 2] = 1
      initialSizes[i] = 0
    }
  }, [initialColors, initialSizes])

  useFrame((_state, delta) => {
    if (supernovaPosition && !activeRef.current) {
      debrisRef.current = createDebrisParticles(supernovaPosition, DEBRIS_COUNT)
      activeRef.current = true
    }

    if (!activeRef.current || debrisRef.current.length === 0) return

    const geom = geomRef.current
    if (!geom) return

    const posAttr = geom.attributes.position as THREE.BufferAttribute
    const colAttr = geom.attributes.color as THREE.BufferAttribute
    const sizeAttr = geom.attributes.size as THREE.BufferAttribute
    if (!posAttr || !colAttr || !sizeAttr) return

    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array
    const sizeArr = sizeAttr.array as Float32Array

    let allDead = true
    for (let i = 0; i < debrisRef.current.length; i++) {
      const d = debrisRef.current[i]
      if (d.life >= d.maxLife) {
        sizeArr[i] = 0
        continue
      }
      allDead = false

      const updated = updateDebrisParticle(d, delta)
      debrisRef.current[i] = updated

      posArr[i * 3] = updated.position.x
      posArr[i * 3 + 1] = updated.position.y
      posArr[i * 3 + 2] = updated.position.z

      const lifeRatio = updated.life / updated.maxLife
      const color = getDebrisColor(lifeRatio)
      colArr[i * 3] = color[0] * updated.opacity
      colArr[i * 3 + 1] = color[1] * updated.opacity
      colArr[i * 3 + 2] = color[2] * updated.opacity

      sizeArr[i] = updated.size * updated.opacity * (1 + 0.3 * (1 - lifeRatio))
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true

    if (allDead) {
      activeRef.current = false
      debrisRef.current = []
    }
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          array={initialPositions}
          count={DEBRIS_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={initialColors}
          count={DEBRIS_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={initialSizes}
          count={DEBRIS_COUNT}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.15}
        sizeAttenuation
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
