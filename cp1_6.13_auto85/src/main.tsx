import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { useControls, Leva } from 'leva';
import {
  createScene,
  INITIAL_CAMERA_POSITION,
  INITIAL_CAMERA_TARGET,
  animateCameraTo,
} from './scene/SceneSetup';
import { createPlanetSystem, setOrbitsVisible } from './scene/PlanetSystem';
import type { PlanetObject } from './scene/PlanetSystem';
import {
  startAnimation,
  setTimeScale,
  setSelectedObject,
  createAnimationState,
} from './scene/OrbitAnimator';
import InfoPanel from './components/InfoPanel';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneDataRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: any;
    planets: PlanetObject[];
    allObjects: Map<string, THREE.Mesh>;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    stopAnimation: (() => void) | null;
  } | null>(null);

  const animationStateRef = useRef(createAnimationState(1));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const fpsRef = useRef(60);

  useControls('SolarBreeze', {
    公转速度: {
      value: 1,
      min: 0,
      max: 10,
      step: 0.1,
      onChange: (v) => {
        setTimeScale(animationStateRef.current, v);
      },
    },
    显示轨道线: {
      value: true,
      onChange: (v) => {
        if (sceneDataRef.current?.planets) {
          setOrbitsVisible(sceneDataRef.current.planets, v);
        }
      },
    },
    自动旋转: {
      value: false,
      onChange: (v) => {
        if (sceneDataRef.current?.controls) {
          sceneDataRef.current.controls.autoRotate = v;
          sceneDataRef.current.controls.autoRotateSpeed = 0.5;
        }
      },
    },
    重置视角: {
      type: 'button',
      onEdit: () => {
        if (sceneDataRef.current) {
          const { camera, controls } = sceneDataRef.current;
          animateCameraTo(
            camera,
            controls,
            INITIAL_CAMERA_POSITION,
            INITIAL_CAMERA_TARGET,
            1500
          );
        }
      },
    },
  });

  const handleCanvasClick = useCallback((event: MouseEvent) => {
    if (!sceneDataRef.current) return;

    const { raycaster, mouse, camera, allObjects, planets, renderer } = sceneDataRef.current;
    const rect = renderer.domElement.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const meshes = Array.from(allObjects.values());
    const intersects = raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let targetObject = intersects[0].object;
      while (targetObject.parent && !allObjects.has(targetObject.name)) {
        targetObject = targetObject.parent as THREE.Mesh;
      }

      const objectId = targetObject.name;
      if (allObjects.has(objectId)) {
        setSelectedId(objectId);
        setSelectedObject(animationStateRef.current, objectId, planets);
      }
    } else {
      setSelectedId(null);
      setSelectedObject(animationStateRef.current, null, planets);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const { scene, camera, renderer, controls } = createScene(canvasRef.current);
    const { planets, allObjects } = createPlanetSystem(scene);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneDataRef.current = {
      scene,
      camera,
      renderer,
      controls,
      planets,
      allObjects,
      raycaster,
      mouse,
      stopAnimation: null,
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    renderer.domElement.style.cursor = 'pointer';

    const renderLoop = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const stopAnim = startAnimation({
      planets,
      state: animationStateRef.current,
      onFPSUpdate: (newFps) => {
        fpsRef.current = newFps;
        setFps(newFps);
      },
    });

    sceneDataRef.current.stopAnimation = stopAnim;

    return () => {
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      stopAnim();
      renderer.dispose();
    };
  }, [handleCanvasClick]);

  const handleClosePanel = useCallback(() => {
    setSelectedId(null);
    if (sceneDataRef.current?.planets) {
      setSelectedObject(animationStateRef.current, null, sceneDataRef.current.planets);
    }
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      <Leva
        theme={{
          colors: {
            accent1: 'rgba(255, 255, 255, 0.9)',
            accent2: 'rgba(255, 255, 255, 0.7)',
            accent3: 'rgba(255, 255, 255, 0.5)',
            elevation1: 'rgba(255, 255, 255, 0.1)',
            hiContrast: '#ffffff',
          },
          fontFamilies: {
            mono: 'monospace',
            sans: 'system-ui, -apple-system, sans-serif',
          },
        }}
        fill={false}
        flat={false}
        collapsed={false}
        oneLineLabels={true}
      />

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          padding: '8px 12px',
          background: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#34d399',
          fontWeight: 600,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease',
        }}
      >
        FPS: {fps}
      </div>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.5px',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        点击天体查看详情 · 拖拽旋转视角 · 滚轮缩放
      </div>

      <InfoPanel selectedId={selectedId} onClose={handleClosePanel} />

      <style>{`
        #root {
          width: 100%;
          height: 100%;
        }
        
        [data-leva-container] {
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          background: rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08) !important;
          width: 280px !important;
          top: 20px !important;
          right: 20px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        [data-leva-panel] {
          background: transparent !important;
          color: #ffffff !important;
        }
        
        [data-leva-root] [data-leva-control] {
          color: rgba(255, 255, 255, 0.9) !important;
        }
        
        [data-leva-root] [data-leva-label] {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        
        [data-leva-root] input[type="range"] {
          accent-color: #3b82f6 !important;
        }
        
        [data-leva-root] button {
          background: rgba(59, 130, 246, 0.2) !important;
          border: 1px solid rgba(59, 130, 246, 0.4) !important;
          color: #93c5fd !important;
          transition: all 0.2s ease !important;
        }
        
        [data-leva-root] button:hover {
          background: rgba(59, 130, 246, 0.3) !important;
          transform: translateY(-1px) !important;
        }
        
        @media (max-width: 1200px) and (min-width: 768px) {
          [data-leva-container] {
            width: 240px !important;
          }
        }
        
        @media (max-width: 768px) {
          [data-leva-container] {
            width: 100% !important;
            max-width: calc(100% - 40px) !important;
            top: 10px !important;
            right: 20px !important;
            left: 20px !important;
            height: 60px !important;
          }
          
          [data-leva-panel] {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 16px !important;
            overflow-x: auto !important;
            padding: 12px !important;
          }
          
          [data-leva-root] [data-leva-row] {
            flex: 0 0 auto !important;
            min-width: 120px !important;
          }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
