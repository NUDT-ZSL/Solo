import React, { useEffect, useRef, useState } from 'react';
import { UIPanel } from './UIPanel';
import { SceneManager } from './SceneManager';
import type { OrbitEngine } from './OrbitEngine';
import type { PlanetData } from './types';
import './App.css';

interface AppProps {
  orbitEngine: OrbitEngine;
  planets: PlanetData[];
}

export const App: React.FC<AppProps> = ({ orbitEngine, planets }) => {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);

  useEffect(() => {
    if (sceneContainerRef.current && !sceneManager) {
      const manager = new SceneManager(sceneContainerRef.current, planets);
      setSceneManager(manager);
      orbitEngine.start();
    }

    return () => {
      orbitEngine.stop();
      if (sceneManager) {
        sceneManager.dispose();
      }
    };
  }, [orbitEngine, planets, sceneManager]);

  return (
    <div className="app-container">
      <div className="scene-container" ref={sceneContainerRef}></div>
      <div className="panel-container">
        {sceneManager && (
          <UIPanel orbitEngine={orbitEngine} sceneManager={sceneManager} />
        )}
      </div>
    </div>
  );
};
