import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

const TERRAIN_SIZE = 40
const TERRAIN_SEGMENTS = 64
const PEAK_HEIGHT = 9
const ROTATION_SPEED = 0.02

const COLOR_DEEP = new THREE.Color('#0a1e3d')
const COLOR_PEAK = new THREE.Color('#1a4a4a')
const SKY_TOP = new THREE.Color('#0a0e27')
const SKY_HORIZON = new THREE.Color('#2d3a4a')

const skyVertexShader = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragmentShader = `
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  varying vec3 vWorldPos;
  void main() {
    float h = normalize(vWorldPos).y;
    float t = clamp(h, 0.0, 1.0);
    vec3 col = mix(uHorizonColor, uTopColor, t);
    gl_FragColor = vec4(col, 1.0);
  }
`

function ValleyTerrain() {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS
    )
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position as THREE.BufferAttribute
    const count = pos.count
    const colors = new Float32Array(count * 3)
    const halfSize = TERRAIN_SIZE / 2

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      const dist = Math.sqrt(x * x + z * z)
      const normDist = Math.min(dist / halfSize, 1)

      const bowl = normDist * normDist * PEAK_HEIGHT
      const ridge =
        Math.sin(x * 0.8 + z * 0.3) * 1.8 * normDist
      const detail =
        Math.sin(x * 2.3) * Math.cos(z * 1.9) * 0.6 * normDist
      const micro = Math.sin(x * 4.1 + z * 3.7) * 0.2 * normDist

      const height = bowl + ridge + detail + micro
      pos.setY(i, height)

      const t = Math.min(height / PEAK_HEIGHT, 1)
      const color = COLOR_DEEP.clone().lerp(COLOR_PEAK, t)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * ROTATION_SPEED
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial vertexColors flatShading />
    </mesh>
  )
}

function SkyDome() {
  const uniforms = useMemo(
    () => ({
      uTopColor: { value: SKY_TOP },
      uHorizonColor: { value: SKY_HORIZON },
    }),
    []
  )

  return (
    <mesh>
      <sphereGeometry args={[80, 32, 32]} />
      <shaderMaterial
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

function SceneFog() {
  const { scene } = useThree()
  useMemo(() => {
    scene.fog = new THREE.FogExp2('#0a1525', 0.012)
  }, [scene])
  return null
}

export function ValleyScene() {
  return (
    <>
      <SceneFog />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 5]} intensity={0.6} color="#8899bb" />
      <pointLight position={[0, 2, 0]} intensity={0.8} color="#1a4a6a" distance={20} />
      <ValleyTerrain />
      <SkyDome />
      <Stars radius={60} depth={40} count={1500} factor={3} saturation={0.2} fade speed={0.5} />
    </>
  )
}
