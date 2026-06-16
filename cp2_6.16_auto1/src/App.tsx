import { useState, useCallback } from 'react';
import { ScenePanel } from '@/components/ScenePanel';
import { WaveformPanel } from '@/components/WaveformPanel';
import { InterferencePanel } from '@/components/InterferencePanel';
import { ControlPanel } from '@/components/ControlPanel';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import {
  SoundSource,
  DEFAULT_COLORS,
  DEFAULT_POSITIONS,
  DEFAULT_FREQUENCY,
  DEFAULT_AMPLITUDE,
} from '@/types';

function createInitialSources(): SoundSource[] {
  return DEFAULT_POSITIONS.map((pos, i) => ({
    id: i,
    position: { ...pos },
    frequency: DEFAULT_FREQUENCY,
    amplitude: DEFAULT_AMPLITUDE,
    color: DEFAULT_COLORS[i],
  }));
}

export default function App() {
  const [sources, setSources] = useState<SoundSource[]>(createInitialSources);
  const { waveformData, interferenceData, startAudio } = useAudioEngine(sources);

  const handlePositionChange = useCallback(
    (id: number, pos: { x: number; y: number; z: number }) => {
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, position: pos } : s))
      );
    },
    []
  );

  const handleSourceUpdate = useCallback(
    (id: number, updates: Partial<SoundSource>) => {
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const handleReset = useCallback(() => {
    setSources(createInitialSources());
  }, []);

  return (
    <div className="app-container">
      <div className="scene-section">
        <ScenePanel sources={sources} onPositionChange={handlePositionChange} />
      </div>

      <div className="waveform-section">
        <WaveformPanel waveformData={waveformData} sources={sources} />
      </div>

      <div className="interference-section">
        <InterferencePanel interferenceData={interferenceData} />
      </div>

      <div className="control-panel-wrapper">
        <ControlPanel
          sources={sources}
          onSourceUpdate={handleSourceUpdate}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}
