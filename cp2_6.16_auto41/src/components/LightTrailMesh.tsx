import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LightTrailManager } from '../modules/particleSystem/LightTrailManager'

export interface LightTrailMeshHandle {
  addParticle: (position: THREE.Vector3) => void
  clear: () => void
}

interface LightTrailMeshProps {
  maxCount?: number
  lifetime?: number
}

const vertexShader = `
  attribute float size;
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying float vAlpha;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.15, dist);
    float glow = smoothstep(0.5, 0.0, dist) * 0.6;
    vec3 coreColor = vec3(1.0, 1.0, 1.0);
    vec3 glowColor = vec3(0.0, 0.9, 1.0);
    vec3 finalColor = mix(glowColor, coreColor, core);
    float alpha = (core + glow) * vAlpha;
    gl_FragColor = vec4(finalColor, alpha);
  }
`

const LightTrailMesh = forwardRef<LightTrailMeshHandle, LightTrailMeshProps>(
  ({ maxCount = 800, lifetime = 3 }, ref) => {
    const pointsRef = useRef<THREE.Points>(null)
    const trailManagerRef = useRef<LightTrailManager | null>(null)

    const { geometry, material } = useMemo(() => {
      const manager = new LightTrailManager(maxCount, lifetime, 6)
      trailManagerRef.current = manager

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(manager.getPositions(), 3))
      geo.setAttribute('color', new THREE.BufferAttribute(manager.getColors(), 3))
      geo.setAttribute('size', new THREE.BufferAttribute(manager.getSizes(), 1))
      geo.setAttribute('alpha', new THREE.BufferAttribute(manager.getAlphas(), 1))

      const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })

      return { geometry: geo, material: mat }
    }, [maxCount, lifetime])

    useImperativeHandle(ref, () => ({
      addParticle: (position: THREE.Vector3) => {
        if (trailManagerRef.current) {
          trailManagerRef.current.addParticle(position)
        }
      },
      clear: () => {
        if (trailManagerRef.current) {
          trailManagerRef.current.clear()
        }
      }
    }))

    useFrame((_, delta) => {
      if (!trailManagerRef.current || !pointsRef.current) return

      trailManagerRef.current.update(delta)

      const positionAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const sizeAttr = pointsRef.current.geometry.getAttribute('size') as THREE.BufferAttribute
      const alphaAttr = pointsRef.current.geometry.getAttribute('alpha') as THREE.BufferAttribute

      positionAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
      alphaAttr.needsUpdate = true
    })

    return (
      <points ref={pointsRef} geometry={geometry} material={material} />
    )
  }
)

LightTrailMesh.displayName = 'LightTrailMesh'

export default LightTrailMesh
