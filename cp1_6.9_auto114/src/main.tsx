import React from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Canvas
      camera={{ position: [0, 10, 20], fov: 60, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: '#0d0d1a' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#0d0d1a');
      }}
    >
      <App />
      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 + 0.1}
        minPolarAngle={0.1}
      />
    </Canvas>
  </React.StrictMode>
);
