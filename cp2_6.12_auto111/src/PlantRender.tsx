import { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { usePlantStore } from './store';
import type { PlantNode, FallingParticle, CutEffect } from './types';
import { COLORS } from './types';
import { easeOutQuad } from './utils';

interface GroundProps {
  progress: number;
}

function Ground({ progress }: GroundProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const soilRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (soilRef.current) {
      const targetScale = progress > 0 ? 1 : 0.01;
      soilRef.current.scale.y = THREE.MathUtils.lerp(soilRef.current.scale.y, targetScale * 0.3, 0.1);
      soilRef.current.visible = progress > 0;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6, 12, 12]} />
        <meshStandardMaterial
          color={COLORS.GROUND_GREEN}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <gridHelper
        args={[6, 12, '#558b2f', '#8bc34a']}
        position={[0, 0.001, 0]}
      />

      {progress > 0 && (
        <mesh ref={soilRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 16]} />
          <meshStandardMaterial
            color={COLORS.SOIL_BROWN}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      
      {progress > 0 && (
        <mesh position={[0, 0.15 * easeOutQuad(progress), 0]}>
          <sphereGeometry args={[0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={COLORS.SOIL_BROWN}
            transparent
            opacity={Math.min(1, progress * 2)}
          />
        </mesh>
      )}
    </group>
  );
}

interface BackgroundGradientProps {}

function BackgroundGradient() {
  return (
    <mesh>
      <sphereGeometry args={[50, 32, 32]} />
      <meshBasicMaterial
        side={THREE.BackSide}
        color={'#87ceeb'}
      />
    </mesh>
  );
}

interface PlantNodeRendererProps {
  node: PlantNode;
  parentWorldPosition?: THREE.Vector3;
  parentWorldQuaternion?: THREE.Quaternion;
  onCut?: (nodeId: string, position: [number, number, number]) => void;
  cotyledonProgress: number;
}

function PlantNodeRenderer({
  node,
  parentWorldPosition,
  parentWorldQuaternion,
  onCut,
  cotyledonProgress
}: PlantNodeRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const allNodes = usePlantStore(s => s.plantNodes);
  const currentStage = usePlantStore(s => s.currentStage);
  const isPlanted = usePlantStore(s => s.isPlanted);

  const displayLength = useMemo(() => {
    if (!isPlanted) return 0;
    const baseLength = node.length * (node.growthProgress || 1);
    if (node.type === 'cotyledon') {
      return baseLength * easeOutQuad(Math.min(1, cotyledonProgress));
    }
    return baseLength;
  }, [node.length, node.growthProgress, node.type, cotyledonProgress, isPlanted]);

  const displayScale = useMemo(() => {
    if (!isPlanted) return 0;
    let prog = node.growthProgress || 1;
    if (node.type === 'cotyledon') {
      prog = Math.min(prog, cotyledonProgress);
    }
    return easeOutQuad(Math.min(1, prog));
  }, [node.growthProgress, node.type, cotyledonProgress, isPlanted]);

  const wiltRotation = useMemo(() => {
    if (!node.isWilting || node.type === 'stem') return 0;
    return node.wiltingProgress * 0.4;
  }, [node.isWilting, node.wiltingProgress, node.type]);

  const childrenNodes = useMemo(() => {
    return node.children
      .map(id => allNodes[id])
      .filter(Boolean);
  }, [node.children, allNodes]);

  const canTrim = currentStage >= 1;

  const handlePointerDown = (e: THREE.Event) => {
    if (!canTrim || !onCut || (e as unknown as { button?: number }).button !== 0) return;
    e.stopPropagation();
    const worldPos = new THREE.Vector3();
    if (meshRef.current) {
      meshRef.current.getWorldPosition(worldPos);
    } else if (groupRef.current) {
      groupRef.current.getWorldPosition(worldPos);
    }
    onCut(node.id, [worldPos.x, worldPos.y, worldPos.z]);
  };

  const renderGeometry = () => {
    switch (node.type) {
      case 'stem':
      case 'branch':
        return (
          <mesh
            ref={meshRef}
            position={[0, displayLength / 2, 0]}
            rotation={[0, 0, -wiltRotation]}
            onPointerDown={handlePointerDown}
            onPointerOver={() => canTrim && setHovered(true)}
            onPointerOut={() => setHovered(false)}
            castShadow
          >
            <cylinderGeometry
              args={[node.radius * displayScale, node.radius * displayScale * 1.2, Math.max(0.001, displayLength), 8]}
            />
            <meshStandardMaterial
              color={hovered && canTrim ? '#ffff00' : node.color}
              emissive={hovered && canTrim ? '#ffff00' : '#000000'}
              emissiveIntensity={hovered && canTrim ? 0.3 : 0}
            />
          </mesh>
        );

      case 'leaf':
      case 'cotyledon': {
        const leafLength = node.type === 'cotyledon' ? 0.2 : 0.15;
        const leafWidth = node.type === 'cotyledon' ? 0.08 : 0.1;
        return (
          <group position={[0, 0.05, 0]}>
            <mesh
              ref={meshRef}
              position={[leafLength * 0.4 * displayScale, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[displayScale, displayScale, displayScale]}
              onPointerDown={handlePointerDown}
              onPointerOver={() => canTrim && setHovered(true)}
              onPointerOut={() => setHovered(false)}
              castShadow
            >
              <sphereGeometry args={[1, 16, 8]} />
              <meshStandardMaterial
                color={hovered && canTrim ? '#ffff00' : node.color}
                emissive={hovered && canTrim ? '#ffff00' : '#000000'}
                emissiveIntensity={hovered && canTrim ? 0.2 : 0}
              />
            </mesh>
            <mesh
              position={[0, 0.02, 0]}
              rotation={[0, 0, 0]}
              scale={[leafLength * displayScale, leafWidth * displayScale, 0.01 * displayScale]}
              onPointerDown={handlePointerDown}
            >
              <sphereGeometry args={[1, 16, 8]} />
              <meshStandardMaterial
                color={node.color}
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      }

      case 'bud':
        return (
          <mesh
            ref={meshRef}
            scale={[displayScale, displayScale, displayScale]}
            position={[0, node.radius, 0]}
            castShadow
          >
            <sphereGeometry args={[node.radius, 16, 16]} />
            <meshStandardMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={0.1}
            />
          </mesh>
        );

      case 'flower': {
        const petalCount = 5;
        const petals = [];
        for (let i = 0; i < petalCount; i++) {
          const angle = (i / petalCount) * Math.PI * 2;
          petals.push(
            <mesh
              key={i}
              position={[
                Math.cos(angle) * node.radius * 0.7 * displayScale,
                node.radius * 0.3 * displayScale,
                Math.sin(angle) * node.radius * 0.7 * displayScale
              ]}
              rotation={[0, angle, Math.PI / 6]}
              scale={[displayScale, displayScale, displayScale]}
            >
              <sphereGeometry args={[node.radius * 0.6, 8, 8]} />
              <meshStandardMaterial
                color={node.color}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        }
        return (
          <group>
            <mesh
              ref={meshRef}
              scale={[displayScale, displayScale, displayScale]}
              position={[0, node.radius * 0.3, 0]}
            >
              <sphereGeometry args={[node.radius * 0.4, 12, 12]} />
              <meshStandardMaterial
                color={'#ffff00'}
                emissive={'#ffff00'}
                emissiveIntensity={0.2}
              />
            </mesh>
            {petals}
          </group>
        );
      }

      case 'fruit':
        return (
          <mesh
            ref={meshRef}
            scale={[displayScale, displayScale, displayScale]}
            position={[0, node.radius, 0]}
            castShadow
          >
            <sphereGeometry args={[node.radius, 16, 16]} />
            <meshStandardMaterial
              color={node.color}
              emissive={'#ff0000'}
              emissiveIntensity={0.1}
              roughness={0.3}
            />
          </mesh>
        );

      default:
        return null;
    }
  };

  if (!isPlanted) return null;

  return (
    <group
      ref={groupRef}
      position={node.position as [number, number, number]}
      rotation={[
        node.rotation[0],
        node.rotation[1],
        node.rotation[2] + (node.type === 'cotyledon' ? (1 - cotyledonProgress) * 0.8 * (node.rotation[2] > 0 ? -1 : 1) : 0)
      ]}
      scale={node.scale as [number, number, number]}
    >
      {renderGeometry()}
      {childrenNodes.map(childNode => (
        <PlantNodeRenderer
          key={childNode.id}
          node={childNode}
          onCut={onCut}
          cotyledonProgress={cotyledonProgress}
        />
      ))}
    </group>
  );
}

interface ParticlesRendererProps {
  particles: FallingParticle[];
}

function ParticlesRenderer({ particles }: ParticlesRendererProps) {
  return (
    <group>
      {particles.map(p => {
        const opacity = Math.max(0, Math.min(1, p.lifetime / p.maxLifetime));
        const scale = p.scale * opacity;
        return (
          <group
            key={p.id}
            position={p.position as [number, number, number]}
            rotation={p.rotation as [number, number, number]}
          >
            <mesh scale={[scale, scale, 0.01]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial
                color={p.color}
                transparent
                opacity={opacity * 0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

interface CutEffectsRendererProps {
  effects: CutEffect[];
}

function CutEffectsRenderer({ effects }: CutEffectsRendererProps) {
  return (
    <group>
      {effects.map(effect => {
        const elapsed = performance.now() - effect.createdAt;
        const progress = Math.min(1, elapsed / effect.duration);
        const opacity = 1 - progress;
        const scale = 0.1 + progress * 0.3;
        return (
          <mesh
            key={effect.id}
            position={effect.position as [number, number, number]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[scale, scale, 1]}
          >
            <ringGeometry args={[0.02, 0.05, 16]} />
            <meshBasicMaterial
              color={'#ffffff'}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

interface SceneContentProps {
  onCut?: (nodeId: string, position: [number, number, number]) => void;
}

function SceneContent({ onCut }: SceneContentProps) {
  const {
    plantNodes,
    rootNodeId,
    soilProgress,
    particles,
    cutEffects,
    cotyledonProgress,
    environment
  } = usePlantStore();

  const rootNode = rootNodeId ? plantNodes[rootNodeId] : null;

  const lightIntensity = 0.5 + (environment.light / 100) * 0.8;

  return (
    <>
      <color attach="background" args={['#e3f2fd']} />
      <fog attach="fog" args={['#e3f2fd', 8, 20]} />
      
      <ambientLight intensity={0.6} color={'#ffffff'} />
      <directionalLight
        position={[3, 5, 3]}
        intensity={lightIntensity}
        color={'#fff5e6'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight intensity={0.3} color={'#87ceeb'} groundColor={'#8bc34a'} />

      <BackgroundGradient />
      <Ground progress={soilProgress} />

      {rootNode && (
        <PlantNodeRenderer
          node={rootNode}
          onCut={onCut}
          cotyledonProgress={cotyledonProgress}
        />
      )}

      <ParticlesRenderer particles={particles} />
      <CutEffectsRenderer effects={cutEffects} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1.5}
        maxDistance={10}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.8, 0]}
      />
    </>
  );
}

export default function PlantRender({ onCut }: { onCut?: (nodeId: string, position: [number, number, number]) => void }) {
  const isDragging = usePlantStore(s => s.isDragging);
  const isTrimming = usePlantStore(s => s.isTrimming);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        cursor: isTrimming || isDragging ? 'crosshair' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Canvas
        camera={{
          position: [0, 1.5, 2.6],
          fov: 50,
          near: 0.1,
          far: 100
        }}
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <SceneContent onCut={onCut} />
      </Canvas>
    </div>
  );
}
