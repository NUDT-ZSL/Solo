import React, { useRef, useEffect, useState } from 'react';
import SceneCanvas, { SceneCanvasHandle } from '@/ui/SceneCanvas';
import ControlPanel from '@/ui/ControlPanel';
import { AudioAnalyzer } from '@/ui/AudioAnalyzer';
import { WebSocketClient } from '@/network/WebSocketClient';
import { sceneManager } from '@/core/sceneManager';
import { useStore } from '@/store/useStore';
import { Template, FrequencyData, LightSculpture } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const Home: React.FC = () => {
  const sceneCanvasRef = useRef<SceneCanvasHandle>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const {
    nodes,
    connections,
    setFrequencyData,
    setAudioProgress,
    setAudioDuration,
    setIsPlaying,
    addTemplate,
    removeTemplate,
    setNodes,
    setConnections,
    setShiftHeld,
  } = useStore();

  useEffect(() => {
    const analyzer = new AudioAnalyzer();
    audioAnalyzerRef.current = analyzer;

    analyzer.onFrequencyData = (data: FrequencyData) => {
      setFrequencyData(data);
    };

    analyzer.onProgress = (progress: number, duration: number) => {
      setAudioProgress(progress);
      setAudioDuration(duration);
    };

    analyzer.onEnded = () => {
      setIsPlaying(false);
    };

    sceneManager.setAudioAnalyzer({
      getIsPlaying: () => analyzer.getIsPlaying(),
      pause: () => analyzer.pause(),
      play: () => analyzer.play(),
    });

    return () => {
      analyzer.dispose();
      audioAnalyzerRef.current = null;
    };
  }, [setFrequencyData, setAudioProgress, setAudioDuration, setIsPlaying]);

  useEffect(() => {
    const wsClient = new WebSocketClient();
    wsClientRef.current = wsClient;

    wsClient.onConnectionChange = (connected: boolean) => {
      setWsConnected(connected);
    };

    wsClient.onTemplateCreated = (template: Template) => {
      addTemplate(template);
    };

    wsClient.onTemplateDeleted = (id: string) => {
      removeTemplate(id);
    };

    wsClient.onSyncState = (sculpture: LightSculpture) => {
      setNodes(
        sculpture.nodes.map((n) => ({
          ...n,
          velocity: { x: 0, y: 0, z: 0 },
          restPosition: { ...n.position },
        }))
      );
      setConnections(sculpture.connections);
    };

    wsClient.connect();

    return () => {
      wsClient.disconnect();
      wsClientRef.current = null;
    };
  }, [addTemplate, removeTemplate, setNodes, setConnections]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setShiftHeld]);

  useEffect(() => {
    if (!wsClientRef.current?.isConnected()) return;
    if (nodes.length === 0) return;

    const sculpture: LightSculpture = {
      id: uuidv4(),
      name: 'current',
      nodes: nodes.map((n) => ({
        id: n.id,
        position: { ...n.position },
        size: n.size,
        color: n.color,
        emissiveIntensity: n.emissiveIntensity,
        velocity: { ...n.velocity },
        restPosition: { ...n.restPosition },
      })),
      connections: connections.map((c) => ({ ...c })),
      colorSchemeId: 'custom',
    };

    wsClientRef.current.sendSculptureUpdate(sculpture);
  }, [nodes, connections]);

  const handleExportSnapshot = async () => {
    if (sceneCanvasRef.current) {
      await sceneCanvasRef.current.exportSnapshot();
    }
  };

  return (
    <div style={styles.container}>
      <ControlPanel
        onExportSnapshot={handleExportSnapshot}
        audioAnalyzerRef={audioAnalyzerRef}
      />
      <SceneCanvas ref={sceneCanvasRef} />
      {wsConnected && (
        <div style={styles.wsIndicator}>
          <span style={styles.wsDot} />
          <span style={styles.wsText}>同步中</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  wsIndicator: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(20, 20, 30, 0.8)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    zIndex: 200,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '12px',
    color: '#6c63ff',
  },
  wsDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#00ff88',
    animation: 'pulse 2s ease-in-out infinite',
  },
  wsText: {
    color: '#8888aa',
  },
};

export default Home;
