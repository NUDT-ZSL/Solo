import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CloudSystemProps {
  speed: number
  density: number
}

function CloudParticleField({ speed, density }: CloudSystemProps) {
  const meshRef = useRef<THREE.Points>(null)
  const baseCount = 3000
  const count = Math.floor(baseCount * density)

  const [positions, sizes, offsets] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const sz = new Float32Array(count)
    const off = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100
      pos[i * 3 + 1] = Math.random() * 3 + 1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100
      sz[i] = Math.random() * 2.0 + 0.5
      off[i] = Math.random() * Math.PI * 2
    }
    return [pos, sz, off]
  }, [count])

  const shaderRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: speed },
  }), [])

  useFrame((_, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value += delta * speed
      shaderRef.current.uniforms.uSpeed.value = speed
    }
    if (!meshRef.current) return
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(offsets[i] + shaderRef.current!.uniforms.uTime.value * 0.2) * 0.01 * speed
      arr[i * 3 + 1] = positions[i * 3 + 1] + Math.sin(offsets[i] + shaderRef.current!.uniforms.uTime.value * 0.5) * 0.3
      arr[i * 3 + 2] += Math.cos(offsets[i] + shaderRef.current!.uniforms.uTime.value * 0.15) * 0.01 * speed
      if (arr[i * 3] > 50) arr[i * 3] = -50
      if (arr[i * 3] < -50) arr[i * 3] = 50
      if (arr[i * 3 + 2] > 50) arr[i * 3 + 2] = -50
      if (arr[i * 3 + 2] < -50) arr[i * 3 + 2] = 50
    }
    posAttr.needsUpdate = true
  })

  const vertexShader = `
    attribute float aSize;
    attribute float aOffset;
    uniform float uTime;
    uniform float uSpeed;
    varying float vAlpha;
    void main() {
      vec3 pos = position;
      pos.y += sin(aOffset + uTime * 0.5) * 0.5;
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = aSize * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
      vAlpha = 0.15 + 0.1 * sin(aOffset + uTime);
    }
  `

  const fragmentShader = `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
      vec3 color = mix(vec3(0.85, 0.7, 0.95), vec3(1.0, 0.9, 0.8), gl_PointCoord.y);
      gl_FragColor = vec4(color, alpha);
    }
  `

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={count} itemSize={1} />
        <bufferAttribute attach="attributes-aOffset" array={offsets} count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function CloudCluster({ position, scale }: { position: [number, number, number]; scale: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<THREE.Mesh[]>([])

  const blobs = useMemo(() => {
    const result: { pos: [number, number, number]; s: number; off: number }[] = []
    const n = 5 + Math.floor(Math.random() * 4)
    for (let i = 0; i < n; i++) {
      result.push({
        pos: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 4],
        s: 1 + Math.random() * 2,
        off: Math.random() * Math.PI * 2,
      })
    }
    return result
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.3 + scale) * 0.3
    meshRefs.current.forEach((mesh, i) => {
      if (mesh) {
        const blob = blobs[i]
        mesh.position.y = blob.pos[1] + Math.sin(state.clock.elapsedTime * 0.2 + blob.off) * 0.2
      }
    })
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {blobs.map((blob, i) => (
        <mesh
          key={i}
          ref={el => { if (el) meshRefs.current[i] = el }}
          position={blob.pos}
          scale={blob.s}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#d4b8e8"
            transparent
            opacity={0.18}
            roughness={1}
            emissive="#9060a0"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
    </group>
  )
}

export function CloudSystem({ speed, density }: CloudSystemProps) {
  const clusters = useMemo(() => {
    const result: { pos: [number, number, number]; s: number }[] = []
    for (let i = 0; i < 20; i++) {
      result.push({
        pos: [(Math.random() - 0.5) * 80, Math.random() * 2 + 1, (Math.random() - 0.5) * 80],
        s: 0.8 + Math.random() * 1.5,
      })
    }
    return result
  }, [])

  return (
    <>
      <CloudParticleField speed={speed} density={density} />
      {clusters.map((c, i) => (
        <CloudCluster key={i} position={c.pos} scale={c.s} />
      ))}
    </>
  )
}
