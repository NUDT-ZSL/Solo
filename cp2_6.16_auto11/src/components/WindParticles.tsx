import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  generateParticles,
  updateParticles,
  latLonToVec3,
  speedToColor,
  getAverageSpeed,
  type ParticleData,
} from '@/sim/WindSimulator'
import { getTangentVectors } from '@/controls/Interaction'
import { useStore } from '@/store/useStore'

const PARTICLE_COUNT = 2000
const REGENERATE_INTERVAL = 2

const particleVertexShader = `
  attribute vec3 instanceColor;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = instanceColor;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float dist = length(mvPosition.xyz);
    vOpacity = smoothstep(8.0, 3.0, dist);
  }
`

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    gl_FragColor = vec4(vColor, 0.85 * vOpacity);
  }
`

export default function WindParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const particlesRef = useRef<ParticleData[]>([])
  const seedRef = useRef(Date.now())
  const lastRegenRef = useRef(0)
  const setAvgWindSpeed = useStore((s) => s.setAvgWindSpeed)

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  )

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.08, 0.02)
    geo.translate(0.04, 0, 0)
    return geo
  }, [])

  const initParticles = useCallback((seed: number) => {
    particlesRef.current = generateParticles(PARTICLE_COUNT, seed)
    if (meshRef.current) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particlesRef.current[i]
        const pos = latLonToVec3(p.lat, p.lon)
        dummy.position.copy(pos)
        const normal = pos.clone().normalize()
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        tempColor.copy(speedToColor(p.speed))
        meshRef.current.setColorAt(i, tempColor)
      }
      meshRef.current.instanceMatrix.needsUpdate = true
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true
      }
    }
  }, [dummy, tempColor])

  useFrame((state) => {
    if (!meshRef.current) return

    const elapsed = state.clock.getElapsedTime()
    if (particlesRef.current.length === 0) {
      seedRef.current = Date.now()
      lastRegenRef.current = elapsed
      initParticles(seedRef.current)
      return
    }

    if (elapsed - lastRegenRef.current > REGENERATE_INTERVAL) {
      seedRef.current = Date.now()
      lastRegenRef.current = elapsed
    }

    const delta = Math.min(state.clock.getDelta(), 0.05)
    particlesRef.current = updateParticles(particlesRef.current, delta, seedRef.current)

    const avgSpeed = getAverageSpeed(particlesRef.current)
    setAvgWindSpeed(avgSpeed)

    for (let i = 0; i < particlesRef.current.length; i++) {
      const p = particlesRef.current[i]
      const pos = latLonToVec3(p.lat, p.lon)
      dummy.position.copy(pos)

      const normal = pos.clone().normalize()
      const { east, north } = getTangentVectors(pos)
      const windDir = east.clone().multiplyScalar(p.u).add(north.clone().multiplyScalar(p.v))
      if (windDir.lengthSq() > 0.0001) {
        windDir.normalize()
        const xAxis = windDir
        const zAxis = normal
        const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize()
        xAxis.crossVectors(yAxis, zAxis).normalize()
        const rotMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
        dummy.quaternion.setFromRotationMatrix(rotMatrix)
      } else {
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
      }

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      tempColor.copy(speedToColor(p.speed))
      meshRef.current.setColorAt(i, tempColor)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={meshRef} args={[geometry, material, PARTICLE_COUNT]} frustumCulled={false} />
    </group>
  )
}
