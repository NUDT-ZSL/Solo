import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ParticleCloud, ThemeColors } from '../modules/particleSystem/ParticleCloud'

interface ParticleCloudMeshProps {
  count: number
  theme: ThemeColors
}

const vertexShader = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist);
    float glow = smoothstep(0.5, 0.2, dist) * 0.5;
    vec3 finalColor = vColor * (1.0 + glow);
    gl_FragColor = vec4(finalColor, alpha);
  }
`

export function ParticleCloudMesh({ count, theme }: ParticleCloudMeshProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const particleCloudRef = useRef<ParticleCloud | null>(null)
  const elapsedTimeRef = useRef(0)

  const { geometry, material } = useMemo(() => {
    const cloud = new ParticleCloud(count, 150, theme)
    particleCloudRef.current = cloud

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(cloud.getPositions(), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(cloud.getColors(), 3))
    geo.setAttribute('size', new THREE.BufferAttribute(cloud.getSizes(), 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    return { geometry: geo, material: mat }
  }, [])

  useEffect(() => {
    materialRef.current = material
  }, [material])

  useEffect(() => {
    if (particleCloudRef.current) {
      particleCloudRef.current.setTheme(theme)
      const colors = particleCloudRef.current.getColors()
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute
      colorAttr.array = colors
      colorAttr.needsUpdate = true
    }
  }, [theme, geometry])

  useEffect(() => {
    if (particleCloudRef.current) {
      particleCloudRef.current.setCount(count)

      const positions = particleCloudRef.current.getPositions()
      const colors = particleCloudRef.current.getColors()
      const sizes = particleCloudRef.current.getSizes()

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    }
  }, [count, geometry])

  useFrame((_, delta) => {
    if (!particleCloudRef.current || !pointsRef.current) return

    elapsedTimeRef.current += delta
    particleCloudRef.current.update(delta, elapsedTimeRef.current)

    const positionAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    positionAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  )
}

export default ParticleCloudMesh
