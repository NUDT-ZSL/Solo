import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, Annotation } from '../../store';

interface LabelProps {
  annotation: Annotation;
  onDelete: (id: number) => void;
}

function AnnotationLabel({ annotation, onDelete }: LabelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);

  useFrame(() => {
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + 0.15);
      if (groupRef.current) {
        const s = scaleRef.current;
        groupRef.current.scale.set(s, s, s);
      }
    }
  });

  return (
    <group ref={groupRef} position={[annotation.x, annotation.y, annotation.z]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              0, 0, 0,
              15, 25, 10,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#546e7a" transparent opacity={0.8} linewidth={1} />
      </line>

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial
          color="#ff9800"
          emissive="#ff9800"
          emissiveIntensity={0.4}
        />
      </mesh>

      <Html
        position={[15, 25, 10]}
        center
        style={{
          pointerEvents: 'auto',
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 12,
            color: '#263238',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: 'sans-serif',
            border: '1px solid #e0e0e0',
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{annotation.text}</div>
          <div style={{ fontSize: 10, color: '#78909c' }}>{annotation.lithology}</div>
        </div>
      </Html>
    </group>
  );
}

export default function AnnotationLabels() {
  const annotations = useStore((s) => s.annotations);
  const removeAnnotation = useStore((s) => s.removeAnnotation);

  return (
    <group>
      {annotations.map((a) => (
        <AnnotationLabel key={a.id} annotation={a} onDelete={removeAnnotation} />
      ))}
    </group>
  );
}
