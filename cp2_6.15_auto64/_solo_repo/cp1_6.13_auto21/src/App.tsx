import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem, ColorTheme } from './particles';
import { Controls } from './controls';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 30, 50);
const INITIAL_TARGET = new THREE.Vector3(0, 0, 0);

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const resettingCameraRef = useRef(false);
  const resetStartPosRef = useRef(new THREE.Vector3());
  const resetStartTargetRef = useRef(new THREE.Vector3());
  const resetProgressRef = useRef(0);

  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [theme, setTheme] = useState<ColorTheme>('aurora');
  const [isPaused, setIsPaused] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [windSpeeds, setWindSpeeds] = useState<
    { name: string; speed: number; position: THREE.Vector3 }[]
  >([]);

  const handleWindSpeedUpdate = useCallback(
    (speeds: { name: string; speed: number; position: THREE.Vector3 }[]) => {
      setWindSpeeds(speeds);
    },
    []
  );

  const createStars = useCallback((scene: THREE.Scene) => {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2e);
    scene.fog = new THREE.FogExp2(0x0a0a2e, 0.008);
    sceneRef.current = scene;

    createStars(scene);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.copy(INITIAL_CAMERA_POSITION);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI * 0.9;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const particleSystem = new ParticleSystem(scene, camera);
    particleSystem.setOnWindSpeedUpdate(handleWindSpeedUpdate);
    particleSystem.init(0);
    particleSystemRef.current = particleSystem;
    setCities(particleSystem.getCities());

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (resettingCameraRef.current && controlsRef.current && cameraRef.current) {
        resetProgressRef.current += 1 / 90;
        const t = Math.min(resetProgressRef.current, 1);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        cameraRef.current.position.lerpVectors(
          resetStartPosRef.current,
          INITIAL_CAMERA_POSITION,
          easeT
        );
        controlsRef.current.target.lerpVectors(
          resetStartTargetRef.current,
          INITIAL_TARGET,
          easeT
        );

        if (t >= 1) {
          resettingCameraRef.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particleSystem.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createStars, handleWindSpeedUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && particleSystemRef.current) {
        e.preventDefault();
        const paused = particleSystemRef.current.togglePause();
        setIsPaused(paused);
        if (paused) {
          setWindSpeeds(particleSystemRef.current.getWindSpeeds());
        } else {
          setWindSpeeds([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCityClick = (index: number) => {
    setCurrentCityIndex(index);
    if (particleSystemRef.current) {
      particleSystemRef.current.setCity(index);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (particleSystemRef.current) {
      particleSystemRef.current.setSpeedMultiplier(newSpeed);
    }
  };

  const handleThemeChange = (newTheme: ColorTheme) => {
    setTheme(newTheme);
    if (particleSystemRef.current) {
      particleSystemRef.current.setTheme(newTheme);
    }
  };

  const handleResetCamera = () => {
    if (!controlsRef.current || !cameraRef.current) return;

    resettingCameraRef.current = true;
    resetProgressRef.current = 0;
    resetStartPosRef.current.copy(cameraRef.current.position);
    resetStartTargetRef.current.copy(controlsRef.current.target);
  };

  const projectToScreen = (position: THREE.Vector3) => {
    if (!cameraRef.current || !rendererRef.current) return null;

    const vector = position.clone().project(cameraRef.current);
    const canvas = rendererRef.current.domElement;

    return {
      x: (vector.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-vector.y * 0.5 + 0.5) * canvas.clientHeight,
    };
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        {cities.map((city, index) => (
          <button
            key={city}
            onClick={() => handleCityClick(index)}
            style={{
              padding: '10px 24px',
              backgroundColor:
                index === currentCityIndex
                  ? 'rgba(96, 165, 250, 0.3)'
                  : 'rgba(0, 0, 0, 0.5)',
              border:
                index === currentCityIndex
                  ? '1px solid rgba(96, 165, 250, 0.8)'
                  : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: index === currentCityIndex ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto',
            }}
            className={`city-btn ${index === currentCityIndex ? 'active' : ''}`}
          >
            {city}
          </button>
        ))}
        <style>{`
          .city-btn:hover {
            background-color: rgba(96, 165, 250, 0.2) !important;
            transform: scale(1.05);
          }
          .city-btn.active:hover {
            background-color: rgba(96, 165, 250, 0.4) !important;
          }
          .city-btn:active {
            transform: scale(0.98);
          }
        `}</style>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '2px',
            textShadow: '0 2px 20px rgba(96, 165, 250, 0.5)',
          }}
        >
          CloudFlow
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            marginTop: '4px',
          }}
        >
          3D气流可视化系统
        </div>
      </div>

      {isPaused &&
        windSpeeds.map((ws) => {
          const screenPos = projectToScreen(ws.position);
          if (!screenPos || ws.speed === 0) return null;

          return (
            <div
              key={ws.name}
              style={{
                position: 'absolute',
                left: screenPos.x,
                top: screenPos.y - 30,
                transform: 'translate(-50%, -50%)',
                padding: '6px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                zIndex: 100,
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              {ws.name}: {ws.speed.toFixed(2)} m/s
            </div>
          );
        })}

      {isPaused && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '12px 28px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '6px',
            color: 'white',
            fontSize: '18px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 600,
            zIndex: 100,
            pointerEvents: 'none',
            backdropFilter: 'blur(6px)',
            letterSpacing: '2px',
          }}
        >
          已暂停 - 按空格键继续
        </div>
      )}

      <Controls
        speed={speed}
        onSpeedChange={handleSpeedChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
