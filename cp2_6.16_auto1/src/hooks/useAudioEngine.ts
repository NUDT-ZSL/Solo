import { useState, useEffect, useRef, useCallback } from 'react';
import { SoundSource as SoundSourceType, WaveformData, InterferenceData, SAMPLE_RATE, SAMPLE_COUNT } from '@/types';

export function useAudioEngine(sources: SoundSourceType[]) {
  const [waveformData, setWaveformData] = useState<WaveformData[]>(
    sources.map((s) => ({ sourceId: s.id, samples: new Array(SAMPLE_COUNT).fill(0) }))
  );
  const [interferenceData, setInterferenceData] = useState<InterferenceData>({
    combined: new Array(SAMPLE_COUNT).fill(0),
    constructiveRegions: [],
    destructiveRegions: [],
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const analyzersRef = useRef<AnalyserNode[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(performance.now());

  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    sources.forEach((source) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const analyzer = ctx.createAnalyser();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(source.frequency, ctx.currentTime);
      gain.gain.setValueAtTime(source.amplitude, ctx.currentTime);
      analyzer.fftSize = 512;

      osc.connect(gain);
      gain.connect(analyzer);
      analyzer.connect(ctx.destination);

      osc.start();

      oscillatorsRef.current.push(osc);
      gainNodesRef.current.push(gain);
      analyzersRef.current.push(analyzer);
    });
  }, [sources]);

  const updateOscillators = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    sources.forEach((source, i) => {
      if (oscillatorsRef.current[i]) {
        oscillatorsRef.current[i].frequency.setValueAtTime(
          source.frequency,
          ctx.currentTime
        );
      }
      if (gainNodesRef.current[i]) {
        gainNodesRef.current[i].gain.setValueAtTime(
          source.amplitude * 0.1,
          ctx.currentTime
        );
      }
    });
  }, [sources]);

  const generateSampleFromMath = useCallback(
    (source: SoundSourceType, time: number, sampleIndex: number) => {
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

      const amplitudes = sources.map((s) => s.amplitude);
      const maxSingleAmp = Math.max(...amplitudes);
      const minSingleAmp = Math.min(...amplitudes);
      const constructiveThreshold = maxSingleAmp * 1.5;
      const destructiveThreshold = minSingleAmp * 0.5;

      const constructiveRegions: Array<{ start: number; end: number }> = [];
      const destructiveRegions: Array<{ start: number; end: number }> = [];

      let inCon = false, inDes = false, conStart = 0, desStart = 0;

      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const absVal = Math.abs(combined[i]);
        if (absVal > constructiveThreshold) {
          if (!inCon) { conStart = i; inCon = true; }
        } else if (inCon) {
          constructiveRegions.push({ start: conStart, end: i - 1 });
          inCon = false;
        }
        if (absVal < destructiveThreshold) {
          if (!inDes) { desStart = i; inDes = true; }
        } else if (inDes) {
          destructiveRegions.push({ start: desStart, end: i - 1 });
          inDes = false;
        }
      }
      if (inCon) constructiveRegions.push({ start: conStart, end: SAMPLE_COUNT - 1 });
      if (inDes) destructiveRegions.push({ start: desStart, end: SAMPLE_COUNT - 1 });

      return { combined, constructiveRegions, destructiveRegions };
    },
    [sources]
  );

  useEffect(() => {
    startTimeRef.current = performance.now();

    const update = () => {
      const now = performance.now() - startTimeRef.current;
      const allSamples: number[][] = [];

      const newWaveformData: WaveformData[] = sources.map((source) => {
        const samples: number[] = [];
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          samples.push(generateSampleFromMath(source, now, i));
        }
        allSamples.push(samples);
        return { sourceId: source.id, samples };
      });

      setWaveformData(newWaveformData);
      setInterferenceData(computeInterference(allSamples));

      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sources, generateSampleFromMath, computeInterference]);

  useEffect(() => {
    updateOscillators();
  }, [updateOscillators]);

  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach((osc) => {
        try { osc.stop(); } catch (_) { /* ignore */ }
      });
      oscillatorsRef.current = [];
      gainNodesRef.current = [];
      analyzersRef.current = [];
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const startAudio = useCallback(() => {
    initAudioContext();
  }, [initAudioContext]);

  return { waveformData, interferenceData, startAudio };
}
