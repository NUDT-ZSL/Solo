import { useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppContext } from '../App'
import {
  getStarColorRGB,
  easeInOutCubic,
  getLodLevel,
  getLodSizeFactor,
} from '../lib/galaxyUtils'

const STARS_PER_ARM = 2000
const MAX_RADIUS = 25
const TWIST_FACTOR = 0.6
const THICKNESS = 1.5
const BACKGROUND_STARS = 500
const NEBULA_PARTICLES_PER_CLOUD = 1000

const NEBULA_COLORS: [number, number, number][] = [
  [0.8, 0.2, 0.5],
  [0.2, 0.7, 0.6],
  [0.9, 0.7, 0.2],
]

function generateStarPositions(
  armCount: number,
  starsPerArm: number
): {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  twinkleOffsets: Float32Array
  twinkleSpeeds: Float32Array
  radialDistances: Float32Array
} {
  const totalStars = armCount * starsPerArm
  const positions = new Float32Array(totalStars * 3)
  const colors = new Float32Array(totalStars * 3)
  const sizes = new Float32Array(totalStars)
  const twinkleOffsets = new Float32Array(totalStars)
  const twinkleSpeeds = new Float32Array(totalStars)
  const radialDistances = new Float32Array(totalStars)

  let idx = 0
  for (let arm = 0; arm < armCount; arm++) {
    const armAngle = (arm / armCount) * Math.PI * 2
    for (let i = 0; i < starsPerArm; i++) {
      const t = Math.random()
      const r = t * MAX_RADIUS
      const theta = r * TWIST_FACTOR + armAngle
      const spread = 0.5 + t * 1.5
      const offsetX = (Math.random() - 0.5) * spread
      const offsetZ = (Math.random() - 0.5) * spread
      const heightFactor = 1 - t * 0.8
      const offsetY = (Math.random() - 0.5) * THICKNESS * heightFactor

      const x = r * Math.cos(theta) + offsetX
      const z = r * Math.sin(theta) + offsetZ
      const y = offsetY

      positions[idx * 3] = x
      positions[idx * 3 + 1] = y
      positions[idx * 3 + 2] = z

      const actualDist = Math.sqrt(x * x + y * y + z * z)
      radialDistances[idx] = actualDist

      const color = getStarColorRGB(r, MAX_RADIUS)
      colors[idx * 3] = color[0]
      colors[idx * 3 + 1] = color[1]
      colors[idx * 3 + 2] = color[2]

      sizes[idx] = 0.05 + Math.random() * 0.2
      twinkleOffsets[idx] = Math.random() * Math.PI * 2
      twinkleSpeeds[idx] = (Math.PI * 2) / (0.5 + Math.random() * 1.5)
      idx++
    }
  }

  return { positions, colors, sizes, twinkleOffsets, twinkleSpeeds, radialDistances }
}

function generateBackgroundStars(): {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
} {
  const count = BACKGROUND_STARS
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 80 + Math.random() * 120
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    const gray = 0.5 + Math.random() * 0.3
    colors[i * 3] = gray
    colors[i * 3 + 1] = gray
    colors[i * 3 + 2] = gray + 0.05

    sizes[i] = 0.02
  }

  return { positions, colors, sizes }
}

