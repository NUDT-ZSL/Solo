import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  createPlanet,
  updatePlanetMaterials,
  createInteractivePoints,
  updateInteractivePoints,
  createAtmosphere,
  createStarfield,
  InteractivePoint,
} from './TerrainEngine';
import { EcologyManager } from './EcologyManager';
import { InteractionSystem, AmbientParticleSystem, CardData } from './InteractionSystem';
import { ControlPanel } from './ControlPanel';

const ecologyManager = new EcologyManager();

function SceneContent({
  onCardData,
}: {
  onCardData: (card: CardData) => void;
}) {
  const { camera, gl } = useThree();
  const planetRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<InteractivePoint[]>([]);
  const interactionRef = useRef<InteractionSystem | null>(null);
  const ambientRef = useRef<AmbientParticleSystem | null>(null);
  const sceneGroupRef = useRef<THREE.Group>(null!);
  const atmosphereRef = useRef<THREE.Mesh>(null!);
  const starfieldRef = useRef<THREE.Points>(null!);
  const pointsGroupRef = useRef<THREE.Group>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const planet = createPlanet(ecologyManager);
    if (planetRef.current) {
      planetRef.current.clear();
      while (planet.children.length) {
        planetRef.current.add(planet.children[0]);
      }
    }

    const interactivePoints = createInteractivePoints(ecologyManager);
    pointsRef.current = interactivePoints;

    const pointsGroup = new THREE.Group();
    interactivePoints.forEach((p) => pointsGroup.add(p.mesh));
    if (pointsGroupRef.current) {
      pointsGroupRef.current.clear();
      while (pointsGroup.children.length) {
        pointsGroupRef.current.remove(pointsGroupRef.current.children[0]);
      }
      interactivePoints.forEach((p) => pointsGroupRef.current!.add(p.mesh));
    }

    const interaction = new InteractionSystem(ecologyManager);
    interactionRef.current = interaction;
    interaction.subscribeCard(onCardData);

    const ambient = new AmbientParticleSystem(ecologyManager);
    ambientRef.current = ambient;

    const atmosphere = createAtmosphere();
    atmosphereRef.current = atmosphere;

    const starfield = createStarfield();
    starfieldRef.current = starfield;

    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!interactionRef.current) return;

    const handleClick = (event: MouseEvent) => {
      interactionRef.current!.handleClick(
        event,
        camera,
        pointsRef.current,
        gl.domElement
      );
    };

    gl.domElement.addEventListener('click', handleClick);
    return () => gl.domElement.removeEventListener('click', handleClick);
  }, [camera, gl]);

  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.05);
    const time = performance.now() * 0.001;

    ecologyManager.update(clampedDelta);

    if (planetRef.current) {
      updatePlanetMaterials(planetRef.current, ecologyManager, time);
    }

    if (pointsRef.current.length > 0) {
      updateInteractivePoints(pointsRef.current, time, ecologyManager.getGlowIntensity());
    }

    if (interactionRef.current) {
      interactionRef.current.update(clampedDelta);
    }

    if (ambientRef.current) {
      ambientRef.current.update(time);
    }

    if (atmosphereRef.current) {
      const mat = atmosphereRef.current.material as THREE.ShaderMaterial;
    }

    if (planetRef.current) {
      planetRef.current.rotation.y += 0.0003 * ecologyManager.getFlowSpeed();
    }
  });

  return (
    <>
      <group ref={planetRef} />
      <group ref={pointsGroupRef} />
      {initialized && interactionRef.current && (
        <primitive object={interactionRef.current.getParticleGroup()} />
      )}
      {initialized && interactionRef.current && (
        <primitive object={interactionRef.current.getEchoGroup()} />
      )}
      {initialized && ambientRef.current && (
        <primitive object={ambientRef.current.getContainer()} />
      )}
      {atmosphereRef.current && <primitive object={atmosphereRef.current} />}
      {starfieldRef.current && <primitive object={starfieldRef.current} />}

      <ambientLight intensity={0.15} color="#4422aa" />
      <directionalLight
        position={[5, 3, 4]}
        intensity={0.6}
        color="#aaaaff"
      />
      <directionalLight
        position={[-3, -2, -4]}
        intensity={0.3}
        color="#ff6644"
      />
      <pointLight
        position={[0, 5, 0]}
        intensity={0.4}
        color="#8844ff"
        distance={20}
      />
    </>
  );
}

function BackgroundGradient() {
  return (
    <mesh position={[0, 0, -30]} renderOrder={-1}>
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          void main() {
            vec3 topColor = vec3(0.08, 0.0, 0.18);
            vec3 bottomColor = vec3(0.02, 0.0, 0.1);
            vec3 midColor = vec3(0.05, 0.0, 0.22);
            float t = vUv.y;
            vec3 color = mix(bottomColor, midColor, smoothstep(0.0, 0.5, t));
            color = mix(color, topColor, smoothstep(0.5, 1.0, t));
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function App() {
  const [cardData, setCardData] = useState<CardData>(null);

  const handleCardData = useCallback((card: CardData) => {
    setCardData(card);
  }, []);

  const handleDismissCard = useCallback(() => {
    setCardData(null);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#0a0014',
    }}>
      <Canvas
        camera={{
          position: [0, 2, 8],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#0a0014']} />
        <fog attach="fog" args={['#0a0014', 30, 60]} />
        <BackgroundGradient />
        <SceneContent onCardData={handleCardData} />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={15}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />
      </Canvas>

      <div style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        <h1 style={{
          color: 'rgba(200,180,255,0.7)',
          fontSize: '22px',
          fontWeight: 300,
          letterSpacing: '6px',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: '0 0 20px rgba(120,80,220,0.4)',
        }}>
          星 壤 幻 境
        </h1>
        <p style={{
          color: 'rgba(160,140,200,0.4)',
          fontSize: '11px',
          textAlign: 'center',
          letterSpacing: '3px',
          marginTop: '6px',
        }}>
          STAR SOIL ILLUSION
        </p>
      </div>

      <ControlPanel
        ecology={ecologyManager}
        onCardData={cardData}
        onDismissCard={handleDismissCard}
      />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
