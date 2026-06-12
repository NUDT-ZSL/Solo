import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 6;

function Spotlight({ 
  light, 
  isSelected,
  onSelect,
}: { 
  light: ReturnType<typeof useStore.getState>['lights'][0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { showLightHelpers } = useStore();

  const color = useMemo(() => new THREE.Color(light.color), [light.color]);

  useFrame(() => {
    if (lightRef.current && targetRef.current) {
      targetRef.current.position.set(...light.target);
      lightRef.current.target = targetRef.current;
    }
  });

  const lightLength = 8;
  const coneRadius = lightLength * Math.tan(light.angle / 2);

  return (
    <group ref={groupRef} position={light.position}>
      {/* Light body - cylinder */}
      <mesh position={[0, -0.15, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Light housing - cone */}
      <mesh position={[0, -0.35, 0]} rotation={[Math.PI, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <coneGeometry args={[0.2, 0.3, 16, 1, true]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Visible light cone */}
      <mesh position={[0, -0.5 - lightLength / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[coneRadius, lightLength, 32, 1, true]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.08} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spotlight */}
      <spotLight
        ref={lightRef}
        color={color}
        intensity={light.intensity}
        angle={light.angle}
        penumbra={light.penumbra}
        distance={lightLength * 1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Target object */}
      <object3D ref={targetRef} position={light.target as any} />

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, -0.15, 0]}>
          <ringGeometry args={[0.15, 0.2, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Light helpers */}
      {showLightHelpers && (
        <>
          {/* Light to target line */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  0, -0.5, 0,
                  light.target[0] - light.position[0],
                  light.target[1] - light.position[1],
                  light.target[2] - light.position[2],
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffff00" />
          </line>

          {/* Light cone boundary */}
          <mesh position={[0, -0.5 - lightLength / 2, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[coneRadius, lightLength, 32, 1, true]} />
            <meshBasicMaterial 
              color="#ffff00" 
              transparent 
              opacity={0.15} 
              side={THREE.DoubleSide}
              wireframe
            />
          </mesh>
        </>
      )}
    </group>
  );
}

export default function LightSystem() {
  const { lights, selectedLightId, selectLight, updateLight } = useStore();
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  return (
    <group>
      {lights.map((light) => (
        <Spotlight
          key={light.id}
          light={light}
          isSelected={selectedLightId === light.id}
          onSelect={() => selectLight(light.id)}
        />
      ))}
    </group>
  );
}
