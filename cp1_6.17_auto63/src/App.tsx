import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStarStore } from '@/store/useStarStore';
import { StarEngine } from '@/core/starEngine';
import { ParticleSystem } from '@/core/particleSystem';
import { ControlPanel } from '@/ui/controlPanel';
import { InfoPanel } from '@/ui/infoPanel';
import { DataCompare } from '@/ui/dataCompare';
import { StarParams, StarStage, STAGE_NAMES } from '@/core/types';
import { formatNumber } from '@/data/starData';

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
  const blackHoleTimeRef = useRef<number>(0);

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
  } = useStarStore();

  const handleStageChange = useCallback((stage: StarStage, stageName: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    showStageNotification(stageName);
    notificationTimeoutRef.current = setTimeout(() => {
      hideStageNotification();
    }, 2000);
  }, [showStageNotification, hideStageNotification]);

  const handleExplosion = useCallback((type: StarStage.SUPERNOVA | StarStage.PLANETARY_NEBULA) => {
    if (particleSystemRef.current) {
      particleSystemRef.current.createExplosion(new THREE.Vector3(0, 0, 0), type);
    }
  }, []);

  const handleStarClick = useCallback(() => {
    setShowDataCompare(true);
  }, [setShowDataCompare]);

  const handleParamsUpdate = useCallback((params: StarParams) => {
    setStarParams(params);
  }, [setStarParams]);

  const handleMassChange = useCallback((mass: number) => {
    if (starEngineRef.current) {
      starEngineRef.current.createStar(mass);
    }
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    if (starEngineRef.current) {
      starEngineRef.current.setAge(time);
    }
  }, []);

  const handleStarSelect = useCallback((mass: number) => {
    const validMasses = [0.5, 1, 4, 10, 25];
    if (validMasses.includes(mass)) {
      useStarStore.getState().setCurrentMass(mass);
      if (starEngineRef.current) {
        starEngineRef.current.createStar(mass);
      }
    } else {
      const closest = validMasses.reduce((prev, curr) => 
        Math.abs(curr - mass) < Math.abs(prev - mass) ? curr : prev
      );
      useStarStore.getState().setCurrentMass(closest);
      if (starEngineRef.current) {
        starEngineRef.current.createStar(closest);
      }
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
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const particleSystem = new ParticleSystem(scene);
    particleSystem.createBackgroundStars(1000);
    particleSystemRef.current = particleSystem;

    const starEngine = new StarEngine(scene, camera, renderer.domElement);
    starEngine.createStar(1);
    starEngine.on('paramsUpdate', handleParamsUpdate);
    starEngine.on('explosion', handleExplosion);
    starEngine.on('stageChange', (data) => handleStageChange(data[0] as StarStage, data[1] as string));
    starEngine.on('click', handleStarClick);
    starEngineRef.current = starEngine;

    const animate = (currentTime: number) => {
      animationIdRef.current = requestAnimationFrame(animate);

      const deltaTime = Math.min(currentTime - lastTimeRef.current, 50);
      lastTimeRef.current = currentTime;
      const deltaSeconds = deltaTime / 1000;

      if (isPlaying && starEngineRef.current) {
        const state = useStarStore.getState();
        const newTime = state.currentTime + deltaSeconds * 50000000;
        const maxTime = 14e9;
        if (newTime >= maxTime) {
          useStarStore.getState().setCurrentTime(maxTime);
          useStarStore.getState().setIsPlaying(false);
          starEngineRef.current.setAge(maxTime);
        } else {
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

      const starMesh = starEngineRef.current?.getStarMesh();
      if (starMesh && starMesh.material instanceof THREE.ShaderMaterial) {
        if (starMesh.material.uniforms.time) {
          blackHoleTimeRef.current += deltaSeconds;
          starMesh.material.uniforms.time.value = blackHoleTimeRef.current;
        }
      }

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.ShaderMaterial) {
          if (obj.material.uniforms && obj.material.uniforms.time) {
            blackHoleTimeRef.current += deltaSeconds * 0.5;
            obj.material.uniforms.time.value = blackHoleTimeRef.current;
          }
        }
      });

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
        starEngineRef.current.dispose();
      }
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [handleParamsUpdate, handleExplosion, handleStageChange, handleStarClick, isPlaying]);

  useEffect(() => {
    if (starEngineRef.current) {
      starEngineRef.current.setAge(currentTime);
    }
  }, [currentTime]);

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
