import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from './AudioEngine';
import { WaveRenderer } from './WaveRenderer';
import { ParticleSystem } from './ParticleSystem';
import { ControlPanel } from './ControlPanel';
import './App.css';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AudioEngine>(new AudioEngine());
  const waveRendererRef = useRef<WaveRenderer | null>(null);
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const animFrameRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [fileName, setFileName] = useState('');

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    if (!waveRendererRef.current) {
      waveRendererRef.current = new WaveRenderer(ctx);
    }
    waveRendererRef.current.resize(rect.width, rect.height);
    particleSystemRef.current.resize(rect.width, rect.height);
  }, []);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  useEffect(() => {
    const engine = engineRef.current;
    engine.setVolume(volume);
  }, [volume]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0a0a0f');
    gradient.addColorStop(0.5, '#0d0d1a');
    gradient.addColorStop(1, '#050510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const engine = engineRef.current;
    const frequencyData = engine.getFrequencyData();
    const timeDomainData = engine.getTimeDomainData();
    const avgVolume = engine.getAverageVolume();

    waveRendererRef.current?.render(frequencyData, timeDomainData);
    particleSystemRef.current.update(avgVolume, frequencyData);
    particleSystemRef.current.render(ctx);

    if (isPlaying !== engine.isPlaying) {
      setIsPlaying(engine.isPlaying);
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animate]);

  const handleFileUpload = useCallback(async (file: File) => {
    const engine = engineRef.current;
    setIsLoading(true);
    setHasAudio(false);
    setFileName(file.name);
    try {
      await engine.loadFile(file);
      setHasAudio(true);
      engine.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('音频解码失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTogglePlay = useCallback(() => {
    const engine = engineRef.current;
    if (engine.isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      engine.play();
      setIsPlaying(true);
    }
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    engineRef.current.setVolume(v);
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current.destroy();
    };
  }, []);

  return (
    <div className="app-container">
      <canvas ref={canvasRef} className="visualizer-canvas" />
      <div className="app-title">幻音涟漪</div>
      <ControlPanel
        onFileUpload={handleFileUpload}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isLoading={isLoading}
        hasAudio={hasAudio}
        fileName={fileName}
      />
    </div>
  );
}
