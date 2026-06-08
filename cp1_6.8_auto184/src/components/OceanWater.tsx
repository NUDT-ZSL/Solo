import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float wave1 = sin(pos.x * 0.8 + uTime * 0.6) * 0.3;
    float wave2 = sin(pos.y * 1.2 + uTime * 0.4) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 0.5 + uTime * 0.8) * 0.15;
    float wave4 = sin(pos.x * 2.0 + pos.y * 1.5 + uTime * 1.2) * 0.08;
    float wave5 = sin(pos.x * 3.0 - pos.y * 2.0 + uTime * 1.5) * 0.04;

    float elevation = wave1 + wave2 + wave3 + wave4 + wave5;
    pos.z += elevation;

    vElevation = elevation;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vec3 shallow = vec3(0.529, 0.808, 0.922);
    vec3 deep = vec3(0.102, 0.212, 0.365);

    float distFromCenter = length(vUv - 0.5) * 2.0;
    float depth = smoothstep(0.0, 1.0, distFromCenter);

    vec3 color = mix(deep, shallow, depth);

    float foam = smoothstep(0.45, 0.65, vElevation);
    vec3 foamColor = vec3(0.85, 0.92, 0.95);
    color = mix(color, foamColor, foam * 0.5);

    float specular = pow(max(0.0, vElevation * 2.0), 3.0) * 0.3;
    color += vec3(specular);

    float metallic = 0.08 + 0.05 * sin(uTime * 0.3 + vUv.x * 3.0);
    color = mix(color, color * 1.3, metallic);

    gl_FragColor = vec4(color, 0.92);
  }
`;

export default function OceanWater() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 20, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0.0 },
        }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
