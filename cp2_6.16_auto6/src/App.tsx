import { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
import Scene from './Scene';
import ControlPanel from './ControlPanel';
import { AudioEngine } from './audioEngine';
import { ParticleSystem, ColorTheme, defaultTheme } from './particleSystem';

const appContainerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  background: '#0f0f23',
  overflow: 'hidden',
};

const sceneContainerStyle: CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
};

const panelContainerStyle: CSSProperties = {
  padding: '24px',
  display: 'flex',
  alignItems: 'flex-start',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  position: 'absolute',
  top: '24px',
  left: '32px',
  zIndex: 10,
  color: '#e0e7ff',
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '1px',
  textShadow: '0 2px 12px rgba(139, 92, 246, 0.4)',
  userSelect: 'none',
};

const subtitleStyle: CSSProperties = {
  fontSize: '12px',
  color: '#a5b4fc',
  fontWeight: 400,
  marginTop: '4px',
  letterSpacing: '0.5px',
};

const fpsCounterStyle: CSSProperties = {
  position: 'absolute',
  bottom: '16px',
  left: '24px',
  zIndex: 10,
  color: '#a78bfa',
  fontSize: '12px',
  fontFamily: 'monospace',
  background: 'rgba(30, 27, 75, 0.6)',
  backdropFilter: 'blur(8px)',
  padding: '6px 12px',
  borderRadius: '6px',
  userSelect: 'none',
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [speed, setSpeed] = useState(1);
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(defaultTheme);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const orbitControlsRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fpsFramesRef = useRef(0);
  const fpsLastTimeRef = useRef(performance.now());

  const animateCamera = useCallback((
    targetPosition: { x: number; y: number; z: number },
    duration: number = 500,
  ) => {
    const controls = orbitControlsRef.current;
    if (!controls || !controls.object) return;

    const camera = controls.object;
    const startPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    const startTime = performance.now();

    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);

      camera.position.x = startPosition.x + (targetPosition.x - startPosition.x) * eased;
      camera.position.y = startPosition.y + (targetPosition.y - startPosition.y) * eased;
      camera.position.z = startPosition.z + (targetPosition.z - startPosition.z) * eased;

      if (controls.target) {
        const target = { x: 0, y: 0, z: 0 };
        controls.target.x = target.x;
        controls.target.y = target.y;
        controls.target.z = target.z;
      }

      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, []);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    particleSystemRef.current = new ParticleSystem();
    audioElementRef.current = new Audio();

    const audioEl = audioElementRef.current;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audioEl.addEventListener('play', onPlay);
    audioEl.addEventListener('pause', onPause);
    audioEl.addEventListener('ended', onEnded);

    return () => {
      audioEl.removeEventListener('play', onPlay);
      audioEl.removeEventListener('pause', onPause);
      audioEl.removeEventListener('ended', onEnded);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.cleanup();
      }
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const audioEngine = audioEngineRef.current;
    const particleSystem = particleSystemRef.current;
    if (!audioEngine || !particleSystem) return;

    const tick = () => {
      const frequencyData = audioEngine.getFrequencyData();
      particleSystem.setAudioData(frequencyData);

      fpsFramesRef.current++;
      const now = performance.now();
      if (now - fpsLastTimeRef.current >= 1000) {
        setFps(fpsFramesRef.current);
        fpsFramesRef.current = 0;
        fpsLastTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    const audioEngine = audioEngineRef.current;
    const audioElement = audioElementRef.current;
    if (!audioEngine || !audioElement) return;

    const url = URL.createObjectURL(file);
    setFileName(file.name);

    try {
      await audioEngine.init(audioElement, url);
      await audioEngine.start();
    } catch (e) {
      console.error('Failed to load audio:', e);
    }
  }, []);

  const handleTogglePlay = useCallback(() => {
    const audioEngine = audioEngineRef.current;
    if (!audioEngine || !fileName) return;
    audioEngine.togglePlay();
  }, [fileName]);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    const audioEngine = audioEngineRef.current;
    if (audioEngine) {
      audioEngine.setVolume(value);
    }
  }, []);

  const handleSpeedChange = useCallback((value: number) => {
    setSpeed(value);
    const particleSystem = particleSystemRef.current;
    if (particleSystem) {
      particleSystem.setSpeedMultiplier(value);
    }
  }, []);

  const handleThemeChange = useCallback((theme: ColorTheme) => {
    setCurrentTheme(theme);
    const particleSystem = particleSystemRef.current;
    if (particleSystem) {
      particleSystem.setTheme(theme);
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    animateCamera({ x: 0, y: 0, z: 18 }, 500);
  }, [animateCamera]);

  return (
    <div style={appContainerStyle}>
      <div style={sceneContainerStyle}>
        <div style={titleStyle}>
          ✨ 星尘粒子音乐可视化
          <div style={subtitleStyle}>Stardust Particle Music Visualizer</div>
        </div>
        <Scene
          particleSystemRef={particleSystemRef}
          orbitControlsRef={orbitControlsRef}
        />
        <div style={fpsCounterStyle}>
          FPS: {fps} | 粒子: 4000
        </div>
      </div>
      <div style={panelContainerStyle}>
        <ControlPanel
          isPlaying={isPlaying}
          volume={volume}
          speed={speed}
          currentTheme={currentTheme}
          onFileSelect={handleFileSelect}
          onTogglePlay={handleTogglePlay}
          onVolumeChange={handleVolumeChange}
          onSpeedChange={handleSpeedChange}
          onThemeChange={handleThemeChange}
          onResetCamera={handleResetCamera}
          fileName={fileName}
        />
      </div>
    </div>
  );
}
