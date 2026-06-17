import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStarStore } from '@/store/useStarStore';
import { StarEngine } from '@/core/starEngine';
import { ParticleSystem } from '@/core/particleSystem';
import { ControlPanel } from '@/ui/controlPanel';
import { InfoPanel } from '@/ui/infoPanel';
import { DataCompare } from '@/ui/dataCompare';
import { StarParams, StarStage } from '@/core/types';
import { formatNumber } from '@/data/starData';

const MAX_DELTA_MS = 50;
const MAX_PARTICLES = 700;
const PLAYBACK_SPEED = 50000000;

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const starEngineRef = useRef<StarEngine | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);

  const {
    currentMass,
    currentTime,
    isPlaying,
    starParams,
    stageNotification,
    setStarParams,
    setCurrentTime,
    setShowDataCompare,
    showStageNotification,
    hideStageNotification,
    setIsPlaying,
  } = useStarStore();

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const handleStageChange = useCallback((data: unknown) => {
    const { stageName } = data as { stage: StarStage; stageName: string };
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    showStageNotification(stageName);
    notificationTimeoutRef.current = setTimeout(() => {
      hideStageNotification();
    }, 2000);
  }, [showStageNotification, hideStageNotification]);

  const handleExplosion = useCallback((type: unknown) => {
    if (particleSystemRef.current) {
      particleSystemRef.current.createExplosion(
        new THREE.Vector3(0, 0, 0),
        type as StarStage.SUPERNOVA | StarStage.PLANETARY_NEBULA
      );
    }
  }, []);

  const handleStarClick = useCallback(() => {
    setShowDataCompare(true);
  }, [setShowDataCompare]);

  const handleParamsUpdate = useCallback((params: unknown) => {
    setStarParams(params as StarParams);
  }, [setStarParams]);

  const handleMassChange = useCallback((mass: number) => {
    if (starEngineRef.current) {
      starEngineRef.current.createStar(mass);
      if (particleSystemRef.current) {
        const activeParticles = particleSystemRef.current.getActiveExplosionParticleCount();
        if (activeParticles > 0) {
          particleSystemRef.current.createExplosion(
            new THREE.Vector3(0, 0, 0),
            StarStage.SUPERNOVA
          );
        }
      }
    }
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    if (starEngineRef.current) {
      starEngineRef.current.setAge(time);
    }
  }, []);

  const handleStarSelect = useCallback((mass: number) => {
    const validMasses = [0.5, 1, 4, 10, 25];
    let targetMass = mass;
    if (!validMasses.includes(mass)) {
      targetMass = validMasses.reduce((prev, curr) =>
        Math.abs(curr - mass) < Math.abs(prev - mass) ? curr : prev
      );
    }
    useStarStore.getState().setCurrentMass(targetMass);
    useStarStore.getState().setCurrentTime(0);
    useStarStore.getState().setIsPlaying(false);
    if (starEngineRef.current) {
      starEngineRef.current.createStar(targetMass);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.enablePan = false;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const particleSystem = new ParticleSystem(scene);
    particleSystem.createBackgroundStars(500);
    particleSystemRef.current = particleSystem;

    const starEngine = new StarEngine(scene, camera, renderer.domElement);
    starEngine.createStar(1);
    starEngine.on('paramsUpdate', handleParamsUpdate);
    starEngine.on('explosion', handleExplosion);
    starEngine.on('stageChange', handleStageChange);
    starEngine.on('click', handleStarClick);
    starEngineRef.current = starEngine;

    let frameCount = 0;
    const animate = (currentTime: number) => {
      animationIdRef.current = requestAnimationFrame(animate);

      const rawDelta = currentTime - lastTimeRef.current;
      const deltaMs = Math.min(rawDelta, MAX_DELTA_MS);
      lastTimeRef.current = currentTime;
      const deltaSeconds = deltaMs / 1000;

      if (isPlayingRef.current && starEngineRef.current) {
        const newTime = currentTimeRef.current + deltaSeconds * PLAYBACK_SPEED;
        const maxTime = 14e9;
        if (newTime >= maxTime) {
          currentTimeRef.current = maxTime;
          isPlayingRef.current = false;
          useStarStore.getState().setCurrentTime(maxTime);
          useStarStore.getState().setIsPlaying(false);
          starEngineRef.current.setAge(maxTime);
        } else {
          currentTimeRef.current = newTime;
          useStarStore.getState().setCurrentTime(newTime);
          starEngineRef.current.setAge(newTime);
        }
      }

      if (starEngineRef.current) {
        starEngineRef.current.update(deltaSeconds);
      }

      if (particleSystemRef.current) {
        particleSystemRef.current.update(deltaSeconds);
        particleSystemRef.current.recycleParticles();
      }

      if (particleSystemRef.current && frameCount % 60 === 0) {
        const totalParticles = particleSystemRef.current.getTotalParticleCount();
        if (totalParticles > MAX_PARTICLES) {
          console.warn(`Particle count (${totalParticles}) exceeds max (${MAX_PARTICLES})`);
        }
      }
      frameCount++;

      controls.update();
      renderer.render(scene, camera);
    };

    lastTimeRef.current = performance.now();
    animate(lastTimeRef.current);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      
      if (starEngineRef.current) {
        starEngineRef.current.off('paramsUpdate', handleParamsUpdate);
        starEngineRef.current.off('explosion', handleExplosion);
        starEngineRef.current.off('stageChange', handleStageChange);
        starEngineRef.current.off('click', handleStarClick);
        starEngineRef.current.dispose();
        starEngineRef.current = null;
      }
      
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
        particleSystemRef.current = null;
      }
      
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [handleParamsUpdate, handleExplosion, handleStageChange, handleStarClick]);

  useEffect(() => {
    if (starEngineRef.current && starEngineRef.current.getMass() !== currentMass) {
      starEngineRef.current.createStar(currentMass);
    }
  }, [currentMass]);

  return (
    <>
      <div ref={containerRef} id="canvas-container" />
      
      <h1 className="app-title">恒星演化的叙事</h1>

      <div className="temp-display">
        <div>
          表面温度 <span className="temp-value">{Math.round(starParams.temperature).toLocaleString()} K</span>
        </div>
        <div className="luminosity-display">
          光度：{formatNumber(starParams.luminosity)} × 太阳光度
        </div>
      </div>

      <div className="click-hint">
        ✨ 点击恒星查看更多对比数据
      </div>

      <ControlPanel 
        onMassChange={handleMassChange}
        onTimeChange={handleTimeChange}
      />
      
      <InfoPanel />
      
      <DataCompare onStarSelect={handleStarSelect} />

      {stageNotification?.show && (
        <div className="stage-notification" key={stageNotification.name}>
          {stageNotification.name}
        </div>
      )}
    </>
  );
}

export default App;
