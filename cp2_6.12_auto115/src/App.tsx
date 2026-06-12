import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import ControlPanel from './visualization/controlPanel';
import { sceneManager } from './visualization/sceneManager';
import { fetchStreetList, fetchStreetDetail, fetchStreetDiff } from './experiment/dataModule';
import type { StreetListItem, StreetData, StreetDiff, SplitMode } from './experiment/types';

const SceneWrapper: React.FC = () => {
  const { scene, camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const parent = canvas.parentElement;
    if (parent) {
      sceneManager.init(canvas, parent.clientWidth, parent.clientHeight);
      sceneManager.setOnFrameCallback(() => {
        camera.position.copy(sceneManager.getCamera().position);
        camera.rotation.copy(sceneManager.getCamera().rotation);
      });
    }
    return () => {
      sceneManager.dispose();
    };
  }, [gl, camera]);

  useEffect(() => {
    scene.add(sceneManager.getScene());
    return () => {
      scene.remove(sceneManager.getScene());
    };
  }, [scene]);

  useFrame(() => {});

  return <OrbitControls enableDamping dampingFactor={0.05} />;
};

const App: React.FC = () => {
  const [streetList, setStreetList] = useState<StreetListItem[]>([]);
  const [selectedStreetId, setSelectedStreetId] = useState<string>('hutong');
  const [selectedStreetName, setSelectedStreetName] = useState<string>('胡同');
  const [streetData, setStreetData] = useState<StreetData | null>(null);
  const [streetDiff, setStreetDiff] = useState<StreetDiff | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingDivider, setIsDraggingDivider] = useState<boolean>(false);
  const [dividerPosition, setDividerPosition] = useState<number>(50);
  const [dividerHover, setDividerHover] = useState<boolean>(false);

  const [sceneState, setSceneState] = useState({
    animationProgress: 0,
    buildingColor: '#8B4513',
    greeneryDensity: 35,
    lightAngle: 0,
    splitMode: 'horizontal' as SplitMode,
    splitPosition: 50,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStreetList = async () => {
      try {
        const list = await fetchStreetList();
        setStreetList(list);
        if (list.length > 0 && !selectedStreetId) {
          setSelectedStreetId(list[0].id);
          setSelectedStreetName(list[0].name);
        }
      } catch (err) {
        setError('加载街区列表失败');
        console.error(err);
      }
    };
    loadStreetList();
  }, []);

  useEffect(() => {
    const loadStreetData = async () => {
      if (!selectedStreetId) return;
      setLoading(true);
      setError(null);
      try {
        const [data, diff] = await Promise.all([
          fetchStreetDetail(selectedStreetId),
          fetchStreetDiff(selectedStreetId),
        ]);

        if (data && diff) {
          setStreetData(data);
          setStreetDiff(diff);
          setSelectedStreetName(data.name);
          sceneManager.loadStreetData(data, diff);
          setSceneState(prev => ({
            ...prev,
            buildingColor: data.buildings[0]?.color || prev.buildingColor,
            greeneryDensity: data.greeneryDensity,
            lightAngle: data.lightAngle,
          }));
        } else {
          setError('加载街区数据失败');
        }
      } catch (err) {
        setError('加载街区数据失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStreetData();
  }, [selectedStreetId]);

  const handleStreetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStreetId(e.target.value);
  }, []);

  const handleAnimationProgressChange = useCallback((value: number) => {
    sceneManager.setAnimationProgress(value);
    setSceneState(prev => ({ ...prev, animationProgress: value }));
  }, []);

  const handleBuildingColorChange = useCallback((color: string) => {
    sceneManager.setBuildingColor(color);
    setSceneState(prev => ({ ...prev, buildingColor: color }));
  }, []);

  const handleGreeneryDensityChange = useCallback((value: number) => {
    sceneManager.setGreeneryDensity(value);
    setSceneState(prev => ({ ...prev, greeneryDensity: value }));
  }, []);

  const handleLightAngleChange = useCallback((value: number) => {
    sceneManager.setLightAngle(value);
    setSceneState(prev => ({ ...prev, lightAngle: value }));
  }, []);

  const handleSplitModeChange = useCallback((mode: SplitMode) => {
    sceneManager.setSplitMode(mode);
    setSceneState(prev => ({ ...prev, splitMode: mode }));
  }, []);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingDivider || !canvasContainerRef.current) return;

      const rect = canvasContainerRef.current.getBoundingClientRect();
      let newPosition: number;

      if (sceneState.splitMode === 'horizontal') {
        newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      } else if (sceneState.splitMode === 'vertical') {
        newPosition = ((e.clientY - rect.top) / rect.height) * 100;
      } else {
        return;
      }

      newPosition = Math.max(10, Math.min(90, newPosition));
      setDividerPosition(newPosition);
      sceneManager.setSplitPosition(newPosition);
    },
    [isDraggingDivider, sceneState.splitMode]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingDivider(false);
  }, []);

  useEffect(() => {
    if (isDraggingDivider) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    setDividerPosition(50);
    sceneManager.setSplitPosition(50);
  }, [sceneState.splitMode]);

  const getDividerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 10,
      backgroundColor: dividerHover || isDraggingDivider ? '#3B82F6' : 'white',
      cursor: isDraggingDivider ? 'grabbing' : 'grab',
      transition: 'background-color 0.2s ease, width 0.2s ease, height 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (sceneState.splitMode === 'horizontal') {
      return {
        ...baseStyle,
        top: 0,
        bottom: 0,
        left: `${dividerPosition}%`,
        width: dividerHover || isDraggingDivider ? '4px' : '2px',
        transform: 'translateX(-50%)',
      };
    } else if (sceneState.splitMode === 'vertical') {
      return {
        ...baseStyle,
        left: 0,
        right: 0,
        top: `${dividerPosition}%`,
        height: dividerHover || isDraggingDivider ? '4px' : '2px',
        transform: 'translateY(-50%)',
      };
    }

    return { ...baseStyle, display: 'none' };
  };

  const renderDividerHandles = () => {
    if (sceneState.splitMode === 'overlay') return null;

    const handlePositions =
      sceneState.splitMode === 'horizontal'
        ? [
            { top: '5%', left: `${dividerPosition}%` },
            { top: '95%', left: `${dividerPosition}%` },
          ]
        : [
            { top: `${dividerPosition}%`, left: '5%' },
            { top: `${dividerPosition}%`, left: '95%' },
          ];

    return handlePositions.map((pos, idx) => (
      <div
        key={idx}
        style={{
          position: 'absolute',
          width: '24px',
          height: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '4px',
          transform: 'translate(-50%, -50%)',
          zIndex: 11,
          pointerEvents: 'none',
        }}
      />
    ));
  };

  if (error) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ef4444',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '16px' }}>错误</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 40px',
          backgroundColor: 'rgba(30, 30, 30, 0.7)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        <h1
          style={{
            margin: 0,
            color: 'white',
            fontSize: '20px',
            fontWeight: 600,
          }}
        >
          {selectedStreetName} - 改造案例
        </h1>
        <select
          value={selectedStreetId}
          onChange={handleStreetChange}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {streetList.map((street) => (
            <option key={street.id} value={street.id} style={{ color: '#1a1a1a' }}>
              {street.name}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={canvasContainerRef}
        style={{
          position: 'absolute',
          top: '70px',
          left: '7.5%',
          right: '7.5%',
          bottom: '260px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <Canvas
          shadows
          camera={{ position: [0, 25, 40], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
          style={{ width: '100%', height: '100%' }}
        >
          <SceneWrapper />
        </Canvas>

        <motion.div
          style={getDividerStyle()}
          onMouseDown={handleDividerMouseDown}
          onMouseEnter={() => setDividerHover(true)}
          onMouseLeave={() => setDividerHover(false)}
          whileHover={{ scale: 1.05 }}
        />

        {renderDividerHandles()}

        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            padding: '6px 12px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            fontSize: '12px',
            borderRadius: '6px',
            zIndex: 20,
          }}
        >
          改造后
        </div>
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '6px 12px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            fontSize: '12px',
            borderRadius: '6px',
            zIndex: 20,
          }}
        >
          改造前
        </div>

        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <div style={{ color: 'white', fontSize: '18px' }}>加载中...</div>
          </div>
        )}
      </div>

      {streetData && streetDiff && (
        <ControlPanel
          currentStreetId={selectedStreetId}
          animationProgress={sceneState.animationProgress}
          buildingColor={sceneState.buildingColor}
          greeneryDensity={sceneState.greeneryDensity}
          lightAngle={sceneState.lightAngle}
          splitMode={sceneState.splitMode}
          onAnimationProgressChange={handleAnimationProgressChange}
          onBuildingColorChange={handleBuildingColorChange}
          onGreeneryDensityChange={handleGreeneryDensityChange}
          onLightAngleChange={handleLightAngleChange}
          onSplitModeChange={handleSplitModeChange}
        />
      )}
    </div>
  );
};

export default App;
