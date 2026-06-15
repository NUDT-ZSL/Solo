import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import ParticleEngine from './components/ParticleEngine';
import { environmentController } from './components/EnvironmentController';
import './styles.css';

const BLOOM_DURATION = 3000;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const particleEngineRef = useRef<ParticleEngine | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [lightAngle, setLightAngle] = useState(45);
  const [windSpeed, setWindSpeed] = useState(2.5);
  const [particleDensity, setParticleDensity] = useState(1);
  const [fps, setFps] = useState(0);
  const [particleCount, setParticleCount] = useState(0);
  const [showBloomText, setShowBloomText] = useState(false);
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null);

  const handleSliderChange = useCallback((label: string, setter: (v: number) => void, value: number) => {
    setter(value);
    setHighlightLabel(label);
    setTimeout(() => setHighlightLabel(null), 300);
  }, []);

  useEffect(() => {
    environmentController.setLightAngle(lightAngle);
  }, [lightAngle]);

  useEffect(() => {
    environmentController.setWindSpeed(windSpeed);
  }, [windSpeed]);

  useEffect(() => {
    environmentController.setParticleDensity(particleDensity);
  }, [particleDensity]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    const cameraDistance = 15;
    const elevationAngle = (30 * Math.PI) / 180;
    camera.position.set(
      0,
      cameraDistance * Math.sin(elevationAngle),
      cameraDistance * Math.cos(elevationAngle)
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0a0a1a, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.target.set(0, 1.5, 0);
    controls.update();
    controlsRef.current = controls;

    const groundGeometry = new THREE.CircleGeometry(50, 64);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    scene.add(ground);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const particleEngine = new ParticleEngine(scene);
    particleEngineRef.current = particleEngine;

    environmentController.start();

    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fpsUpdateTime = performance.now();

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const deltaTime = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      frameCount++;
      if (now - fpsUpdateTime >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - fpsUpdateTime)));
        frameCount = 0;
        fpsUpdateTime = now;
        setParticleCount(particleEngine.getParticleCount());
      }

      particleEngine.update(deltaTime);

      if (particleEngine.isBloomingState()) {
        if (particleEngine.getBloomProgress() < 1) {
          setShowBloomText(true);
        } else if (particleEngine.isBloomTextFadeComplete()) {
          setShowBloomText(false);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleClick = (event: MouseEvent) => {
      if (!container || !camera || !particleEngine) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const boundingSphere = particleEngine.getBoundingSphere();

      if (raycasterRef.current.ray.intersectsSphere(boundingSphere)) {
        console.log('[App] 检测到花蕾点击，触发绽放动画');
        environmentController.triggerBloom();
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      particleEngine.destroy();
      environmentController.stop();
      environmentController.destroy();
      controls.dispose();
      renderer.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="app-container">
      <div ref={containerRef} className="three-container" />

      <div className="control-panel">
        <div className="panel-title">CrystalBloom 控制面板</div>

        <div className="slider-group">
          <label
            className={`slider-label ${highlightLabel === 'light' ? 'highlight' : ''}`}
          >
            光照角度
          </label>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={lightAngle}
            onChange={(e) => handleSliderChange('light', setLightAngle, Number(e.target.value))}
            className="custom-slider"
          />
          <div className="slider-value">{lightAngle}°</div>
        </div>

        <div className="slider-group">
          <label
            className={`slider-label ${highlightLabel === 'wind' ? 'highlight' : ''}`}
          >
            风速
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={windSpeed}
            onChange={(e) => handleSliderChange('wind', setWindSpeed, Number(e.target.value))}
            className="custom-slider"
          />
          <div className="slider-value">{windSpeed.toFixed(1)}</div>
        </div>

        <div className="slider-group">
          <label
            className={`slider-label ${highlightLabel === 'density' ? 'highlight' : ''}`}
          >
            粒子密度
          </label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={particleDensity}
            onChange={(e) => handleSliderChange('density', setParticleDensity, Number(e.target.value))}
            className="custom-slider"
          />
          <div className="slider-value">{particleDensity}</div>
        </div>

        <div className="panel-hint">点击花蕾触发绽放</div>
      </div>

      {showBloomText && (
        <div className="bloom-text">绽放中...</div>
      )}

      <div className="status-bar">
        <span className="status-fps">FPS: {fps}</span>
        <span className="status-divider">|</span>
        <span className="status-particles">粒子: {particleCount}</span>
      </div>
    </div>
  );
}
