import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function SkyGradient() {
  const shaderRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), [])

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      float t = vUv.y;
      vec3 topColor = vec3(0.35, 0.1, 0.55);
      vec3 midColor = vec3(0.65, 0.2, 0.5);
      vec3 botColor = vec3(0.9, 0.45, 0.2);
      vec3 color = mix(botColor, midColor, smoothstep(0.0, 0.5, t));
      color = mix(color, topColor, smoothstep(0.4, 1.0, t));
      float shimmer = sin(uTime * 0.3 + vUv.y * 6.28) * 0.02;
      color += shimmer;
      gl_FragColor = vec4(color, 1.0);
    }
  `

  useFrame((_, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <mesh renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

function AmbientParticles() {
  const meshRef = useRef<THREE.Points>(null)
  const count = 800

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = Math.random() * 20 + 2
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
      vel[i * 3] = (Math.random() - 0.5) * 0.02
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }
    return [pos, vel]
  }, [])

  useFrame(() => {
    if (!meshRef.current) return
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3]
      arr[i * 3 + 1] += velocities[i * 3 + 1]
      arr[i * 3 + 2] += velocities[i * 3 + 2]
      if (Math.abs(arr[i * 3]) > 40) velocities[i * 3] *= -1
      if (arr[i * 3 + 1] > 22 || arr[i * 3 + 1] < 2) velocities[i * 3 + 1] *= -1
      if (Math.abs(arr[i * 3 + 2]) > 40) velocities[i * 3 + 2] *= -1
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffcc88"
        size={0.15}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

export function SceneManager() {
  return (
    <>
      <SkyGradient />
      <fog attach="fog" args={['#3a1545', 30, 80]} />
      <ambientLight intensity={0.3} color="#c8a0e0" />
      <directionalLight
        position={[10, 20, 5]}
        intensity={0.8}
        color="#ffd4a8"
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#e080c0" distance={60} />
      <pointLight position={[10, 5, 10]} intensity={0.4} color="#80c0ff" distance={50} />
      <AmbientParticles />
    </>
  )
}