function generateNebulaClouds(): {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  cloudOffsets: Float32Array
  pulseSpeeds: Float32Array
  rotationAxes: Float32Array
} {
  const totalCount = 3 * NEBULA_PARTICLES_PER_CLOUD
  const positions = new Float32Array(totalCount * 3)
  const colors = new Float32Array(totalCount * 3)
  const sizes = new Float32Array(totalCount)
  const cloudOffsets = new Float32Array(totalCount)
  const pulseSpeeds = new Float32Array(totalCount)
  const rotationAxes = new Float32Array(totalCount * 3)

  const cloudCenters: [number, number, number][] = [
    [8, 1, -6],
    [-10, -0.5, 8],
    [4, -1, 12],
  ]

  let idx = 0
  for (let cloud = 0; cloud < 3; cloud++) {
    const center = cloudCenters[cloud]
    const baseColor = NEBULA_COLORS[cloud]
    for (let i = 0; i < NEBULA_PARTICLES_PER_CLOUD; i++) {
      const ox = (Math.random() - 0.5) * 6
      const oy = (Math.random() - 0.5) * 3
      const oz = (Math.random() - 0.5) * 6
      positions[idx * 3] = center[0] + ox
      positions[idx * 3 + 1] = center[1] + oy
      positions[idx * 3 + 2] = center[2] + oz

      const brightness = 0.5 + Math.random() * 0.5
      colors[idx * 3] = baseColor[0] * brightness
      colors[idx * 3 + 1] = baseColor[1] * brightness
      colors[idx * 3 + 2] = baseColor[2] * brightness

      sizes[idx] = 0.1 + Math.random() * 0.7
      cloudOffsets[idx] = cloud
      pulseSpeeds[idx] = (Math.PI * 2) / (4 + Math.random() * 4)

      const axisAngle = Math.random() * Math.PI * 2
      const axisTilt = (Math.random() - 0.5) * 0.3
      rotationAxes[idx * 3] = Math.cos(axisAngle) * Math.cos(axisTilt)
      rotationAxes[idx * 3 + 1] = Math.sin(axisTilt)
      rotationAxes[idx * 3 + 2] = Math.sin(axisAngle) * Math.cos(axisTilt)

      idx++
    }
  }

  return { positions, colors, sizes, cloudOffsets, pulseSpeeds, rotationAxes }
}

export interface GalaxyModuleHandle {
  getRandomStar: () => { position: THREE.Vector3; index: number } | null
  highlightStar: (index: number) => void
  getStarPositions: () => Float32Array
}

