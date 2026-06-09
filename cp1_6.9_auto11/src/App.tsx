import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Hourglass from './Hourglass';
import UIPanel from './UIPanel';

export interface SpeedMarker {
  time: number;
  speed: number;
  color: string;
}

function speedToColor(speed: number): string {
  const t = (speed - 0.5) / (3.0 - 0.5);
  const r = Math.round(30 + t * (255 - 30));
  const g = Math.round(69 + t * (69 - 144));
  const b = Math.round(255 + t * (0 - 255));
  return `rgb(${r},${g},${b})`;
}

function App() {
  const [timeSpeed, setTimeSpeed] = useState(1.0);
  const [resetSignal, setResetSignal] = useState(0);
  const [clickSignal, setClickSignal] = useState(0);
  const [speedMarkers, setSpeedMarkers] = useState<SpeedMarker[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const lastSpeedRef = useRef<number>(1.0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - startTimeRef.current) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastSpeedRef.current !== timeSpeed) {
      const marker: SpeedMarker = {
        time: elapsedTime,
        speed: timeSpeed,
        color: speedToColor(timeSpeed)
      };
      setSpeedMarkers(prev => [...prev, marker]);
      lastSpeedRef.current = timeSpeed;
    }
  }, [timeSpeed, elapsedTime]);

  const handleReset = useCallback(() => {
    setResetSignal(s => s + 1);
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    setSpeedMarkers([]);
    lastSpeedRef.current = timeSpeed;
  }, [timeSpeed]);

  const handleHourglassClick = useCallback(() => {
    setClickSignal(s => s + 1);
    playRiseSound();
  }, []);

  const playRiseSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.6);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 180], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            handleHourglassClick();
          }
        }}
      >
        <color attach="background" args={[0x0B0E2A]} />
        <fog attach="fog" args={[0x0B0E2A, 150, 400]} />
        
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 100, 100]} intensity={1} color={0xFFD700} />
        <pointLight position={[-100, -50, 80]} intensity={0.6} color={0x00CED1} />
        
        <Stars radius={300} depth={60} count={3000} factor={4} saturation={0} fade speed={0.5} />
        
        <OrbitControls
          enablePan={false}
          minDistance={100}
          maxDistance={300}
          enableDamping
          dampingFactor={0.05}
        />
        
        <Hourglass
          timeSpeed={timeSpeed}
          resetSignal={resetSignal}
          clickSignal={clickSignal}
        />
      </Canvas>
      
      <UIPanel
        timeSpeed={timeSpeed}
        onSpeedChange={setTimeSpeed}
        onReset={handleReset}
        elapsedTime={elapsedTime}
        speedMarkers={speedMarkers}
      />
    </div>
  );
}

export default App;
