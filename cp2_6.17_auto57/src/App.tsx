import React, { useState, useCallback, useRef, useEffect } from 'react';
import TerrainCanvas from './components/TerrainCanvas';
import Toolbar from './components/Toolbar';
import { useGestureDetection } from './hooks/useGestureDetection';
import { useTerrainState } from './hooks/useTerrainState';

type EditMode = 'raise' | 'lower';

const App: React.FC = () => {
  const [editMode, setEditMode] = useState<EditMode>('raise');
  const [brushRadius, setBrushRadius] = useState(40);
  const [smoothIterations, setSmoothIterations] = useState(2);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'birdseye'>('orbit');
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    heights,
    modifyHeight,
    smoothTerrain,
    undoLast,
    resetTerrain,
    exportHeightMap,
  } = useTerrainState(128, 128);

  const { gestureType, palmCenter, isDetecting, startDetection, stopDetection } =
    useGestureDetection(videoRef);

  const handleToggleEditMode = useCallback(() => {
    setEditMode((prev) => (prev === 'raise' ? 'lower' : 'raise'));
  }, []);

  const handleResetTerrain = useCallback(() => {
    resetTerrain();
  }, [resetTerrain]);

  const handleExportPNG = useCallback(() => {
    exportHeightMap();
  }, [exportHeightMap]);

  const handleUndo = useCallback(() => {
    undoLast();
  }, [undoLast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setCameraMode('birdseye');
        setTimeout(() => setCameraMode('orbit'), 1500);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (gestureType === 'pinch' && palmCenter) {
      const delta = editMode === 'raise' ? 0.05 : -0.05;
      modifyHeight(palmCenter[0], palmCenter[1], brushRadius / 100, delta);
      for (let i = 0; i < smoothIterations; i++) {
        smoothTerrain();
      }
    }
  }, [gestureType, palmCenter, editMode, brushRadius, smoothIterations, modifyHeight, smoothTerrain]);

  useEffect(() => {
    if (gestureType === 'fist') {
      undoLast();
    }
  }, [gestureType, undoLast]);

  useEffect(() => {
    if (gestureType === 'open') {
      setCameraMode((prev) => (prev === 'orbit' ? 'birdseye' : 'orbit'));
    }
  }, [gestureType]);

  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1200);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        position: 'relative',
        background: 'linear-gradient(135deg, #1a2332 0%, #0d1b2a 100%)',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 200,
          height: 150,
          borderRadius: 8,
          border: '1px solid #37474f',
          zIndex: 30,
          transform: 'scaleX(-1)',
          objectFit: 'cover',
          opacity: isDetecting ? 1 : 0.5,
        }}
        autoPlay
        playsInline
        muted
      />
      {!isDetecting && (
        <button
          onClick={startDetection}
          style={{
            position: 'absolute',
            top: 170,
            right: 12,
            zIndex: 30,
            padding: '6px 12px',
            background: '#263238',
            color: '#cfd8dc',
            border: '1px solid #37474f',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          开启摄像头
        </button>
      )}
      {isDetecting && (
        <button
          onClick={stopDetection}
          style={{
            position: 'absolute',
            top: 170,
            right: 12,
            zIndex: 30,
            padding: '6px 12px',
            background: '#37474f',
            color: '#e57373',
            border: '1px solid #e57373',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          关闭摄像头
        </button>
      )}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 220,
          zIndex: 30,
          padding: '4px 10px',
          background: 'rgba(30,42,56,0.85)',
          borderRadius: 6,
          border: '1px solid #37474f',
          color: '#b0bec5',
          fontSize: 13,
        }}
      >
        手势: {gestureType === 'none' ? '无' : gestureType === 'pinch' ? '捏合' : gestureType === 'spread' ? '展开' : gestureType === 'point' ? '指向' : gestureType === 'open' ? '张开' : '握拳'}
      </div>
      <Toolbar
        editMode={editMode}
        brushRadius={brushRadius}
        smoothIterations={smoothIterations}
        onToggleEditMode={handleToggleEditMode}
        onBrushRadiusChange={setBrushRadius}
        onSmoothIterationsChange={setSmoothIterations}
        onUndo={handleUndo}
        onReset={handleResetTerrain}
        onExport={handleExportPNG}
        isTablet={isTablet}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <TerrainCanvas
          heights={heights}
          brushRadius={brushRadius}
          cameraMode={cameraMode}
          editMode={editMode}
          onModifyHeight={(x, y, delta) => {
            modifyHeight(x, y, brushRadius / 100, delta);
            for (let i = 0; i < smoothIterations; i++) smoothTerrain();
          }}
        />
      </div>
    </div>
  );
};

export default App;