const GalaxyModule = forwardRef<GalaxyModuleHandle>((_props, ref) => {
  const { galaxyParams, setShipState } = useAppContext()
  const groupRef = useRef<THREE.Group>(null!)

  const starGeomRef = useRef<THREE.BufferGeometry>(null!)
  const starMatRef = useRef<THREE.PointsMaterial>(null!)
  const nebulaGeomRef = useRef<THREE.BufferGeometry>(null!)
  const nebulaMatRef = useRef<THREE.PointsMaterial>(null!)
  const bgGeomRef = useRef<THREE.BufferGeometry>(null!)
  const coreRef = useRef<THREE.Mesh>(null!)

  const highlightIndexRef = useRef<number>(-1)
  const highlightTimerRef = useRef<number>(0)

  const transitionRef = useRef<{
    active: boolean
    startTime: number
    duration: number
    oldPositions: Float32Array | null
    oldColors: Float32Array | null
    oldSizes: Float32Array | null
    newPositions: Float32Array | null
    newColors: Float32Array | null
    newSizes: Float32Array | null
  }>({
    active: false,
    startTime: 0,
    duration: 0.5,
    oldPositions: null,
    oldColors: null,
    oldSizes: null,
    newPositions: null,
    newColors: null,
    newSizes: null,
  })

  const currentArmCountRef = useRef(galaxyParams.armCount)
  const lastScaleRef = useRef(galaxyParams.particleScale)
  const radialDistancesRef = useRef<Float32Array>(new Float32Array(0))
  const twinkleOffsetsRef = useRef<Float32Array>(new Float32Array(0))
  const twinkleSpeedsRef = useRef<Float32Array>(new Float32Array(0))
  const baseSizesRef = useRef<Float32Array>(new Float32Array(0))
  const baseColorsRef = useRef<Float32Array>(new Float32Array(0))
  const cameraPositionRef = useRef(new THREE.Vector3())

  const initStars = useMemo(() => {
    return generateStarPositions(galaxyParams.armCount, STARS_PER_ARM)
  }, [])

  const bgStars = useMemo(() => generateBackgroundStars(), [])
  const nebulaClouds = useMemo(() => generateNebulaClouds(), [])

  useEffect(() => {
    radialDistancesRef.current = initStars.radialDistances
    twinkleOffsetsRef.current = initStars.twinkleOffsets
    twinkleSpeedsRef.current = initStars.twinkleSpeeds
    baseSizesRef.current = initStars.sizes
    baseColorsRef.current = initStars.colors
    currentArmCountRef.current = galaxyParams.armCount
  }, [initStars, galaxyParams.armCount])

  useEffect(() => {
    if (galaxyParams.armCount === currentArmCountRef.current) return

    const oldPos = starGeomRef.current.attributes.position?.array as Float32Array | undefined
    const oldCol = starGeomRef.current.attributes.color?.array as Float32Array | undefined
    const oldSz = starGeomRef.current.attributes.size?.array as Float32Array | undefined

    const newStarData = generateStarPositions(galaxyParams.armCount, STARS_PER_ARM)

    const maxCount = Math.max(
      oldPos ? oldPos.length / 3 : 0,
      newStarData.positions.length / 3
    )

    const transOldPos = new Float32Array(maxCount * 3)
    const transOldCol = new Float32Array(maxCount * 3)
    const transOldSz = new Float32Array(maxCount)
    const transNewPos = new Float32Array(maxCount * 3)
    const transNewCol = new Float32Array(maxCount * 3)
    const transNewSz = new Float32Array(maxCount)

    if (oldPos) transOldPos.set(oldPos.subarray(0, Math.min(oldPos.length, maxCount * 3)))
    if (oldCol) transOldCol.set(oldCol.subarray(0, Math.min(oldCol.length, maxCount * 3)))
    if (oldSz) transOldSz.set(oldSz.subarray(0, Math.min(oldSz.length, maxCount)))

    transNewPos.set(newStarData.positions.subarray(0, Math.min(newStarData.positions.length, maxCount * 3)))
    transNewCol.set(newStarData.colors.subarray(0, Math.min(newStarData.colors.length, maxCount * 3)))
    transNewSz.set(newStarData.sizes.subarray(0, Math.min(newStarData.sizes.length, maxCount)))

    const newPositions = new Float32Array(maxCount * 3)
    const newColors = new Float32Array(maxCount * 3)
    const newSizes = new Float32Array(maxCount)
    newPositions.set(transOldPos)
    newColors.set(transOldCol)
    newSizes.set(transOldSz)

    starGeomRef.current.setAttribute('position', new THREE.BufferAttribute(newPositions, 3))
    starGeomRef.current.setAttribute('color', new THREE.BufferAttribute(newColors, 3))
    starGeomRef.current.setAttribute('size', new THREE.BufferAttribute(newSizes, 1))
    starGeomRef.current.attributes.position.needsUpdate = true
    starGeomRef.current.attributes.color.needsUpdate = true
    starGeomRef.current.attributes.size.needsUpdate = true
    starGeomRef.current.computeBoundingSphere()

    radialDistancesRef.current = newStarData.radialDistances
    twinkleOffsetsRef.current = newStarData.twinkleOffsets
    twinkleSpeedsRef.current = newStarData.twinkleSpeeds
    baseSizesRef.current = newStarData.sizes
    baseColorsRef.current = newStarData.colors

    transitionRef.current = {
      active: true,
      startTime: performance.now() / 1000,
      duration: 0.5,
      oldPositions: transOldPos,
      oldColors: transOldCol,
      oldSizes: transOldSz,
      newPositions: transNewPos,
      newColors: transNewCol,
      newSizes: transNewSz,
    }

    currentArmCountRef.current = galaxyParams.armCount
  }, [galaxyParams.armCount])

  useEffect(() => {
    if (galaxyParams.particleScale !== lastScaleRef.current) {
      lastScaleRef.current = galaxyParams.particleScale
    }
  }, [galaxyParams.particleScale])

  useImperativeHandle(ref, () => ({
    getRandomStar: () => {
      const posAttr = starGeomRef.current.attributes.position
      if (!posAttr) return null
      const count = posAttr.count
      const candidates: number[] = []
      const sizesAttr = starGeomRef.current.attributes.size
      for (let i = 0; i < count; i += 3) {
        if (sizesAttr && (sizesAttr as THREE.BufferAttribute).getX(i) > 0.15) {
          candidates.push(i)
        }
      }
      const pool = candidates.length > 0 ? candidates : Array.from({ length: count }, (_, i) => i)
      const idx = pool[Math.floor(Math.random() * pool.length)]
      return {
        position: new THREE.Vector3(
          posAttr.getX(idx),
          posAttr.getY(idx),
          posAttr.getZ(idx)
        ),
        index: idx,
      }
    },
    highlightStar: (index: number) => {
      highlightIndexRef.current = index
      highlightTimerRef.current = 0.3
    },
    getStarPositions: () => {
      return (starGeomRef.current.attributes.position?.array as Float32Array) || new Float32Array(0)
    },
  }))

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    cameraPositionRef.current.copy(state.camera.position)

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * galaxyParams.rotationSpeed * 0.1
    }

    if (starGeomRef.current) {
      const posAttr = starGeomRef.current.attributes.position as THREE.BufferAttribute
      const colAttr = starGeomRef.current.attributes.color as THREE.BufferAttribute
      const sizeAttr = starGeomRef.current.attributes.size as THREE.BufferAttribute

      if (!posAttr || !colAttr || !sizeAttr) return

      const trans = transitionRef.current
      if (trans.active) {
        const elapsed = time - trans.startTime
        const rawT = Math.min(elapsed / trans.duration, 1)
        const easedT = easeInOutCubic(rawT)

        const posArr = posAttr.array as Float32Array
        const colArr = colAttr.array as Float32Array
        const sizeArr = sizeAttr.array as Float32Array

        const len = posArr.length / 3
        for (let i = 0; i < len; i++) {
          if (trans.oldPositions && trans.newPositions) {
            posArr[i * 3] = trans.oldPositions[i * 3] + (trans.newPositions[i * 3] - trans.oldPositions[i * 3]) * easedT
            posArr[i * 3 + 1] = trans.oldPositions[i * 3 + 1] + (trans.newPositions[i * 3 + 1] - trans.oldPositions[i * 3 + 1]) * easedT
            posArr[i * 3 + 2] = trans.oldPositions[i * 3 + 2] + (trans.newPositions[i * 3 + 2] - trans.oldPositions[i * 3 + 2]) * easedT
          }
          if (trans.oldColors && trans.newColors) {
            colArr[i * 3] = trans.oldColors[i * 3] + (trans.newColors[i * 3] - trans.oldColors[i * 3]) * easedT
            colArr[i * 3 + 1] = trans.oldColors[i * 3 + 1] + (trans.newColors[i * 3 + 1] - trans.oldColors[i * 3 + 1]) * easedT
            colArr[i * 3 + 2] = trans.oldColors[i * 3 + 2] + (trans.newColors[i * 3 + 2] - trans.oldColors[i * 3 + 2]) * easedT
          }
          if (trans.oldSizes && trans.newSizes) {
            sizeArr[i] = trans.oldSizes[i] + (trans.newSizes[i] - trans.oldSizes[i]) * easedT
          }
        }

        posAttr.needsUpdate = true
        colAttr.needsUpdate = true
        sizeAttr.needsUpdate = true

        if (rawT >= 1) {
          trans.active = false
        }
      } else {
        const posArr = posAttr.array as Float32Array
        const colArr = colAttr.array as Float32Array
        const sizeArr = sizeAttr.array as Float32Array
        const count = posArr.length / 3

        for (let i = 0; i < count; i++) {
          const twinkle = 1 + 0.2 * Math.sin(time * twinkleSpeedsRef.current[i] + twinkleOffsetsRef.current[i])
          const scale = galaxyParams.particleScale

          const worldPos = new THREE.Vector3(
            posArr[i * 3],
            posArr[i * 3 + 1],
            posArr[i * 3 + 2]
          )
          if (groupRef.current) {
            worldPos.applyMatrix4(groupRef.current.matrixWorld)
          }
          const dist = worldPos.distanceTo(cameraPositionRef.current)
          const lod = getLodLevel(dist, cameraPositionRef.current)
          const lodFactor = getLodSizeFactor(lod)

          let sizeMultiplier = twinkle * scale * lodFactor

          if (highlightIndexRef.current === i && highlightTimerRef.current > 0) {
            sizeMultiplier *= 1 + 4 * (highlightTimerRef.current / 0.3)
            colArr[i * 3] = 1
            colArr[i * 3 + 1] = 1
            colArr[i * 3 + 2] = 1
          } else if (baseColorsRef.current.length > i * 3 + 2) {
            colArr[i * 3] = baseColorsRef.current[i * 3] * twinkle
            colArr[i * 3 + 1] = baseColorsRef.current[i * 3 + 1] * twinkle
            colArr[i * 3 + 2] = baseColorsRef.current[i * 3 + 2] * twinkle
          }

          sizeArr[i] = (baseSizesRef.current[i] || 0.1) * sizeMultiplier
        }

        if (highlightTimerRef.current > 0) {
          highlightTimerRef.current -= delta
          if (highlightTimerRef.current <= 0) {
            highlightIndexRef.current = -1
          }
        }

        colAttr.needsUpdate = true
        sizeAttr.needsUpdate = true
      }
    }

    if (nebulaGeomRef.current) {
      const sizeAttr = nebulaGeomRef.current.attributes.size as THREE.BufferAttribute
      if (sizeAttr) {
        const arr = sizeAttr.array as Float32Array
        for (let i = 0; i < arr.length; i++) {
          const pulse = 1 + 0.05 * Math.sin(time * nebulaClouds.pulseSpeeds[i])
          arr[i] = (0.1 + (i % NEBULA_PARTICLES_PER_CLOUD) / NEBULA_PARTICLES_PER_CLOUD * 0.7) * pulse * galaxyParams.particleScale
        }
        sizeAttr.needsUpdate = true
      }
    }

    if (coreRef.current) {
      const pulse = 1 + 0.1 * Math.sin(time * 2)
      coreRef.current.scale.setScalar(pulse)
    }

    if (state.camera.position) {
      setShipState({
        position: {
          x: parseFloat(state.camera.position.x.toFixed(2)),
          y: parseFloat(state.camera.position.y.toFixed(2)),
          z: parseFloat(state.camera.position.z.toFixed(2)),
        },
        speed: 0,
      })
    }
  })

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry ref={starGeomRef}>
          <bufferAttribute
            attach="attributes-position"
            array={initStars.positions}
            count={initStars.positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={initStars.colors}
            count={initStars.colors.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            array={initStars.sizes}
            count={initStars.sizes.length}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={starMatRef}
          vertexColors
          size={0.2}
          sizeAttenuation
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <mesh ref={coreRef} position={[0, 0, 0]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(1, 0.95, 0.85)}
          transparent
          opacity={0.8}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={2} color={new THREE.Color(1, 0.95, 0.85)} distance={30} />

      <points frustumCulled={false}>
        <bufferGeometry ref={bgGeomRef}>
          <bufferAttribute
            attach="attributes-position"
            array={bgStars.positions}
            count={bgStars.positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={bgStars.colors}
            count={bgStars.colors.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={0.02}
          sizeAttenuation
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <points frustumCulled={false}>
        <bufferGeometry ref={nebulaGeomRef}>
          <bufferAttribute
            attach="attributes-position"
            array={nebulaClouds.positions}
            count={nebulaClouds.positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={nebulaClouds.colors}
            count={nebulaClouds.colors.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            array={nebulaClouds.sizes}
            count={nebulaClouds.sizes.length}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={nebulaMatRef}
          vertexColors
          size={0.5}
          sizeAttenuation
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
})

GalaxyModule.displayName = 'GalaxyModule'
export default GalaxyModule
