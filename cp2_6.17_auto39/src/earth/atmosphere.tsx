import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/geoMath';

export function Atmosphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const shader = useMemo(
    () => ({
      uniforms: {
        glowColor: { value: new THREE.Color(0x44aaff) },
        viewVector: { value: new THREE.Vector3(0, 0, 1) },
        c: { value: 0.4 },
        p: { value: 4.5 }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.8);
        }
      `
    }),
    []
  );

  useFrame(({ camera }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        meshRef.current?.position || new THREE.Vector3()
      );
    }
  });

  return (
    <>
      <mesh ref={meshRef} scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={shader.uniforms}
          vertexShader={shader.vertexShader}
          fragmentShader={shader.fragmentShader}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.01, 64, 64]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </>
  );
}
