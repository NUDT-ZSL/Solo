import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { HandTracker } from '@/modules/handtracking/HandTracker';
import { GestureRecognizer, GestureEvent } from '@/modules/handtracking/GestureRecognizer';
import { TerrainGenerator } from '@/modules/terrain/TerrainGenerator';
import ControlPanel from '@/components/ControlPanel';
import { useAppStore, MarkerPoint } from '@/store/useStore';

const TerrainMesh: React.FC<{ terrainGenerator: TerrainGenerator }> = ({ terrainGenerator }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const [geometry, setGeometry] = useState<THREE.PlaneGeometry | null>(null);

  useEffect(() => {
    const gridSize = terrainGenerator.getGridSize();
    const cellSize = terrainGenerator.getCellSize();
    const terrainSize = gridSize * cellSize;

    const geo = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      gridSize - 1,
      gridSize - 1
    );
    geo.rotateX(-Math.PI / 2);

    setGeometry(geo);

    return () => {
      geo.dispose();
    };
  }, [terrainGenerator]);

  useFrame(() => {
    if (!geometry || !meshRef.current) return;

    const positions = geometry.attributes.position;
    const cells = terrainGenerator.getCells();
    const gridSize = terrainGenerator.getGridSize();

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const index = z * gridSize + x;
        const height = cells[z][x].height;
        positions.setY(index, height);
      }
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const colors = new Float32Array(positions.count * 3);
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const index = z * gridSize + x;
        const height = cells[z][x].height;
        const color = terrainGenerator.getColorAtHeight(height);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }

    if (!geometry.getAttribute('color')) {
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else {
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
      colorAttr.array.set(colors);
      colorAttr.needsUpdate = true;
    }

    if (wireframeRef.current) {
      wireframeRef.current.geometry.dispose();
      wireframeRef.current.geometry = new THREE.WireframeGeometry(geometry);
    }
  });

  if (!geometry) return null;

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <lineSegments ref={wireframeRef}>
        <wireframeGeometry args={[geometry]} />
        <lineBasicMaterial color="#555555" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
};

