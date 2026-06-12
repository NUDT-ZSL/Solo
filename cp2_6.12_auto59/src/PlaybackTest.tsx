import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from './AudioEngine';
import { MarkerManager, Marker } from './MarkerManager';

interface PulseRing {
  id: number;
  startTime: number;
  color: string;
}

interface PlaybackTestProps {
  audioEngine: AudioEngine | null;
  markerManager: MarkerManager | null;
  currentTime: number;
  isPlaying: boolean;
}

export const PlaybackTest: React.FC<PlaybackTestProps> = ({
  audioEngine,
  markerManager,
  currentTime,
  isPlaying,
}) => {
  const [pulseRings, setPulseRings] = useState<PulseRing[]>([]);
  const lastTriggeredRef = useRef<Set<string>>(new Set());
  const ringIdRef = useRef(0);
  const animationRef = useRef<number>(0);

  const triggerPulse = useCallback((marker: Marker) => {
    const id = ringIdRef.current++;
    setPulseRings((prev) => [
      ...prev,
      { id, startTime: performance.now(), color: '#ffa500' },
    ]);

    if (audioEngine) {
      audioEngine.playBeatSound(440, 0.1, 0.3);
    }

    setTimeout(() => {
      setPulseRings((prev) => prev.filter((r) => r.id !== id));
    }, 300);
  }, [audioEngine]);

  useEffect(() => {
    if (!isPlaying || !markerManager || !audioEngine) {
      return;
    }

    const markers = markerManager.getMarkers();
    if (markers.length === 0) return;

    const checkMarkers = () => {
      const time = audioEngine.getCurrentTime();

      for (const marker of markers) {
        const diff = Math.abs(marker.time - time);
        if (diff < 0.03 && !lastTriggeredRef.current.has(marker.id)) {
          lastTriggeredRef.current.add(marker.id);
          triggerPulse(marker);
        }
      }

      animationRef.current = requestAnimationFrame(checkMarkers);
    };

    animationRef.current = requestAnimationFrame(checkMarkers);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, markerManager, audioEngine, triggerPulse]);

  useEffect(() => {
    if (!isPlaying) {
      lastTriggeredRef.current.clear();
    }
  }, [isPlaying]);

  const renderPulseRings = () => {
    return pulseRings.map((ring) => {
      const elapsed = performance.now() - ring.startTime;
      const progress = Math.min(elapsed / 300, 1);
      const radius = 10 + progress * 50;
      const opacity = 0.8 * (1 - progress);

      return (
        <div
          key={ring.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: radius * 2,
            height: radius * 2,
            borderRadius: '50%',
            border: `3px solid ${ring.color}`,
            opacity,
            pointerEvents: 'none',
            boxShadow: `0 0 20px ${ring.color}`,
          }}
        />
      );
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {renderPulseRings()}
    </div>
  );
};

export default PlaybackTest;
