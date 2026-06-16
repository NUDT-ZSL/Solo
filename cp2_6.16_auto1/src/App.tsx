import { useState, useCallback, useEffect } from 'react';
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
  const [audioStarted, setAudioStarted] = useState(false);

  const handlePositionChange = useCallback(
    (id: number, pos: { x: number; y: number; z: number }) => {
      if (!audioStarted) {
        startAudio();
        setAudioStarted(true);
      }
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, position: pos } : s))
      );
    },
    [audioStarted, startAudio]
  );

  const handleSourceUpdate = useCallback(
    (id: number, updates: Partial<SoundSource>) => {
      if (!audioStarted) {
        startAudio();
        setAudioStarted(true);
      }
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    [audioStarted, startAudio]
  );

  const handleReset = useCallback(() => {
    setSources(createInitialSources());
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      if (!audioStarted) {
        startAudio();
        setAudioStarted(true);
      }
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [audioStarted, startAudio]);

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