const Markers: React.FC<{ markers: MarkerPoint[] }> = ({ markers }) => {
  const meshRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    meshRefs.current.forEach((mesh, index) => {
      if (mesh) {
        const flash = (Math.sin(time * (Math.PI * 2) / 0.6 + index * 0.5) + 1) / 2;
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.3 + flash * 0.7;
      }
    });
  });

  return (
    <group>
      {markers.map((marker, index) => (
        <group key={marker.id} position={[marker.x, 0.02, marker.z]}>
          <mesh
            ref={(el) => {
              if (el) meshRefs.current[index] = el;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.1, 0.3, 32]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const CameraController: React.FC = () => {
  const { camera } = useThree();
  const { cameraAngle, cameraZoom } = useAppStore();
  const controlsRef = useRef<any>(null);
  const lastAngleRef = useRef(cameraAngle);
  const lastZoomRef = useRef(cameraZoom);

  useFrame(() => {
    if (Math.abs(cameraAngle - lastAngleRef.current) > 0.01) {
      lastAngleRef.current = cameraAngle;
    }
    if (Math.abs(cameraZoom - lastZoomRef.current) > 0.01) {
      lastZoomRef.current = cameraZoom;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={3}
      maxDistance={20}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
      enableDamping={true}
      dampingFactor={0.05}
    />
  );
};

const Scene: React.FC<{ terrainGenerator: TerrainGenerator }> = ({ terrainGenerator }) => {
  const markers = useAppStore((state) => state.markers);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#00e5ff" />

      <gridHelper
        args={[10, 20, '#333333', '#222222']}
        position={[0, -0.01, 0]}
      />

      <TerrainMesh terrainGenerator={terrainGenerator} />
      <Markers markers={markers} />

      <CameraController />
    </>
  );
};

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const terrainGeneratorRef = useRef<TerrainGenerator | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const {
    terrainScale,
    bumpDecay,
    colorBlendIntensity,
    setCameraReady,
    setHandLandmarks,
    setGesture,
    setHandPosition,
    addMarker,
  } = useAppStore();

  const lastGestureRef = useRef<{ [key: number]: string }>({});
  const lastPinchRef = useRef(false);
  const markerCooldownRef = useRef(false);

  useEffect(() => {
    terrainGeneratorRef.current = new TerrainGenerator(20, 0.5);
    gestureRecognizerRef.current = new GestureRecognizer();

    gestureRecognizerRef.current.setCallback((events: GestureEvent[]) => {
      handleGestures(events);
    });

    setIsInitialized(true);

    return () => {
      if (handTrackerRef.current) {
        handTrackerRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (terrainGeneratorRef.current) {
      terrainGeneratorRef.current.setTerrainScale(terrainScale);
      terrainGeneratorRef.current.setBumpDecay(bumpDecay);
      terrainGeneratorRef.current.setColorBlendIntensity(colorBlendIntensity);
    }
  }, [terrainScale, bumpDecay, colorBlendIntensity]);

  const handleGestures = useCallback((events: GestureEvent[]) => {
    if (events.length === 0) {
      setGesture(null);
      setHandPosition(null);
      setHandLandmarks(null);
      return;
    }

    let controlHand: GestureEvent | null = null;
    let pointingHand: GestureEvent | null = null;

    for (const event of events) {
      if (event.type === 'open_palm' || event.type === 'fist') {
        if (!controlHand || (event.handIndex === 0)) {
          controlHand = event;
        }
      }
      if (event.type === 'pointing') {
        if (!pointingHand || (event.handIndex === 1)) {
          pointingHand = event;
        }
      }
    }

    if (!controlHand && events.length > 0) {
      controlHand = events[0];
    }

    if (controlHand) {
      const currentGesture = controlHand.type;
      const lastGesture = lastGestureRef.current[controlHand.handIndex];

      if (currentGesture !== lastGesture) {
        lastGestureRef.current[controlHand.handIndex] = currentGesture;
        setGesture(currentGesture);

        const terrainX = (controlHand.palmPosition.x - 0.5) * 10;
        const terrainZ = (controlHand.palmPosition.y - 0.5) * 10;

        if (currentGesture === 'open_palm' && terrainGeneratorRef.current) {
          terrainGeneratorRef.current.raiseTerrain(terrainX, terrainZ, 1.5, 2.0);
        } else if (currentGesture === 'fist' && terrainGeneratorRef.current) {
          terrainGeneratorRef.current.lowerTerrain(terrainX, terrainZ, 1.5, 1.5);
        }
      }

      setHandPosition({
        x: controlHand.palmPosition.x,
        y: controlHand.palmPosition.y,
      });
    }

    if (pointingHand && !markerCooldownRef.current) {
      markerCooldownRef.current = true;
      const terrainX = (pointingHand.indexTipPosition!.x - 0.5) * 10;
      const terrainZ = (pointingHand.indexTipPosition!.y - 0.5) * 10;
      addMarker(terrainX, terrainZ);

      setTimeout(() => {
        markerCooldownRef.current = false;
      }, 500);
    }
  }, [setGesture, setHandPosition, setHandLandmarks, addMarker]);

  useEffect(() => {
    const initHandTracking = async () => {
      if (!videoRef.current || !handTrackerRef.current === false) return;

      try {
        handTrackerRef.current = new HandTracker();
        await handTrackerRef.current.initialize(videoRef.current!);

        handTrackerRef.current.setCallback((result) => {
          setHandLandmarks(result.landmarks);

          if (gestureRecognizerRef.current) {
            gestureRecognizerRef.current.processLandmarks(result.landmarks, result.timestamp);
          }
        });

        setCameraReady(true);
        setCameraError(null);
      } catch (error) {
        console.error('Failed to initialize hand tracking:', error);
        setCameraError('无法访问摄像头，请确保已授权摄像头权限');
        setCameraReady(false);
      }
    };

    if (isInitialized) {
      initHandTracking();
    }
  }, [isInitialized, setCameraReady, setHandLandmarks]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a0a' }}>
      {cameraError && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 20, 20, 0.95)',
            padding: '30px 40px',
            borderRadius: '16px',
            color: '#ff6b6b',
            zIndex: 2000,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <h3 style={{ marginBottom: '10px' }}>⚠️ 摄像头错误</h3>
          <p>{cameraError}</p>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
            请刷新页面并授权摄像头权限
          </p>
        </div>
      )}

      <ControlPanel videoRef={videoRef} />

      <div style={{ width: '100%', height: '100%' }}>
        {isInitialized && terrainGeneratorRef.current && (
          <Canvas
            camera={{
              position: [0, 8, 8],
              fov: 60,
              near: 0.1,
              far: 1000,
            }}
            gl={{ antialias: true }}
            dpr={[1, 2]}
          >
            <Scene terrainGenerator={terrainGeneratorRef.current} />
          </Canvas>
        )}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#666',
          fontSize: '12px',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        Gesture Terrain Sandbox v1.0 | 三维手势交互沙盘
      </div>
    </div>
  );
};

export default App;
