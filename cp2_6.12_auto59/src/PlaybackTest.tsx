import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Marker } from './MarkerManager';

interface PulseRing {
  id: number;
  startTime: number;
  color: string;
}

interface PlaybackTestProps {
  markers: Marker[];
  currentTime: number;
  isPlaying: boolean;
  markerColor: string;
  onPlayBeatSound: () => void;
  getCurrentTime: () => number;
}

export const PlaybackTest: React.FC<PlaybackTestProps> = ({
  markers,
  currentTime,
  isPlaying,
  markerColor,
  onPlayBeatSound,
  getCurrentTime,
}) => {
  const [pulseRings, setPulseRings] = useState<PulseRing[]>([]);
  const lastTriggeredRef = useRef<Set<string>>(new Set());
  const ringIdRef = useRef(0);
  const animationRef = useRef<number>(0);

  const triggerPulse = useCallback((color: string) => {
    const id = ringIdRef.current++;
    setPulseRings((prev) => [
      ...prev,
      { id, startTime: performance.now(), color },
    ]);

    onPlayBeatSound();

    setTimeout(() => {
      setPulseRings((prev) => prev.filter((r) => r.id !== id));
    }, 300);
  }, [onPlayBeatSound]);

  useEffect(() => {
    if (!isPlaying || markers.length === 0) {
      return;
    }

    const checkMarkers = () => {
      const time = getCurrentTime();

      for (const marker of markers) {
        const diff = Math.abs(marker.time - time);
        if (diff < 0.03 && !lastTriggeredRef.current.has(marker.id)) {
          lastTriggeredRef.current.add(marker.id);
          triggerPulse(markerColor);
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
  }, [isPlaying, markers, markerColor, triggerPulse, getCurrentTime]);

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
