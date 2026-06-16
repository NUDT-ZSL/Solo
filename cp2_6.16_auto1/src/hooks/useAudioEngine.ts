import { useState, useEffect, useRef, useCallback } from 'react';
import { SoundSource, WaveformData, InterferenceData, SAMPLE_RATE, SAMPLE_COUNT } from '@/types';

export function useAudioEngine(sources: SoundSource[]) {
  const [waveformData, setWaveformData] = useState<WaveformData[]>(
    sources.map((s) => ({ sourceId: s.id, samples: new Array(SAMPLE_COUNT).fill(0) }))
  );
  const [interferenceData, setInterferenceData] = useState<InterferenceData>({
    combined: new Array(SAMPLE_COUNT).fill(0),
    constructiveRegions: [],
    destructiveRegions: [],
  });
  const startTimeRef = useRef(performance.now());
  const animationRef = useRef<number>(0);

  const generateSample = useCallback(
    (source: SoundSource, time: number, sampleIndex: number) => {
      const t = time / 1000 + sampleIndex / SAMPLE_RATE;
      const phase = 2 * Math.PI * source.frequency * t;
      return source.amplitude * Math.sin(phase);
    },
    []
  );

  const computeInterference = useCallback(
    (allSamples: number[][]) => {
      const combined: number[] = new Array(SAMPLE_COUNT).fill(0);
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        for (let s = 0; s < allSamples.length; s++) {
          combined[i] += allSamples[s][i];
        }
      }

      const maxAmplitudes = sources.map((s) => s.amplitude);
      const maxSingleAmp = Math.max(...maxAmplitudes);
      const minSingleAmp = Math.min(...maxAmplitudes);
      const constructiveThreshold = maxSingleAmp * 1.5;
      const destructiveThreshold = minSingleAmp * 0.5;

      const constructiveRegions: Array<{ start: number; end: number }> = [];
      const destructiveRegions: Array<{ start: number; end: number }> = [];

      let inConstructive = false;
      let inDestructive = false;
      let conStart = 0;
      let desStart = 0;

      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const absVal = Math.abs(combined[i]);

        if (absVal > constructiveThreshold) {
          if (!inConstructive) {
            conStart = i;
            inConstructive = true;
          }
        } else if (inConstructive) {
          constructiveRegions.push({ start: conStart, end: i - 1 });
          inConstructive = false;
        }

        if (absVal < destructiveThreshold) {
          if (!inDestructive) {
            desStart = i;
            inDestructive = true;
          }
        } else if (inDestructive) {
          destructiveRegions.push({ start: desStart, end: i - 1 });
          inDestructive = false;
        }
      }

      if (inConstructive) constructiveRegions.push({ start: conStart, end: SAMPLE_COUNT - 1 });
      if (inDestructive) destructiveRegions.push({ start: desStart, end: SAMPLE_COUNT - 1 });

      return { combined, constructiveRegions, destructiveRegions };
    },
    [sources]
  );

  useEffect(() => {
    const update = () => {
      const now = performance.now() - startTimeRef.current;
      const allSamples: number[][] = [];
      const newWaveformData: WaveformData[] = sources.map((source) => {
        const samples: number[] = [];
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          samples.push(generateSample(source, now, i));
        }
        allSamples.push(samples);
        return { sourceId: source.id, samples };
      });

      setWaveformData(newWaveformData);
      setInterferenceData(computeInterference(allSamples));
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sources, generateSample, computeInterference]);

  return { waveformData, interferenceData };
}
